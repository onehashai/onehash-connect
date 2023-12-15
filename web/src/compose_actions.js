/* Module primarily for opening/closing the compose box. */

import autosize from "autosize";
import $ from "jquery";

import * as blueslip from "./blueslip";
import * as compose_banner from "./compose_banner";
import * as compose_fade from "./compose_fade";
import * as compose_pm_pill from "./compose_pm_pill";
import * as compose_recipient from "./compose_recipient";
import * as compose_state from "./compose_state";
import * as compose_ui from "./compose_ui";
import * as compose_validate from "./compose_validate";
import * as drafts from "./drafts";
import * as message_lists from "./message_lists";
import * as message_viewport from "./message_viewport";
import * as narrow_state from "./narrow_state";
import {page_params} from "./page_params";
import * as people from "./people";
import * as popovers from "./popovers";
import * as reload_state from "./reload_state";
import * as resize from "./resize";
import * as settings_config from "./settings_config";
import * as spectators from "./spectators";
import * as stream_bar from "./stream_bar";
import * as stream_data from "./stream_data";

const compose_clear_box_hooks = [];
const compose_cancel_hooks = [];

export function register_compose_box_clear_hook(hook) {
    compose_clear_box_hooks.push(hook);
}

export function register_compose_cancel_hook(hook) {
    compose_cancel_hooks.push(hook);
}

function call_hooks(hooks) {
    for (const f of hooks) {
        f();
    }
}

export function blur_compose_inputs() {
    $(".message_comp").find("input, textarea, button, #private_message_recipient").trigger("blur");
}

function hide_box() {
    // This is the main hook for saving drafts when closing the compose box.
    drafts.update_draft();
    blur_compose_inputs();
    $("#compose_recipient_box").hide();
    $("#compose-direct-recipient").hide();
    $(".new_message_textarea").css("min-height", "");
    compose_fade.clear_compose();
    $(".message_comp").hide();
    $("#compose_controls").show();
}

function show_compose_box(msg_type, opts) {
    compose_recipient.update_compose_for_message_type(msg_type, opts);
    $("#compose").css({visibility: "visible"});
    // When changing this, edit the 42px in _maybe_autoscroll
    $(".new_message_textarea").css("min-height", "3em");
    compose_ui.set_focus(msg_type, opts);
}

export function clear_textarea() {
    $("#compose").find("input[type=text], textarea").val("");
}

function clear_box() {
    call_hooks(compose_clear_box_hooks);

    // TODO: Better encapsulate at-mention warnings.
    compose_validate.clear_topic_resolved_warning();
    compose_validate.clear_stream_wildcard_warnings($("#compose_banners"));
    compose_validate.set_user_acknowledged_stream_wildcard_flag(false);

    compose_state.set_recipient_edited_manually(false);
    clear_textarea();
    compose_validate.check_overflow_text();
    $("textarea#compose-textarea").removeData("draft-id");
    $("textarea#compose-textarea").toggleClass("invalid", false);
    compose_ui.autosize_textarea($("textarea#compose-textarea"));
    compose_banner.clear_errors();
    compose_banner.clear_warnings();
    compose_banner.clear_uploads();
    $(".compose_control_button_container:has(.add-poll)").removeClass("disabled-on-hover");
}

export function autosize_message_content() {
    if (!compose_ui.is_full_size()) {
        autosize($("textarea#compose-textarea"), {
            callback() {
                maybe_scroll_up_selected_message();
            },
        });
    }
}

export function expand_compose_box() {
    $("#compose_close").attr("data-tooltip-template-id", "compose_close_tooltip_template");
    $("#compose_close").show();
    $("#compose_controls").hide();
    $(".message_comp").show();
}

export function complete_starting_tasks(msg_type, opts) {
    // This is sort of a kitchen sink function, and it's called only
    // by compose.start() for now.  Having this as a separate function
    // makes testing a bit easier.

    maybe_scroll_up_selected_message();
    compose_fade.start_compose(msg_type);
    if (msg_type === "stream") {
        stream_bar.decorate(
            opts.stream_id,
            $("#stream_message_recipient_topic .message_header_stream"),
        );
    }
    $(document).trigger(new $.Event("compose_started.zulip", opts));
    compose_recipient.update_placeholder_text();
    compose_recipient.update_narrow_to_recipient_visibility();
}

export function maybe_scroll_up_selected_message() {
    // If the compose box is obscuring the currently selected message,
    // scroll up until the message is no longer occluded.
    if (message_lists.current.selected_id() === -1) {
        // If there's no selected message, there's no need to
        // scroll the compose box to avoid it.
        return;
    }
    const $selected_row = message_lists.current.selected_row();

    if ($selected_row.height() > message_viewport.height() - 100) {
        // For very tall messages whose height is close to the entire
        // height of the viewport, don't auto-scroll the viewport to
        // the end of the message (since that makes it feel annoying
        // to work with very tall messages).  See #8941 for details.
        return;
    }

    const cover =
        $selected_row.get_offset_to_window().bottom - $("#compose").get_offset_to_window().top;
    if (cover > 0) {
        message_viewport.user_initiated_animate_scroll(cover + 20);
    }
}

export function fill_in_opts_from_current_narrowed_view(msg_type, opts) {
    return {
        message_type: msg_type,
        stream_id: undefined,
        topic: "",
        private_message_recipient: "",
        trigger: "unknown",

        // Set default parameters based on the current narrowed view.
        ...narrow_state.set_compose_defaults(),

        // Set parameters based on provided opts, overwriting
        // those set based on current narrowed view, if necessary.
        ...opts,
    };
}

function same_recipient_as_before(msg_type, opts) {
    return (
        compose_state.get_message_type() === msg_type &&
        ((msg_type === "stream" &&
            opts.stream_id === compose_state.stream_id() &&
            opts.topic === compose_state.topic()) ||
            (msg_type === "private" &&
                opts.private_message_recipient === compose_state.private_message_recipient()))
    );
}

export function start(msg_type, opts) {
    if (page_params.is_spectator) {
        spectators.login_to_access();
        return;
    }

    if (!msg_type) {
        // We prefer callers to be explicit about the message type, but
        // we if we don't know, we open a stream compose box by default,
        // which opens stream selection dropdown.
        // Also, msg_type is used to check if compose box is open in compose_state.composing().
        msg_type = "stream";
        blueslip.warn("Empty message type in compose.start");
    }

    popovers.hide_all();
    autosize_message_content();

    if (reload_state.is_in_progress()) {
        return;
    }
    compose_banner.clear_message_sent_banners();
    expand_compose_box();

    opts = fill_in_opts_from_current_narrowed_view(msg_type, opts);
    const is_clear_topic_button_triggered = opts.trigger === "clear topic button";

    // If we are invoked by a compose hotkey (c or x) or new topic
    // button, do not assume that we know what the message's topic or
    // direct message recipient should be.
    if (
        opts.trigger === "compose_hotkey" ||
        is_clear_topic_button_triggered ||
        opts.trigger === "new direct message"
    ) {
        opts.topic = "";
        opts.private_message_recipient = "";
    }

    const subbed_streams = stream_data.subscribed_subs();
    if (
        subbed_streams.length === 1 &&
        (is_clear_topic_button_triggered ||
            (opts.trigger === "compose_hotkey" && msg_type === "stream"))
    ) {
        opts.stream_id = subbed_streams[0].stream_id;
    }

    // If we go to a different narrow or there is new message content to populate the compose box
    // with (like from a draft), save any existing content as a draft, and clear the compose box.
    if (
        compose_state.composing() &&
        (!same_recipient_as_before(msg_type, opts) || opts.content !== undefined)
    ) {
        drafts.update_draft();
        clear_box();
    }

    if (msg_type === "stream") {
        const $stream_header_colorblock = $(
            "#compose_select_recipient_widget_wrapper .stream_header_colorblock",
        );
        stream_bar.decorate(opts.stream_id, $stream_header_colorblock);
    }

    if (msg_type === "private") {
        compose_state.set_compose_recipient_id(compose_state.DIRECT_MESSAGE_ID);
        compose_recipient.on_compose_select_recipient_update();
    } else if (opts.stream_id) {
        compose_state.set_stream_id(opts.stream_id);
        compose_recipient.on_compose_select_recipient_update();
    } else {
        // Open stream selection dropdown if no stream is selected.
        compose_recipient.open_compose_recipient_dropdown();
    }
    compose_state.topic(opts.topic);

    // Set the recipients with a space after each comma, so it looks nice.
    compose_state.private_message_recipient(
        opts.private_message_recipient.replaceAll(/,\s*/g, ", "),
    );

    // If the user opens the compose box, types some text, and then clicks on a
    // different stream/topic, we want to keep the text in the compose box
    if (opts.content !== undefined) {
        compose_state.message_content(opts.content);
        $(".compose_control_button_container:has(.add-poll)").addClass("disabled-on-hover");
    }

    compose_state.set_message_type(msg_type);

    // Show either stream/topic fields or "You and" field.
    show_compose_box(msg_type, opts);

    if (opts.draft_id) {
        $("textarea#compose-textarea").data("draft-id", opts.draft_id);
    }

    if (opts.content !== undefined) {
        // If we were provided with message content, we might need to
        // resize the compose box, or display that it's too long.
        compose_ui.autosize_textarea($("textarea#compose-textarea"));
        compose_validate.check_overflow_text();
    }

    const $clear_topic_button = $("#recipient_box_clear_topic_button");
    if (is_clear_topic_button_triggered || opts.topic.length === 0) {
        $clear_topic_button.hide();
    } else {
        $clear_topic_button.show();
    }

    // Show a warning if topic is resolved
    compose_validate.warn_if_topic_resolved(true);
    // Show a warning if the user is in a search narrow when replying to a message
    if (opts.is_reply) {
        compose_validate.warn_if_in_search_view();
    }

    compose_recipient.check_posting_policy_for_compose_box();

    // Reset the `max-height` property of `compose-textarea` so that the
    // compose-box do not cover the last messages of the current stream
    // while writing a long message.
    resize.reset_compose_message_max_height();

    complete_starting_tasks(msg_type, opts);
}

export function cancel() {
    // As user closes the compose box, restore the compose box max height
    if (compose_ui.is_full_size()) {
        compose_ui.make_compose_box_original_size();
    }

    $("textarea#compose-textarea").height(40 + "px");

    if (page_params.narrow !== undefined) {
        // Never close the compose box in narrow embedded windows, but
        // at least clear the topic and unfade.
        compose_fade.clear_compose();
        if (page_params.narrow_topic !== undefined) {
            compose_state.topic(page_params.narrow_topic);
        } else {
            compose_state.topic("");
        }
        return;
    }
    hide_box();
    $("#compose_close").hide();
    clear_box();
    compose_banner.clear_message_sent_banners();
    call_hooks(compose_cancel_hooks);
    compose_state.set_message_type(false);
    compose_pm_pill.clear();
    $(document).trigger("compose_canceled.zulip");
}

export function on_show_navigation_view() {
    /* This function dictates the behavior of the compose box
     * when navigating to a view, as opposed to a narrow. */

    // Leave the compose box closed if it was already closed.
    if (!compose_state.composing()) {
        return;
    }

    // Leave the compose box open if there is content or if the recipient was edited.
    if (compose_state.has_message_content() || compose_state.is_recipient_edited_manually()) {
        return;
    }

    // Otherwise, close the compose box.
    cancel();
}

export function on_topic_narrow() {
    if (!compose_state.composing()) {
        // If our compose box is closed, then just
        // leave it closed, assuming that the user is
        // catching up on their feed and not actively
        // composing.
        return;
    }

    if (compose_state.stream_name() !== narrow_state.stream_name()) {
        // If we changed streams, then we only leave the
        // compose box open if there is content or if the recipient was edited.
        if (compose_state.has_message_content() || compose_state.is_recipient_edited_manually()) {
            compose_fade.update_message_list();
            return;
        }

        // Otherwise, avoid a mix.
        cancel();
        return;
    }

    if (
        (compose_state.topic() && compose_state.has_message_content()) ||
        compose_state.is_recipient_edited_manually()
    ) {
        // If the user has written something to a different topic or edited it,
        // they probably want that content, so leave compose open.
        //
        // This effectively uses the heuristic of whether there is
        // content in compose or the topic was edited to determine whether
        // the user had firmly decided to compose to the old topic or is
        // just looking to reply to what they see.
        compose_fade.update_message_list();
        return;
    }

    // If we got this far, then the compose box has the correct stream
    // filled in, and either compose is empty or no topic was set, so
    // we should update the compose topic to match the new narrow.
    // See #3300 for context--a couple users specifically asked for
    // this convenience.
    compose_state.topic(narrow_state.topic());
    compose_validate.warn_if_topic_resolved(true);
    compose_fade.set_focused_recipient("stream");
    compose_fade.update_message_list();
    $("textarea#compose-textarea").trigger("focus");
}

export function on_narrow(opts) {
    // We use force_close when jumping between direct message narrows with
    // the "p" key, so that we don't have an open compose box that makes
    // it difficult to cycle quickly through unread messages.
    if (opts.force_close) {
        // This closes the compose box if it was already open, and it is
        // basically a noop otherwise.
        cancel();
        return;
    }

    if (opts.trigger === "narrow_to_compose_target") {
        compose_fade.update_message_list();
        return;
    }

    if (narrow_state.narrowed_by_topic_reply()) {
        on_topic_narrow();
        return;
    }

    if (compose_state.has_message_content() || compose_state.is_recipient_edited_manually()) {
        compose_fade.update_message_list();
        return;
    }

    if (narrow_state.narrowed_by_pm_reply()) {
        opts = fill_in_opts_from_current_narrowed_view("private", opts);
        // Do not open compose box if an invalid recipient is present.
        if (!opts.private_message_recipient) {
            if (compose_state.composing()) {
                cancel();
            }
            return;
        }
        // Do not open compose box if organization has disabled sending
        // direct messages and recipient is not a bot.
        if (
            page_params.realm_private_message_policy ===
                settings_config.private_message_policy_values.disabled.code &&
            opts.private_message_recipient
        ) {
            const emails = opts.private_message_recipient.split(",");
            if (emails.length !== 1 || !people.get_by_email(emails[0]).is_bot) {
                // If we are navigating between direct message conversations,
                // we want the compose box to close for non-bot users.
                if (compose_state.composing()) {
                    cancel();
                }
                return;
            }
        }
        start("private");
        return;
    }

    // If we got this far, then we assume the user is now in "reading"
    // mode, so we close the compose box to make it easier to use navigation
    // hotkeys and to provide more screen real estate for messages.
    cancel();
}
