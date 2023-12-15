import _ from "lodash";
import assert from "minimalistic-assert";

import render_empty_list_widget_for_list from "../templates/empty_list_widget_for_list.hbs";

import * as activity from "./activity";
import * as blueslip from "./blueslip";
import * as buddy_data from "./buddy_data";
import {buddy_list} from "./buddy_list";
import * as keydown_util from "./keydown_util";
import {ListCursor} from "./list_cursor";
import {page_params} from "./page_params";
import * as people from "./people";
import * as pm_list from "./pm_list";
import * as popovers from "./popovers";
import * as presence from "./presence";
import * as sidebar_ui from "./sidebar_ui";
import * as ui_util from "./ui_util";
import {UserSearch} from "./user_search";
import * as util from "./util";

export let user_cursor;
export let user_filter;

// Function initialized from `ui_init` to avoid importing narrow.js and causing circular imports.
let narrow_by_email;

function get_pm_list_item(user_id) {
    return buddy_list.find_li({
        key: user_id,
    });
}

function set_pm_count(user_ids_string, count) {
    const $pm_li = get_pm_list_item(user_ids_string);
    ui_util.update_unread_count_in_dom($pm_li, count);
}

export function update_dom_with_unread_counts(counts) {
    // counts is just a data object that gets calculated elsewhere
    // Our job is to update some DOM elements.

    for (const [user_ids_string, count] of counts.pm_count) {
        // TODO: just use user_ids_string in our markup
        const is_pm = !user_ids_string.includes(",");
        if (is_pm) {
            set_pm_count(user_ids_string, count);
        }
    }
}

export function clear_for_testing() {
    user_cursor = undefined;
    user_filter = undefined;
}

export function redraw_user(user_id) {
    if (page_params.realm_presence_disabled) {
        return;
    }

    const filter_text = get_filter_text();

    if (!buddy_data.matches_filter(filter_text, user_id)) {
        return;
    }

    const info = buddy_data.get_item(user_id);

    buddy_list.insert_or_move({
        user_id,
        item: info,
    });
}

export function searching() {
    return user_filter && user_filter.searching();
}

export function render_empty_user_list_message_if_needed($container) {
    const empty_list_message = $container.data("search-results-empty");

    if (!empty_list_message || $container.children().length) {
        return;
    }

    const empty_list_widget = render_empty_list_widget_for_list({empty_list_message});
    $container.append(empty_list_widget);
}

export function build_user_sidebar() {
    if (page_params.realm_presence_disabled) {
        return undefined;
    }

    const filter_text = get_filter_text();

    const all_user_ids = buddy_data.get_filtered_and_sorted_user_ids(filter_text);

    buddy_list.populate({all_user_ids});

    render_empty_user_list_message_if_needed(buddy_list.$container);

    return all_user_ids; // for testing
}

function do_update_users_for_search() {
    // Hide all the popovers but not userlist sidebar
    // when the user is searching.
    popovers.hide_all();
    build_user_sidebar();
    user_cursor.reset();
}

const update_users_for_search = _.throttle(do_update_users_for_search, 50);

export function initialize(opts) {
    narrow_by_email = opts.narrow_by_email;

    set_cursor_and_filter();

    build_user_sidebar();

    buddy_list.start_scroll_handler();

    function get_full_presence_list_update() {
        activity.send_presence_to_server(redraw);
    }

    /* Time between keep-alive pings */
    const active_ping_interval_ms = page_params.server_presence_ping_interval_seconds * 1000;
    util.call_function_periodically(get_full_presence_list_update, active_ping_interval_ms);

    // Let the server know we're here, but do not pass
    // redraw, since we just got all this info in page_params.
    activity.send_presence_to_server();
}

export function update_presence_info(user_id, info, server_time) {
    // There can be some case where the presence event
    // was set for an inaccessible user if
    // CAN_ACCESS_ALL_USERS_GROUP_LIMITS_PRESENCE is
    // disabled. We just ignore that event and return.
    const person = people.maybe_get_user_by_id(user_id, true);
    if (person === undefined || person.is_inaccessible_user) {
        return;
    }

    presence.update_info_from_event(user_id, info, server_time);
    redraw_user(user_id);
    pm_list.update_private_messages();
}

export function redraw() {
    build_user_sidebar();
    user_cursor.redraw();
    pm_list.update_private_messages();
}

export function reset_users() {
    // Call this when we're leaving the search widget.
    build_user_sidebar();
    user_cursor.clear();
}

export function narrow_for_user(opts) {
    const user_id = buddy_list.get_user_id_from_li({$li: opts.$li});
    return narrow_for_user_id({user_id});
}

export function narrow_for_user_id(opts) {
    const person = people.get_by_user_id(opts.user_id);
    const email = person.email;

    assert(narrow_by_email);
    narrow_by_email(email);
    user_filter.clear_and_hide_search();
}

function keydown_enter_key() {
    const user_id = user_cursor.get_key();
    if (user_id === undefined) {
        return;
    }

    narrow_for_user_id({user_id});
    sidebar_ui.hide_all();
    popovers.hide_all();
}

export function set_cursor_and_filter() {
    user_cursor = new ListCursor({
        list: buddy_list,
        highlight_class: "highlighted_user",
    });

    user_filter = new UserSearch({
        update_list: update_users_for_search,
        reset_items: reset_users,
        on_focus: () => user_cursor.reset(),
    });

    const $input = user_filter.input_field();

    $input.on("blur", () => user_cursor.clear());

    keydown_util.handle({
        $elem: $input,
        handlers: {
            Enter() {
                keydown_enter_key();
                return true;
            },
            ArrowUp() {
                user_cursor.prev();
                return true;
            },
            ArrowDown() {
                user_cursor.next();
                return true;
            },
        },
    });
}

export function initiate_search() {
    if (user_filter) {
        popovers.hide_all();
        user_filter.initiate_search();
    }
}

export function escape_search() {
    if (user_filter) {
        user_filter.clear_and_hide_search();
    }
}

export function get_filter_text() {
    if (!user_filter) {
        // This may be overly defensive, but there may be
        // situations where get called before everything is
        // fully initialized.  The empty string is a fine
        // default here.
        blueslip.warn("get_filter_text() is called before initialization");
        return "";
    }

    return user_filter.text();
}
