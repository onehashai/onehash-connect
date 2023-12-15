import $ from "jquery";
import assert from "minimalistic-assert";

import render_leave_user_group_modal from "../templates/confirm_dialog/confirm_unsubscribe_private_stream.hbs";
import render_user_group_member_list_entry from "../templates/stream_settings/stream_member_list_entry.hbs";
import render_user_group_membership_request_result from "../templates/user_group_settings/user_group_membership_request_result.hbs";

import * as add_subscribers_pill from "./add_subscribers_pill";
import * as blueslip from "./blueslip";
import * as channel from "./channel";
import * as confirm_dialog from "./confirm_dialog";
import {$t, $t_html} from "./i18n";
import * as ListWidget from "./list_widget";
import {page_params} from "./page_params";
import * as people from "./people";
import * as scroll_util from "./scroll_util";
import * as settings_data from "./settings_data";
import * as user_groups from "./user_groups";
import * as user_sort from "./user_sort";

export let pill_widget;
let current_group_id;
let member_list_widget;

function get_potential_members() {
    const group = user_groups.get_user_group_from_id(current_group_id);
    function is_potential_member(person) {
        // user  verbose style filter to have room
        // to add more potential checks easily.
        if (group.members.has(person.user_id)) {
            return false;
        }
        return true;
    }

    return people.filter_all_users(is_potential_member);
}

function get_user_group_members(group) {
    const member_ids = [...group.members];
    const active_member_ids = member_ids.filter((user_id) => people.is_person_active(user_id));
    return people.get_users_from_ids(active_member_ids);
}

export function update_member_list_widget(group) {
    assert(group.id === current_group_id, "Unexpected group rerendering members list");
    const users = get_user_group_members(group);
    people.sort_but_pin_current_user_on_top(users);
    member_list_widget.replace_list_data(users);
}

function format_member_list_elem(person) {
    return render_user_group_member_list_entry({
        name: person.full_name,
        user_id: person.user_id,
        is_current_user: person.user_id === page_params.user_id,
        email: person.delivery_email,
        can_remove_subscribers: settings_data.can_edit_user_group(current_group_id),
        for_user_group_members: true,
    });
}

function make_list_widget({$parent_container, name, users}) {
    people.sort_but_pin_current_user_on_top(users);

    const $list_container = $parent_container.find(".member_table");
    $list_container.empty();

    const $simplebar_container = $parent_container.find(".member_list_container");

    return ListWidget.create($list_container, users, {
        name,
        get_item: ListWidget.default_get_item,
        $parent_container,
        sort_fields: {
            email: user_sort.sort_email,
            id: user_sort.sort_user_id,
            ...ListWidget.generic_sort_functions("alphabetic", ["full_name"]),
        },
        modifier_html(item) {
            return format_member_list_elem(item);
        },
        filter: {
            $element: $parent_container.find(".search"),
            predicate(person, value) {
                const matcher = people.build_person_matcher(value);
                const match = matcher(person);

                return match;
            },
        },
        $simplebar_container,
    });
}

export function enable_member_management({group, $parent_container}) {
    const group_id = group.id;

    const $pill_container = $parent_container.find(".pill-container");

    // current_group_id and pill_widget are module-level variables
    current_group_id = group_id;

    pill_widget = add_subscribers_pill.create({
        $pill_container,
        get_potential_subscribers: get_potential_members,
    });

    member_list_widget = make_list_widget({
        $parent_container,
        name: "user_group_members",
        users: get_user_group_members(group),
    });
}

function show_user_group_membership_request_result({
    message,
    add_class,
    remove_class,
    already_added_users,
    ignored_deactivated_users,
}) {
    const $user_group_subscription_req_result_elem = $(
        ".user_group_subscription_request_result",
    ).expectOne();
    const html = render_user_group_membership_request_result({
        message,
        already_added_users,
        ignored_deactivated_users,
    });
    scroll_util.get_content_element($user_group_subscription_req_result_elem).html(html);
    if (add_class) {
        $user_group_subscription_req_result_elem.addClass(add_class);
    }
    if (remove_class) {
        $user_group_subscription_req_result_elem.removeClass(remove_class);
    }
}

export function edit_user_group_membership({group, added = [], removed = [], success, error}) {
    channel.post({
        url: "/json/user_groups/" + group.id + "/members",
        data: {
            add: JSON.stringify(added),
            delete: JSON.stringify(removed),
        },
        success,
        error,
    });
}

function add_new_members({pill_user_ids}) {
    const group = user_groups.get_user_group_from_id(current_group_id);
    if (!group) {
        return;
    }

    const deactivated_users = new Set();
    const already_added_users = new Set();

    const active_user_ids = pill_user_ids.filter((user_id) => {
        if (!people.is_person_active(user_id)) {
            deactivated_users.add(user_id);
            return false;
        }
        if (user_groups.is_user_in_group(group.id, user_id)) {
            // we filter out already added users before sending
            // add member request as the endpoint is not so robust and
            // fails complete request if any already added member
            // is present in the request.
            already_added_users.add(user_id);
            return false;
        }
        return true;
    });

    const user_id_set = new Set(active_user_ids);

    if (
        user_id_set.has(page_params.user_id) &&
        user_groups.is_user_in_group(group.id, page_params.user_id)
    ) {
        // We don't want to send a request to add ourselves if we
        // are already added to this group. This case occurs
        // when creating user pills from a stream or user group.
        user_id_set.delete(page_params.user_id);
    }

    let ignored_deactivated_users;
    let ignored_already_added_users;
    if (deactivated_users.size > 0) {
        ignored_deactivated_users = [...deactivated_users];
        ignored_deactivated_users = ignored_deactivated_users.map((user_id) =>
            people.get_by_user_id(user_id),
        );
    }
    if (already_added_users.size > 0) {
        ignored_already_added_users = [...already_added_users];
        ignored_already_added_users = ignored_already_added_users.map((user_id) =>
            people.get_by_user_id(user_id),
        );
    }

    if (user_id_set.size === 0) {
        show_user_group_membership_request_result({
            message: $t({defaultMessage: "No users to add."}),
            add_class: "text-error",
            remove_class: "text-success",
            already_added_users: ignored_already_added_users,
            ignored_deactivated_users,
        });
        return;
    }
    const user_ids = [...user_id_set];

    function invite_success() {
        pill_widget.clear();
        show_user_group_membership_request_result({
            message: $t({defaultMessage: "Added successfully."}),
            add_class: "text-success",
            remove_class: "text-error",
            already_added_users: ignored_already_added_users,
            ignored_deactivated_users,
        });
    }

    function invite_failure(xhr) {
        let message = "Failed to add user!";
        if (xhr.responseJSON?.msg) {
            message = xhr.responseJSON.msg;
        }
        show_user_group_membership_request_result({
            message,
            add_class: "text-error",
            remove_class: "text-success",
        });
    }

    edit_user_group_membership({
        group,
        added: user_ids,
        success: invite_success,
        error: invite_failure,
    });
}

function remove_member({group_id, target_user_id, $list_entry}) {
    const group = user_groups.get_user_group_from_id(current_group_id);
    if (!group) {
        return;
    }

    function removal_success() {
        if (group_id !== current_group_id) {
            blueslip.info("Response for subscription removal came too late.");
            return;
        }

        $list_entry.remove();
        const message = $t({defaultMessage: "Removed successfully."});
        show_user_group_membership_request_result({
            message,
            add_class: "text-success",
            remove_class: "text-remove",
        });
    }

    function removal_failure() {
        show_user_group_membership_request_result({
            message: $t({defaultMessage: "Error removing user from this group."}),
            add_class: "text-error",
            remove_class: "text-success",
        });
    }

    function do_remove_user_from_group() {
        edit_user_group_membership({
            group,
            removed: [target_user_id],
            success: removal_success,
            error: removal_failure,
        });
    }

    if (people.is_my_user_id(target_user_id) && !page_params.is_admin) {
        const html_body = render_leave_user_group_modal({
            message: $t({
                defaultMessage: "Once you leave this group, you will not be able to rejoin.",
            }),
        });

        confirm_dialog.launch({
            html_heading: $t_html({defaultMessage: "Leave {group_name}"}, {group_name: group.name}),
            html_body,
            on_click: do_remove_user_from_group,
        });
        return;
    }

    do_remove_user_from_group();
}

export function initialize() {
    add_subscribers_pill.set_up_handlers({
        get_pill_widget: () => pill_widget,
        $parent_container: $("#groups_overlay_container"),
        pill_selector: ".edit_members_for_user_group .pill-container",
        button_selector: ".edit_members_for_user_group .add-member-button",
        action: add_new_members,
    });

    $("#groups_overlay_container").on(
        "submit",
        ".edit_members_for_user_group .subscriber_list_remove form",
        (e) => {
            e.preventDefault();

            const $list_entry = $(e.target).closest("tr");
            const target_user_id = Number.parseInt($list_entry.attr("data-subscriber-id"), 10);
            const group_id = current_group_id;

            remove_member({group_id, target_user_id, $list_entry});
        },
    );
}
