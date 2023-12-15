/* Module for popovers that have been ported to the modern
   TippyJS/Popper popover library from the legacy Bootstrap
   popovers system in popovers.js. */

import $ from "jquery";
import tippy from "tippy.js";

import * as blueslip from "./blueslip";
import {media_breakpoints_num} from "./css_variables";
import * as modals from "./modals";
import * as overlays from "./overlays";
import * as popovers from "./popovers";
import * as util from "./util";

export const popover_instances = {
    compose_control_buttons: null,
    starred_messages: null,
    drafts: null,
    left_sidebar_inbox_popover: null,
    left_sidebar_all_messages_popover: null,
    left_sidebar_recent_view_popover: null,
    top_left_sidebar: null,
    message_actions: null,
    stream_settings: null,
    compose_mobile_button: null,
    topics_menu: null,
    send_later: null,
    change_visibility_policy: null,
    personal_menu: null,
    gear_menu: null,
    help_menu: null,
};

/* Keyboard UI functions */
export function popover_items_handle_keyboard(key, $items) {
    if (!$items) {
        return;
    }

    let index = $items.index($items.filter(":focus"));

    if (key === "enter" && index >= 0 && index < $items.length) {
        // This is not enough for some elements which need to trigger
        // natural click for them to work like ClipboardJS and follow
        // the link for anchor tags. For those elements, we need to
        // use `.navigate-link-on-enter` class on them.
        $items.eq(index).trigger("click");
        return;
    }

    if (index === -1) {
        index = 0;
    } else if ((key === "down_arrow" || key === "vim_down") && index < $items.length - 1) {
        index += 1;
    } else if ((key === "up_arrow" || key === "vim_up") && index > 0) {
        index -= 1;
    }
    $items.eq(index).trigger("focus");
}

export function focus_first_popover_item($items, index = 0) {
    if (!$items) {
        return;
    }

    $items.eq(index).expectOne().trigger("focus");
}

export function sidebar_menu_instance_handle_keyboard(instance, key) {
    const items = get_popover_items_for_instance(instance);
    popover_items_handle_keyboard(key, items);
}

export function get_visible_instance() {
    return Object.values(popover_instances).find(Boolean);
}

export function get_topic_menu_popover() {
    return popover_instances.topics_menu;
}

export function get_scheduled_messages_popover() {
    return popover_instances.send_later;
}

export function is_scheduled_messages_popover_displayed() {
    return popover_instances.send_later?.state.isVisible;
}

export function get_compose_control_buttons_popover() {
    return popover_instances.compose_control_buttons;
}

export function get_starred_messages_popover() {
    return popover_instances.starred_messages;
}

export function is_personal_menu_popover_displayed() {
    return popover_instances.personal_menu?.state.isVisible;
}

export function is_gear_menu_popover_displayed() {
    return popover_instances.gear_menu?.state.isVisible;
}

export function get_gear_menu_instance() {
    return popover_instances.gear_menu;
}

export function is_help_menu_popover_displayed() {
    return popover_instances.help_menu?.state.isVisible;
}

export function is_message_actions_popover_displayed() {
    return popover_instances.message_actions?.state.isVisible;
}

function get_popover_items_for_instance(instance) {
    const $current_elem = $(instance.popper);
    const class_name = $current_elem.attr("class");

    if (!$current_elem) {
        blueslip.error("Trying to get menu items when popover is closed.", {class_name});
        return undefined;
    }

    return $current_elem.find("a:visible");
}

export const default_popover_props = {
    delay: 0,
    appendTo: () => document.body,
    trigger: "click",
    interactive: true,
    hideOnClick: true,
    /* The light-border TippyJS theme is a bit of a misnomer; it
       is a popover styling similar to Bootstrap.  We've also customized
       its CSS to support Zulip's dark theme. */
    theme: "light-border",
    // The maxWidth has been set to "none" to avoid the default value of 300px.
    maxWidth: "none",
    touch: true,
    /* Don't use allow-HTML here since it is unsafe. Instead, use `parse_html`
       to generate the required html */
    popperOptions: {
        modifiers: [
            {
                // Hide popover for which the reference element is hidden.
                // References:
                // https://popper.js.org/docs/v2/modifiers/
                // https://github.com/atomiks/tippyjs/blob/ad85f6feb79cf6c5853c43bf1b2a50c4fa98e7a1/src/createTippy.ts#L608
                name: "destroy-popover-if-reference-hidden",
                enabled: true,
                phase: "beforeWrite",
                requires: ["$$tippy"],
                fn({state}) {
                    const instance = state.elements.reference._tippy;
                    const $popover = $(state.elements.popper);
                    const $tippy_box = $popover.find(".tippy-box");
                    if ($tippy_box.hasClass("show-when-reference-hidden")) {
                        return;
                    }

                    // $tippy_box[0].hasAttribute("data-reference-hidden"); is the real check
                    // but linter wants us to write it like this.
                    const is_reference_outside_window = Object.hasOwn(
                        $tippy_box[0].dataset,
                        "referenceHidden",
                    );
                    if (is_reference_outside_window) {
                        instance.hide();
                        return;
                    }

                    const $reference = $(state.elements.reference);
                    // Hide popover if the reference element is below another element.
                    //
                    // We only care about the reference element if it is inside the message feed since
                    // hiding elements outside the message feed is tricky and expensive due to stacking context.
                    // References in overlays, modal, sidebar overlays, popovers, etc. can make the below logic hard
                    // to live with if we take elements outside message feed into account.
                    // Since `.sticky_header` is inside `#message_feed_container`, we allow popovers from reference inside
                    // `.sticky_header` to be visible.
                    if (
                        $reference.parents("#message_feed_container, .sticky_header").length !== 1
                    ) {
                        return;
                    }

                    const reference_rect = $reference[0].getBoundingClientRect();
                    // This is the logic we want but since it is too expensive to run
                    // on every scroll, we run a cheaper version of this to just check if
                    // compose, sticky header or navbar are not obscuring the reference
                    // in message list where we want a better experience.
                    // Also, elementFromPoint can be quite buggy since element can be temporarily
                    // hidden or obscured by other elements like `simplebar-wrapper`.
                    //
                    // const topmost_element = document.elementFromPoint(
                    //     reference_rect.left,
                    //     reference_rect.top,
                    // );
                    // if (
                    //     !topmost_element ||
                    //     ($(topmost_element).closest($reference).length === 0 &&
                    //         $(topmost_element).find($reference).length === 0)
                    // ) {
                    //     instance.hide();
                    // }

                    // Hide popover if the reference element is below compose, sticky header or navbar.

                    // These are elements covering the reference element (intersection of elements at top
                    // top left and bottom right)
                    const elements_at_reference_position = document
                        .elementsFromPoint(reference_rect.left, reference_rect.top)
                        .filter((element) =>
                            document
                                .elementsFromPoint(reference_rect.right, reference_rect.bottom)
                                .includes(element),
                        );

                    if (
                        elements_at_reference_position.some(
                            (element) =>
                                element.id === "navbar-fixed-container" ||
                                element.id === "compose-content" ||
                                element.classList.contains("sticky_header"),
                        )
                    ) {
                        instance.hide();
                    }
                },
            },
        ],
    },
};

export const left_sidebar_tippy_options = {
    placement: "right",
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
};

export function on_show_prep(instance) {
    $(instance.popper).on("click", (e) => {
        // Popover is not hidden on click inside it unless the click handler for the
        // element explicitly hides the popover when handling the event.
        // `stopPropagation` is required here to avoid global click handlers from
        // being triggered.
        e.stopPropagation();
    });
    $(instance.popper).one("click", ".navigate_and_close_popover", (e) => {
        // Handler for links inside popover which don't need a special click handler.
        e.stopPropagation();
        instance.hide();
    });
}

function get_props_for_popover_centering(popover_props) {
    return {
        arrow: false,
        getReferenceClientRect: () => ({
            width: 0,
            height: 0,
            left: 0,
            top: 0,
        }),
        placement: "top",
        popperOptions: {
            modifiers: [
                {
                    name: "offset",
                    options: {
                        offset({popper}) {
                            // Calculate the offset needed to place the reference in the center
                            const x_offset_to_center = window.innerWidth / 2;
                            let y_offset_to_center = window.innerHeight / 2 - popper.height / 2;

                            // Move popover to the top of the screen if user is focused on an element which can
                            // open keyboard on a mobile device causing the screen to resize.
                            // Resize doesn't happen on iOS when keyboard is open, and typing text in input field just works.
                            // For other browsers, we need to check if the focused element is an text field and
                            // is causing a resize (thus calling this `offset` modifier function), in which case
                            // we need to move the popover to the top of the screen.
                            if (util.is_mobile()) {
                                const $focused_element = $(document.activeElement);
                                if (
                                    $focused_element.is(
                                        "input[type=text], input[type=number], textarea",
                                    )
                                ) {
                                    y_offset_to_center = 10;
                                }
                            }
                            return [x_offset_to_center, y_offset_to_center];
                        },
                    },
                },
            ],
        },
        onShow(instance) {
            // By default, Tippys with the `data-reference-hidden` attribute aren't displayed.
            // But when we render them as centered overlays on mobile and use
            // `getReferenceClientRect` for a virtual reference, Tippy slaps this
            // hidden attribute on our element, making it invisible. We want to bypass
            // this in scenarios where we're centering popovers on mobile screens.
            $(instance.popper).find(".tippy-box").addClass("show-when-reference-hidden");
            if (popover_props.onShow) {
                popover_props.onShow(instance);
            }
        },
        onMount(instance) {
            $("body").append($("<div>").attr("id", "popover-overlay-background"));
            if (popover_props.onMount) {
                popover_props.onMount(instance);
            }
        },
        onHidden(instance) {
            $("#popover-overlay-background").remove();
            if (popover_props.onHidden) {
                popover_props.onHidden(instance);
            }
        },
    };
}

// Toggles a popover menu directly; intended for use in keyboard
// shortcuts and similar alternative ways to open a popover menu.
export function toggle_popover_menu(target, popover_props, options) {
    const instance = target._tippy;
    if (instance) {
        instance.hide();
        return;
    }

    let mobile_popover_props = {};

    // If the window is mobile-sized, we will render the
    // popover centered on the screen as an overlay.
    if (options?.show_as_overlay_on_mobile && window.innerWidth <= media_breakpoints_num.md) {
        mobile_popover_props = {
            ...get_props_for_popover_centering(popover_props),
        };
    }

    if (popover_props.popperOptions?.modifiers) {
        popover_props.popperOptions.modifiers = [
            ...default_popover_props.popperOptions.modifiers,
            ...popover_props.popperOptions.modifiers,
        ];
    }

    tippy(target, {
        ...default_popover_props,
        showOnCreate: true,
        ...popover_props,
        ...mobile_popover_props,
    });
}

// Main function to define a popover menu, opened via clicking on the
// target selector.
export function register_popover_menu(target, popover_props) {
    // For some elements, such as the click target to open the message
    // actions menu, we want to avoid propagating the click event to
    // parent elements. Tippy's built-in `delegate` method does not
    // have an option to do stopPropagation, so we use this method to
    // open the Tippy popovers associated with such elements.
    //
    // A click on the click target will close the menu; for this to
    // work correctly without leaking, all callers need call
    // `instance.destroy()` inside their `onHidden` handler.
    //
    // TODO: Should we instead we wrap the caller's `onHidden` hook,
    // if any, to add `instance.destroy()`?
    $("body").on("click", target, (e) => {
        e.preventDefault();
        e.stopPropagation();

        toggle_popover_menu(e.currentTarget, popover_props);
    });
}

export function initialize() {
    /* Configure popovers to hide when toggling overlays. */
    overlays.register_pre_open_hook(popovers.hide_all);
    overlays.register_pre_close_hook(popovers.hide_all);
    modals.register_pre_open_hook(popovers.hide_all);
    modals.register_pre_close_hook(popovers.hide_all);
}
