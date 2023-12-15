import $ from "jquery";
import {delegate} from "tippy.js";

import render_change_visibility_policy_button_tooltip from "../templates/change_visibility_policy_button_tooltip.hbs";
import render_message_edit_notice_tooltip from "../templates/message_edit_notice_tooltip.hbs";
import render_message_inline_image_tooltip from "../templates/message_inline_image_tooltip.hbs";
import render_narrow_tooltip from "../templates/narrow_tooltip.hbs";

import {$t} from "./i18n";
import * as message_lists from "./message_lists";
import {page_params} from "./page_params";
import * as reactions from "./reactions";
import * as rows from "./rows";
import * as timerender from "./timerender";
import {INTERACTIVE_HOVER_DELAY, LONG_HOVER_DELAY} from "./tippyjs";
import {parse_html} from "./ui_util";

// We need to store all message list instances together to destroy them in case of re-rendering.
const message_list_tippy_instances = new Set();

// This keeps track of all the instances created and destroyed.
const store_message_list_instances_plugin = {
    fn() {
        return {
            onCreate(instance) {
                message_list_tippy_instances.add(instance);
            },
            onDestroy(instance) {
                // To make sure the `message_list_tippy_instances` contains only instances
                // that are present in the DOM, we need to delete instances that are destroyed
                message_list_tippy_instances.delete(instance);
            },
        };
    },
};

function message_list_tooltip(target, props) {
    delegate("body", {
        target,
        appendTo: () => document.body,
        plugins: [store_message_list_instances_plugin],
        ...props,
    });
}

// Defining observer outside ensures that at max only one observer is active at all times.
let observer;
function hide_tooltip_if_reference_removed(
    target_node,
    config,
    instance,
    nodes_to_check_for_removal,
) {
    // Use MutationObserver to check for removal of nodes on which tooltips
    // are still active.
    if (!target_node) {
        // The tooltip reference was removed from DOM before we reached here.
        // In that case, we simply hide the tooltip.
        // We have to be smart about hiding the instance, so we hide it as soon
        // as it is displayed.
        setTimeout(instance.hide, 0);
        return;
    }
    const callback = function (mutationsList) {
        for (const mutation of mutationsList) {
            for (const node of nodes_to_check_for_removal) {
                // Hide instance if reference's class changes.
                if (mutation.type === "attributes" && mutation.attributeName === "class") {
                    instance.hide();
                }
                // Hide instance if reference is in the removed node list.
                if (Array.prototype.includes.call(mutation.removedNodes, node)) {
                    instance.hide();
                }
            }
        }
    };
    observer = new MutationObserver(callback);
    observer.observe(target_node, config);
}

// To prevent the appearance of tooltips whose reference is hidden or removed from the
// DOM during re-rendering, we need to destroy all the message list present instances,
// and then initialize triggers of the tooltips again after re-rendering.
export function destroy_all_message_list_tooltips() {
    for (const instance of message_list_tippy_instances) {
        if (instance.reference === document.body) {
            continue;
        }
        instance.destroy();
    }
    message_list_tippy_instances.clear();
}

export function initialize() {
    message_list_tooltip(".tippy-narrow-tooltip", {
        delay: LONG_HOVER_DELAY,
        onCreate(instance) {
            instance.setContent(
                parse_html(render_narrow_tooltip({content: instance.props.content})),
            );
        },
    });

    // message reaction tooltip showing who reacted.
    let observer;
    message_list_tooltip(".message_reaction", {
        delay: INTERACTIVE_HOVER_DELAY,
        placement: "bottom",
        onShow(instance) {
            if (!document.body.contains(instance.reference)) {
                // It is possible for reaction to be removed before `onShow` is triggered,
                // so, we check if the element exists before proceeding.
                return false;
            }
            const $elem = $(instance.reference);
            const local_id = $elem.attr("data-reaction-id");
            const message_id = rows.get_message_id(instance.reference);
            const title = reactions.get_reaction_title_data(message_id, local_id);
            instance.setContent(title);

            const config = {attributes: false, childList: true, subtree: true};
            const target = $elem.parents(".message-list.focused-message-list").get(0);
            const nodes_to_check_for_removal = [
                $elem.parents(".recipient_row").get(0),
                $elem.parents(".message_reactions").get(0),
                $elem.get(0),
            ];
            hide_tooltip_if_reference_removed(target, config, instance, nodes_to_check_for_removal);
            return true;
        },
        onHidden(instance) {
            instance.destroy();
            if (observer) {
                observer.disconnect();
            }
        },
    });

    message_list_tooltip(".message_reactions .reaction_button", {
        delay: LONG_HOVER_DELAY,
        placement: "bottom",
        onShow(instance) {
            if (!document.body.contains(instance.reference)) {
                // It is possible for the single reaction necessary for
                // displaying the reaction button to be removed before
                // `onShow` is triggered, so we check if the element
                // exists before proceeding.
                return false;
            }
            const $elem = $(instance.reference);

            if ($elem.hasClass("active-emoji-picker-reference")) {
                // Don't show the tooltip when the emoji picker is open
                return false;
            }

            const config = {attributes: false, childList: true, subtree: true};
            const target = $elem.parents(".message-list.focused-message-list").get(0);
            const nodes_to_check_for_removal = [
                $elem.parents(".recipient_row").get(0),
                $elem.parents(".message_reactions").get(0),
                $elem.get(0),
            ];
            hide_tooltip_if_reference_removed(target, config, instance, nodes_to_check_for_removal);
            return true;
        },
        onHidden(instance) {
            instance.destroy();
        },
    });

    message_list_tooltip(".message_control_button", {
        delay: LONG_HOVER_DELAY,
        onShow(instance) {
            // Handle dynamic "starred messages" and "edit" widgets.
            const $elem = $(instance.reference);
            const tippy_content = $elem.attr("data-tippy-content");
            const $template = $(`#${CSS.escape($elem.attr("data-tooltip-template-id"))}`);
            instance.setContent(tippy_content ?? parse_html($template.html()));
        },
        onHidden(instance) {
            instance.destroy();
        },
    });

    message_list_tooltip(".slow-send-spinner", {
        onShow(instance) {
            instance.setContent(
                $t({
                    defaultMessage:
                        "Your message is taking longer than expected to be sent. Sending…",
                }),
            );
            const $elem = $(instance.reference);

            // We need to check for removal of local class from message_row since
            // .slow-send-spinner is not removed (hidden) from DOM when message is sent.
            const target = $elem.parents(".message_row").get(0);
            const config = {attributes: true, childList: false, subtree: false};
            const nodes_to_check_for_removal = [$elem.get(0)];
            hide_tooltip_if_reference_removed(target, config, instance, nodes_to_check_for_removal);
        },
        onHidden(instance) {
            instance.destroy();
        },
    });

    message_list_tooltip(".message-list .message_time", {
        onShow(instance) {
            const $time_elem = $(instance.reference);
            const $row = $time_elem.closest(".message_row");
            const message = message_lists.current.get(rows.id($row));
            // Don't show time tooltip for locally echoed message.
            if (message.locally_echoed) {
                return false;
            }
            const time = new Date(message.timestamp * 1000);
            instance.setContent(timerender.get_full_datetime_clarification(time));
            return true;
        },
        onHidden(instance) {
            instance.destroy();
        },
    });

    message_list_tooltip(".recipient_row_date > span", {
        onHidden(instance) {
            instance.destroy();
        },
    });

    message_list_tooltip(".code_external_link");

    message_list_tooltip(".change_visibility_policy > i", {
        delay: LONG_HOVER_DELAY,
        onShow(instance) {
            const $elem = $(instance.reference);
            const current_visibility_policy_str = $elem.attr("data-tippy-content");
            instance.setContent(
                parse_html(
                    render_change_visibility_policy_button_tooltip({current_visibility_policy_str}),
                ),
            );
        },
        onHidden(instance) {
            instance.destroy();
        },
    });

    message_list_tooltip([".recipient_bar_icon"], {
        delay: LONG_HOVER_DELAY,
        onHidden(instance) {
            instance.destroy();
        },
    });

    message_list_tooltip([".rendered_markdown time", ".rendered_markdown .copy_codeblock"], {
        content: timerender.get_markdown_time_tooltip,
        onHidden(instance) {
            instance.destroy();
        },
    });

    message_list_tooltip(".message_inline_image > a > img", {
        // Add a short delay so the user can mouseover several inline images without
        // tooltips showing and hiding rapidly
        delay: [300, 20],
        onShow(instance) {
            // Some message_inline_images aren't actually images with a title,
            // for example youtube videos, so we default to the actual href
            const title =
                $(instance.reference).parent().attr("aria-label") ||
                $(instance.reference).parent().attr("href");
            instance.setContent(parse_html(render_message_inline_image_tooltip({title})));
        },
        onHidden(instance) {
            instance.destroy();
        },
    });

    message_list_tooltip(".view_user_card_tooltip", {
        delay: LONG_HOVER_DELAY,
        onHidden(instance) {
            instance.destroy();
        },
    });

    message_list_tooltip(".message_edit_notice", {
        trigger: "mouseenter",
        delay: LONG_HOVER_DELAY,
        popperOptions: {
            modifiers: [
                {
                    name: "flip",
                    options: {
                        fallbackPlacements: "bottom",
                    },
                },
            ],
        },
        onShow(instance) {
            const $elem = $(instance.reference);
            const edited_notice_str = $elem.attr("data-tippy-content");
            instance.setContent(
                parse_html(
                    render_message_edit_notice_tooltip({
                        edited_notice_str,
                        realm_allow_edit_history: page_params.realm_allow_edit_history,
                    }),
                ),
            );
        },
        onHidden(instance) {
            instance.destroy();
        },
    });
}
