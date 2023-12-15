import $ from "jquery";

import * as resolved_topic from "../shared/src/resolved_topic";
import render_compose_banner from "../templates/compose_banner/compose_banner.hbs";
import render_not_subscribed_warning from "../templates/compose_banner/not_subscribed_warning.hbs";
import render_private_stream_warning from "../templates/compose_banner/private_stream_warning.hbs";
import render_stream_wildcard_warning from "../templates/compose_banner/stream_wildcard_warning.hbs";
import render_wildcard_mention_not_allowed_error from "../templates/compose_banner/wildcard_mention_not_allowed_error.hbs";
import render_compose_limit_indicator from "../templates/compose_limit_indicator.hbs";

import * as channel from "./channel";
import * as compose_banner from "./compose_banner";
import * as compose_pm_pill from "./compose_pm_pill";
import * as compose_state from "./compose_state";
import * as compose_ui from "./compose_ui";
import {$t} from "./i18n";
import * as message_store from "./message_store";
import * as narrow_state from "./narrow_state";
import {page_params} from "./page_params";
import * as peer_data from "./peer_data";
import * as people from "./people";
import * as reactions from "./reactions";
import * as recent_senders from "./recent_senders";
import * as settings_config from "./settings_config";
import * as settings_data from "./settings_data";
import * as stream_data from "./stream_data";
import * as sub_store from "./sub_store";
import * as util from "./util";

let user_acknowledged_stream_wildcard = false;
let upload_in_progress = false;
let message_too_long = false;
let recipient_disallowed = false;

export let wildcard_mention_threshold = 15;

export function set_upload_in_progress(status) {
    upload_in_progress = status;
    update_send_button_status();
}

function set_message_too_long(status) {
    message_too_long = status;
    update_send_button_status();
}

export function set_recipient_disallowed(status) {
    recipient_disallowed = status;
    update_send_button_status();
}

function update_send_button_status() {
    $(".message-send-controls").toggleClass(
        "disabled-message-send-controls",
        message_too_long || upload_in_progress || recipient_disallowed,
    );
}

export function get_disabled_send_tooltip() {
    if (message_too_long) {
        return $t({defaultMessage: "Message length shouldn't be greater than 10000 characters."});
    } else if (upload_in_progress) {
        return $t({defaultMessage: "Cannot send message while files are being uploaded."});
    }
    return "";
}

export function needs_subscribe_warning(user_id, stream_id) {
    // This returns true if all of these conditions are met:
    //  * the user is valid
    //  * the user is not already subscribed to the stream
    //  * the user has no back-door way to see stream messages
    //    (i.e. bots on public/private streams)
    //
    //  You can think of this as roughly answering "is there an
    //  actionable way to subscribe the user and do they actually
    //  need it?".
    //
    //  We expect the caller to already have verified that we're
    //  sending to a valid stream and trying to mention the user.

    const user = people.maybe_get_user_by_id(user_id);

    if (!user) {
        return false;
    }

    if (user.is_bot) {
        // Bots may receive messages on public/private streams even if they are
        // not subscribed.
        return false;
    }

    if (stream_data.is_user_subscribed(stream_id, user_id)) {
        // If our user is already subscribed
        return false;
    }

    return true;
}

function get_stream_id_for_textarea($textarea) {
    // Returns the stream ID, if any, associated with the textarea:
    // The recipient of a message being edited, or the target
    // recipient of a message being drafted in the compose box.
    // Returns undefined if the appropriate context is a direct
    // message conversation.
    const is_in_editing_area = $textarea.closest(".message_row").length > 0;

    if (is_in_editing_area) {
        const stream_id_str = $textarea
            .closest(".recipient_row")
            .find(".message_header")
            .attr("data-stream-id");
        if (stream_id_str === undefined) {
            // Direct messages don't have a data-stream-id.
            return undefined;
        }
        return Number.parseInt(stream_id_str, 10);
    }

    return compose_state.stream_id();
}

export function warn_if_private_stream_is_linked(linked_stream, $textarea) {
    const stream_id = get_stream_id_for_textarea($textarea);

    if (!stream_id) {
        // There are two cases in which the `stream_id` will be
        // omitted, and we want to exclude the warning banner:
        //
        // 1. We currently do not warn about links to private streams
        // in direct messages; it would probably be an improvement to
        // do so when one of the recipients is not subscribed.
        //
        // 2. If we have an invalid stream name, we do not warn about
        // it here; we will show an error to the user when they try to
        // send the message.
        return;
    }

    // If the stream we're linking to is not invite-only, then it's
    // public, and there is no need to warn about it, since all
    // members can already see all the public streams.
    //
    // Theoretically, we could still do a warning if there are any
    // guest users subscribed to the stream we're posting to; we may
    // change this policy if user feedback suggests it'd be an
    // improvement.
    if (!linked_stream.invite_only) {
        return;
    }

    // Don't warn if subscribers list of current compose_stream is
    // a subset of linked_stream's subscribers list, because
    // everyone will be subscribed to the linked stream and so
    // knows it exists.  (But always warn Zephyr users, since
    // we may not know their stream's subscribers.)
    if (
        peer_data.is_subscriber_subset(stream_id, linked_stream.stream_id) &&
        !page_params.realm_is_zephyr_mirror_realm
    ) {
        return;
    }

    const new_row = render_private_stream_warning({
        banner_type: compose_banner.WARNING,
        stream_name: linked_stream.name,
        classname: compose_banner.CLASSNAMES.private_stream_warning,
    });
    const $container = compose_banner.get_compose_banner_container($textarea);
    compose_banner.append_compose_banner_to_banner_list(new_row, $container);
}

export function warn_if_mentioning_unsubscribed_user(mentioned, $textarea) {
    // Disable for Zephyr mirroring realms, since we never have subscriber lists there
    if (page_params.realm_is_zephyr_mirror_realm) {
        return;
    }

    const user_id = mentioned.user_id;

    if (mentioned.is_broadcast) {
        return; // don't check if @all/@everyone/@stream
    }

    const stream_id = get_stream_id_for_textarea($textarea);

    if (!stream_id) {
        return;
    }

    if (needs_subscribe_warning(user_id, stream_id)) {
        const $banner_container = compose_banner.get_compose_banner_container($textarea);
        const $existing_invites_area = $banner_container.find(
            `.${CSS.escape(compose_banner.CLASSNAMES.recipient_not_subscribed)}`,
        );

        const existing_invites = [...$existing_invites_area].map((user_row) =>
            Number.parseInt($(user_row).data("user-id"), 10),
        );

        const can_subscribe_other_users = settings_data.user_can_subscribe_other_users();

        if (!existing_invites.includes(user_id)) {
            const context = {
                user_id,
                stream_id,
                banner_type: compose_banner.WARNING,
                button_text: can_subscribe_other_users
                    ? $t({defaultMessage: "Subscribe them"})
                    : null,
                can_subscribe_other_users,
                name: mentioned.full_name,
                classname: compose_banner.CLASSNAMES.recipient_not_subscribed,
                should_add_guest_user_indicator: people.should_add_guest_user_indicator(user_id),
            };

            const new_row = render_not_subscribed_warning(context);
            const $container = compose_banner.get_compose_banner_container($textarea);
            compose_banner.append_compose_banner_to_banner_list(new_row, $container);
        }
    }
}

// Called when clearing the compose box and similar contexts to clear
// the warning for composing to a resolved topic, if present. Also clears
// the state for whether this warning has already been shown in the
// current narrow.
export function clear_topic_resolved_warning() {
    compose_state.set_recipient_viewed_topic_resolved_banner(false);
    $(`#compose_banners .${CSS.escape(compose_banner.CLASSNAMES.topic_resolved)}`).remove();
}

export function warn_if_topic_resolved(topic_changed) {
    if (compose_state.recipient_has_topics()) {
        return;
    }
    // This function is called with topic_changed=false on every
    // keypress when typing a message, so it should not do anything
    // expensive in that case.
    //
    // Pass topic_changed=true if this function was called in response
    // to a topic being edited.
    const topic_name = compose_state.topic();

    if (!topic_changed && !resolved_topic.is_resolved(topic_name)) {
        // The resolved topic warning will only ever appear when
        // composing to a resolve topic, so we return early without
        // inspecting additional fields in this case.
        return;
    }

    const stream_id = compose_state.stream_id();
    const message_content = compose_state.message_content();
    const sub = stream_data.get_sub_by_id(stream_id);

    if (sub && message_content !== "" && resolved_topic.is_resolved(topic_name)) {
        if (compose_state.has_recipient_viewed_topic_resolved_banner()) {
            // We display the resolved topic banner at most once per narrow.
            return;
        }

        const button_text = settings_data.user_can_move_messages_to_another_topic()
            ? $t({defaultMessage: "Unresolve topic"})
            : null;

        const context = {
            banner_type: compose_banner.WARNING,
            stream_id: sub.stream_id,
            topic_name,
            banner_text: $t({
                defaultMessage:
                    "You are sending a message to a resolved topic. You can send as-is or unresolve the topic first.",
            }),
            button_text,
            classname: compose_banner.CLASSNAMES.topic_resolved,
        };

        const new_row = render_compose_banner(context);
        compose_banner.append_compose_banner_to_banner_list(new_row, $("#compose_banners"));
        compose_state.set_recipient_viewed_topic_resolved_banner(true);
    } else {
        clear_topic_resolved_warning();
    }
}

export function warn_if_in_search_view() {
    if (narrow_state.filter() && !narrow_state.filter().supports_collapsing_recipients()) {
        const context = {
            banner_type: compose_banner.WARNING,
            banner_text: $t({
                defaultMessage:
                    "This conversation may have additional messages not shown in this view.",
            }),
            button_text: $t({defaultMessage: "Go to conversation"}),
            classname: compose_banner.CLASSNAMES.search_view,
        };

        const new_row = render_compose_banner(context);
        compose_banner.append_compose_banner_to_banner_list(new_row, $("#compose_banners"));
    }
}

function show_stream_wildcard_warnings(opts) {
    const subscriber_count = peer_data.get_subscriber_count(opts.stream_id) || 0;
    const stream_name = sub_store.maybe_get_stream_name(opts.stream_id);
    const is_edit_container = opts.$banner_container.closest(".edit_form_banners").length > 0;
    const classname = compose_banner.CLASSNAMES.wildcard_warning;

    let button_text = opts.scheduling_message
        ? $t({defaultMessage: "Yes, schedule"})
        : $t({defaultMessage: "Yes, send"});

    if (is_edit_container) {
        button_text = $t({defaultMessage: "Yes, save"});
    }

    const stream_wildcard_template = render_stream_wildcard_warning({
        banner_type: compose_banner.WARNING,
        subscriber_count,
        stream_name,
        stream_wildcard_mention: opts.stream_wildcard_mention,
        button_text,
        hide_close_button: true,
        classname,
        scheduling_message: opts.scheduling_message,
    });

    // only show one error for any number of @all or @everyone mentions
    if (opts.$banner_container.find(`.${CSS.escape(classname)}`).length === 0) {
        compose_banner.append_compose_banner_to_banner_list(
            stream_wildcard_template,
            opts.$banner_container,
        );
    } else {
        // if there is already a banner, replace it with the new one
        compose_banner.update_or_append_banner(
            stream_wildcard_template,
            classname,
            opts.$banner_container,
        );
    }

    user_acknowledged_stream_wildcard = false;
}

export function clear_stream_wildcard_warnings($banner_container) {
    const classname = compose_banner.CLASSNAMES.wildcard_warning;
    $banner_container.find(`.${CSS.escape(classname)}`).remove();
}

export function set_user_acknowledged_stream_wildcard_flag(value) {
    user_acknowledged_stream_wildcard = value;
}

export function get_invalid_recipient_emails() {
    const private_recipients = util.extract_pm_recipients(
        compose_state.private_message_recipient(),
    );
    const invalid_recipients = private_recipients.filter(
        (email) => !people.is_valid_email_for_compose(email),
    );

    return invalid_recipients;
}

function check_unsubscribed_stream_for_send(stream_name, autosubscribe) {
    let result;
    if (!autosubscribe) {
        return "not-subscribed";
    }

    // In the rare circumstance of the autosubscribe option, we
    // *Synchronously* try to subscribe to the stream before sending
    // the message.  This is deprecated and we hope to remove it; see
    // #4650.
    channel.post({
        url: "/json/subscriptions/exists",
        data: {stream: stream_name, autosubscribe: true},
        async: false,
        success(data) {
            if (data.subscribed) {
                result = "subscribed";
            } else {
                result = "not-subscribed";
            }
        },
        error(xhr) {
            if (xhr.status === 404) {
                result = "does-not-exist";
            } else {
                result = "error";
            }
        },
    });
    return result;
}

function is_recipient_large_stream() {
    return (
        compose_state.stream_id() &&
        peer_data.get_subscriber_count(compose_state.stream_id()) > wildcard_mention_threshold
    );
}

export function topic_participant_count_more_than_threshold(stream_id, topic) {
    // Topic participants:
    // Users who either sent or reacted to the messages in the topic.
    const participant_ids = new Set();

    const sender_ids = recent_senders.get_topic_recent_senders(stream_id, topic);
    for (const id of sender_ids) {
        participant_ids.add(id);
    }

    // If senders count is greater than threshold, no need to calculate reactors.
    if (participant_ids.size > wildcard_mention_threshold) {
        return true;
    }

    for (const sender_id of sender_ids) {
        const message_ids = recent_senders.get_topic_message_ids_for_sender(
            stream_id,
            topic,
            sender_id,
        );
        for (const message_id of message_ids) {
            const message = message_store.get(message_id);
            if (message) {
                const message_reactions = reactions.get_message_reactions(message);
                const reactor_ids = message_reactions.flatMap((obj) => obj.user_ids);
                for (const id of reactor_ids) {
                    participant_ids.add(id);
                }
                if (participant_ids.size > wildcard_mention_threshold) {
                    return true;
                }
            }
        }
    }

    return false;
}

function is_recipient_large_topic() {
    return (
        compose_state.stream_id() &&
        topic_participant_count_more_than_threshold(
            compose_state.stream_id(),
            compose_state.topic(),
        )
    );
}

function wildcard_mention_policy_authorizes_user() {
    if (
        page_params.realm_wildcard_mention_policy ===
        settings_config.wildcard_mention_policy_values.by_everyone.code
    ) {
        return true;
    }
    if (
        page_params.realm_wildcard_mention_policy ===
        settings_config.wildcard_mention_policy_values.nobody.code
    ) {
        return false;
    }
    if (
        page_params.realm_wildcard_mention_policy ===
        settings_config.wildcard_mention_policy_values.by_admins_only.code
    ) {
        return page_params.is_admin;
    }

    if (
        page_params.realm_wildcard_mention_policy ===
        settings_config.wildcard_mention_policy_values.by_moderators_only.code
    ) {
        return page_params.is_admin || page_params.is_moderator;
    }

    if (
        page_params.realm_wildcard_mention_policy ===
        settings_config.wildcard_mention_policy_values.by_full_members.code
    ) {
        if (page_params.is_admin) {
            return true;
        }
        const person = people.get_by_user_id(page_params.user_id);
        const current_datetime = new Date(Date.now());
        const person_date_joined = new Date(person.date_joined);
        const days = (current_datetime - person_date_joined) / 1000 / 86400;

        return days >= page_params.realm_waiting_period_threshold && !page_params.is_guest;
    }
    return !page_params.is_guest;
}

export function stream_wildcard_mention_allowed() {
    return !is_recipient_large_stream() || wildcard_mention_policy_authorizes_user();
}

export function topic_wildcard_mention_allowed() {
    return !is_recipient_large_topic() || wildcard_mention_policy_authorizes_user();
}

export function set_wildcard_mention_threshold(value) {
    wildcard_mention_threshold = value;
}

export function validate_stream_message_mentions(opts) {
    const subscriber_count = peer_data.get_subscriber_count(opts.stream_id) || 0;

    // If the user is attempting to do a wildcard mention in a large
    // stream, check if they permission to do so. If yes, warn them
    // if they haven't acknowledged the wildcard warning yet.
    if (opts.stream_wildcard_mention !== null && subscriber_count > wildcard_mention_threshold) {
        if (!wildcard_mention_policy_authorizes_user()) {
            const new_row = render_wildcard_mention_not_allowed_error({
                banner_type: compose_banner.ERROR,
                classname: compose_banner.CLASSNAMES.wildcards_not_allowed,
                stream_wildcard_mention: opts.stream_wildcard_mention,
            });
            compose_banner.append_compose_banner_to_banner_list(new_row, opts.$banner_container);
            return false;
        }

        if (!user_acknowledged_stream_wildcard) {
            show_stream_wildcard_warnings(opts);

            $("#compose-send-button").prop("disabled", false);
            compose_ui.hide_compose_spinner();
            return false;
        }
    } else {
        // the message no longer contains @all or @everyone
        clear_stream_wildcard_warnings(opts.$banner_container);
    }
    // at this point, the user has either acknowledged the warning or removed @all / @everyone
    user_acknowledged_stream_wildcard = false;

    return true;
}

export function validation_error(error_type, stream_name) {
    const $banner_container = $("#compose_banners");
    switch (error_type) {
        case "does-not-exist":
            compose_banner.show_stream_does_not_exist_error(stream_name);
            return false;
        case "error":
            compose_banner.show_error_message(
                $t({defaultMessage: "Error checking subscription."}),
                compose_banner.CLASSNAMES.subscription_error,
                $banner_container,
                $("#compose_select_recipient_widget_wrapper"),
            );
            return false;
        case "not-subscribed": {
            if (
                $(`#compose_banners .${CSS.escape(compose_banner.CLASSNAMES.user_not_subscribed)}`)
                    .length
            ) {
                return false;
            }
            const sub = stream_data.get_sub(stream_name);
            const new_row = render_compose_banner({
                banner_type: compose_banner.ERROR,
                banner_text: $t({
                    defaultMessage:
                        "You're not subscribed to this stream. You will not be notified if other users reply to your message.",
                }),
                button_text: stream_data.can_toggle_subscription(sub)
                    ? $t({defaultMessage: "Subscribe"})
                    : null,
                classname: compose_banner.CLASSNAMES.user_not_subscribed,
                // The message cannot be sent until the user subscribes to the stream, so
                // closing the banner would be more confusing than helpful.
                hide_close_button: true,
            });
            compose_banner.append_compose_banner_to_banner_list(new_row, $banner_container);
            return false;
        }
    }
    return true;
}

export function validate_stream_message_address_info(stream_name) {
    if (stream_data.is_subscribed_by_name(stream_name)) {
        return true;
    }
    const autosubscribe = page_params.narrow_stream !== undefined;
    const error_type = check_unsubscribed_stream_for_send(stream_name, autosubscribe);
    return validation_error(error_type, stream_name);
}

function validate_stream_message(scheduling_message) {
    const stream_id = compose_state.stream_id();
    const $banner_container = $("#compose_banners");
    if (stream_id === undefined) {
        compose_banner.show_error_message(
            $t({defaultMessage: "Please specify a stream."}),
            compose_banner.CLASSNAMES.missing_stream,
            $banner_container,
            $("#compose_select_recipient_widget_wrapper"),
        );
        return false;
    }

    if (page_params.realm_mandatory_topics) {
        const topic = compose_state.topic();
        // TODO: We plan to migrate the empty topic to only using the
        // `""` representation for i18n reasons, but have not yet done so.
        if (topic === "" || topic === "(no topic)") {
            compose_banner.show_error_message(
                $t({defaultMessage: "Topics are required in this organization."}),
                compose_banner.CLASSNAMES.topic_missing,
                $banner_container,
                $("input#stream_message_recipient_topic"),
            );
            return false;
        }
    }

    const sub = stream_data.get_sub_by_id(stream_id);
    if (!sub) {
        return validation_error("does-not-exist", stream_id);
    }

    if (!stream_data.can_post_messages_in_stream(sub)) {
        compose_banner.show_error_message(
            $t({
                defaultMessage: "You do not have permission to post in this stream.",
            }),
            compose_banner.CLASSNAMES.no_post_permissions,
            $banner_container,
        );
        return false;
    }

    const stream_wildcard_mention = util.find_stream_wildcard_mentions(
        compose_state.message_content(),
    );

    if (
        !validate_stream_message_address_info(sub.name) ||
        !validate_stream_message_mentions({
            stream_id: sub.stream_id,
            $banner_container,
            stream_wildcard_mention,
            scheduling_message,
        })
    ) {
        return false;
    }

    return true;
}

// The function checks whether the recipients are users of the realm or cross realm users (bots
// for now)
function validate_private_message() {
    const user_ids = compose_pm_pill.get_user_ids();
    const $banner_container = $("#compose_banners");

    if (
        page_params.realm_private_message_policy ===
            settings_config.private_message_policy_values.disabled.code &&
        (user_ids.length !== 1 || !people.get_by_user_id(user_ids[0]).is_bot)
    ) {
        // Unless we're composing to a bot
        compose_banner.show_error_message(
            $t({defaultMessage: "Direct messages are disabled in this organization."}),
            compose_banner.CLASSNAMES.private_messages_disabled,
            $banner_container,
            $("#private_message_recipient"),
        );
        return false;
    }

    if (compose_state.private_message_recipient().length === 0) {
        compose_banner.show_error_message(
            $t({defaultMessage: "Please specify at least one valid recipient."}),
            compose_banner.CLASSNAMES.missing_private_message_recipient,
            $banner_container,
            $("#private_message_recipient"),
        );
        return false;
    } else if (page_params.realm_is_zephyr_mirror_realm) {
        // For Zephyr mirroring realms, the frontend doesn't know which users exist
        return true;
    }

    const invalid_recipients = get_invalid_recipient_emails();

    let context = {};
    if (invalid_recipients.length === 1) {
        context = {recipient: invalid_recipients.join(",")};
        compose_banner.show_error_message(
            $t({defaultMessage: "The recipient {recipient} is not valid."}, context),
            compose_banner.CLASSNAMES.invalid_recipient,
            $banner_container,
            $("#private_message_recipient"),
        );
        return false;
    } else if (invalid_recipients.length > 1) {
        context = {recipients: invalid_recipients.join(",")};
        compose_banner.show_error_message(
            $t({defaultMessage: "The recipients {recipients} are not valid."}, context),
            compose_banner.CLASSNAMES.invalid_recipients,
            $banner_container,
            $("#private_message_recipient"),
        );
        return false;
    }

    for (const user_id of user_ids) {
        if (!people.is_person_active(user_id)) {
            context = {full_name: people.get_by_user_id(user_id).full_name};
            compose_banner.show_error_message(
                $t({defaultMessage: "You cannot send messages to deactivated users."}, context),
                compose_banner.CLASSNAMES.deactivated_user,
                $banner_container,
                $("#private_message_recipient"),
            );

            return false;
        }
    }

    return true;
}

export function check_overflow_text() {
    // This function is called when typing every character in the
    // compose box, so it's important that it not doing anything
    // expensive.
    const text = compose_state.message_content();
    const max_length = page_params.max_message_length;
    const $indicator = $("#compose-limit-indicator");

    if (text.length > max_length) {
        $indicator.addClass("over_limit");
        $("textarea#compose-textarea").addClass("over_limit");
        $indicator.html(
            render_compose_limit_indicator({
                text_length: text.length,
                max_length,
            }),
        );
        compose_banner.show_error_message(
            $t(
                {
                    defaultMessage:
                        "Message length shouldn't be greater than {max_length} characters.",
                },
                {max_length},
            ),
            compose_banner.CLASSNAMES.message_too_long,
            $("#compose_banners"),
        );
        set_message_too_long(true);
    } else if (text.length > 0.9 * max_length) {
        $indicator.removeClass("over_limit");
        $("textarea#compose-textarea").removeClass("over_limit");
        $indicator.html(
            render_compose_limit_indicator({
                text_length: text.length,
                max_length,
            }),
        );
        set_message_too_long(false);
        $(`#compose_banners .${CSS.escape(compose_banner.CLASSNAMES.message_too_long)}`).remove();
    } else {
        $indicator.text("");
        $("textarea#compose-textarea").removeClass("over_limit");

        set_message_too_long(false);
        $(`#compose_banners .${CSS.escape(compose_banner.CLASSNAMES.message_too_long)}`).remove();
    }

    return text.length;
}

export function validate_message_length() {
    if (compose_state.message_content().length > page_params.max_message_length) {
        $("textarea#compose-textarea").addClass("flash");
        setTimeout(() => $("textarea#compose-textarea").removeClass("flash"), 1500);
        return false;
    }
    return true;
}

export function validate(scheduling_message) {
    const message_content = compose_state.message_content();
    if (/^\s*$/.test(message_content)) {
        $("textarea#compose-textarea").toggleClass("invalid", true);
        return false;
    }

    if ($("#zephyr-mirror-error").is(":visible")) {
        compose_banner.show_error_message(
            $t({
                defaultMessage:
                    "You need to be running Zephyr mirroring in order to send messages!",
            }),
            compose_banner.CLASSNAMES.zephyr_not_running,
            $("#compose_banners"),
        );
        return false;
    }
    if (!validate_message_length()) {
        return false;
    }

    if (compose_state.get_message_type() === "private") {
        return validate_private_message();
    }
    return validate_stream_message(scheduling_message);
}

export function convert_mentions_to_silent_in_direct_messages(mention_text, full_name, user_id) {
    if (compose_state.get_message_type() !== "private") {
        return mention_text;
    }

    const recipient_user_id = compose_pm_pill.get_user_ids();
    if (recipient_user_id.toString() !== user_id.toString()) {
        return mention_text;
    }

    const mention_str = people.get_mention_syntax(full_name, user_id, false);
    const silent_mention_str = people.get_mention_syntax(full_name, user_id, true);
    mention_text = mention_text.replace(mention_str, silent_mention_str);
    // also replace other mentions...
    compose_ui.replace_syntax(mention_str, silent_mention_str);

    return mention_text;
}
