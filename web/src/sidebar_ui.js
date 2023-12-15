import $ from "jquery";

import render_left_sidebar from "../templates/left_sidebar.hbs";
import render_right_sidebar from "../templates/right_sidebar.hbs";

import {page_params} from "./page_params";
import * as rendered_markdown from "./rendered_markdown";
import * as resize from "./resize";
import * as settings_config from "./settings_config";
import * as settings_data from "./settings_data";
import * as spectators from "./spectators";
import {user_settings} from "./user_settings";

export let left_sidebar_expanded_as_overlay = false;
export let right_sidebar_expanded_as_overlay = false;

export function hide_userlist_sidebar() {
    $(".app-main .column-right").removeClass("expanded");
    right_sidebar_expanded_as_overlay = false;
}

export function show_userlist_sidebar() {
    $(".app-main .column-right").addClass("expanded");
    resize.resize_page_components();
    right_sidebar_expanded_as_overlay = true;
}

export function show_streamlist_sidebar() {
    $(".app-main .column-left").addClass("expanded");
    resize.resize_stream_filters_container();
    left_sidebar_expanded_as_overlay = true;
}

export function hide_streamlist_sidebar() {
    $(".app-main .column-left").removeClass("expanded");
    left_sidebar_expanded_as_overlay = false;
}

export function any_sidebar_expanded_as_overlay() {
    return left_sidebar_expanded_as_overlay || right_sidebar_expanded_as_overlay;
}

export function update_invite_user_option() {
    if (
        !settings_data.user_can_invite_users_by_email() &&
        !settings_data.user_can_create_multiuse_invite()
    ) {
        $("#right-sidebar .invite-user-link").hide();
    } else {
        $("#right-sidebar .invite-user-link").show();
    }
}

export function hide_all() {
    hide_streamlist_sidebar();
    hide_userlist_sidebar();
}

export function initialize() {
    $("body").on("click", ".login_button", (e) => {
        e.preventDefault();
        e.stopPropagation();
        window.location.href = spectators.build_login_link();
    });

    $("#userlist-toggle-button").on("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (right_sidebar_expanded_as_overlay) {
            hide_userlist_sidebar();
            return;
        }
        show_userlist_sidebar();
    });

    $("#streamlist-toggle-button").on("click", (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (left_sidebar_expanded_as_overlay) {
            hide_streamlist_sidebar();
            return;
        }
        show_streamlist_sidebar();
    });

    // Hide left / right sidebar on click outside.
    document.addEventListener(
        "click",
        (e) => {
            if (!(left_sidebar_expanded_as_overlay || right_sidebar_expanded_as_overlay)) {
                return;
            }

            const $elt = $(e.target);
            // Since sidebar toggle buttons have their own click handlers, don't handle them here.
            if (
                $elt.closest("#streamlist-toggle-button").length ||
                $elt.closest("#userlist-toggle-button").length
            ) {
                return;
            }

            // Overrides for certain elements that should not close the sidebars.
            if ($elt.closest(".no-auto-hide-sidebar-overlays").length) {
                return;
            }

            if (
                left_sidebar_expanded_as_overlay &&
                !$elt.closest(".no-auto-hide-left-sidebar-overlay").length
            ) {
                const $left_column = $(".app-main .column-left");
                const click_outside_left_sidebar = !$elt.closest($left_column).length;
                if (click_outside_left_sidebar) {
                    hide_streamlist_sidebar();
                }
            }

            if (
                right_sidebar_expanded_as_overlay &&
                !$elt.closest(".no-auto-hide-right-sidebar-overlay").length
            ) {
                const $right_column = $(".app-main .column-right");
                const click_outside_right_sidebar = !$elt.closest($right_column).length;

                if (click_outside_right_sidebar) {
                    hide_userlist_sidebar();
                }
            }
        },
        {capture: true},
    );
}

export function initialize_left_sidebar() {
    const rendered_sidebar = render_left_sidebar({
        is_guest: page_params.is_guest,
        development_environment: page_params.development_environment,
        is_inbox_home_view:
            user_settings.web_home_view === settings_config.web_home_view_values.inbox.code,
        is_all_messages_home_view:
            user_settings.web_home_view === settings_config.web_home_view_values.all_messages.code,
        is_recent_view_home_view:
            user_settings.web_home_view === settings_config.web_home_view_values.recent_topics.code,
        hide_unread_counts: settings_data.should_mask_unread_count(),
    });

    $("#left-sidebar-container").html(rendered_sidebar);
}

export function initialize_right_sidebar() {
    const rendered_sidebar = render_right_sidebar({
        realm_rendered_description: page_params.realm_rendered_description,
    });

    $("#right-sidebar-container").html(rendered_sidebar);
    update_invite_user_option();
    if (page_params.is_spectator) {
        rendered_markdown.update_elements(
            $(".right-sidebar .realm-description .rendered_markdown"),
        );
    }

    $("#buddy-list-users-matching-view").on("mouseenter", ".user_sidebar_entry", (e) => {
        const $status_emoji = $(e.target).closest(".user_sidebar_entry").find("img.status-emoji");
        if ($status_emoji.length) {
            const animated_url = $status_emoji.data("animated-url");
            if (animated_url) {
                $status_emoji.attr("src", animated_url);
            }
        }
    });

    $("#buddy-list-users-matching-view").on("mouseleave", ".user_sidebar_entry", (e) => {
        const $status_emoji = $(e.target).closest(".user_sidebar_entry").find("img.status-emoji");
        if ($status_emoji.length) {
            const still_url = $status_emoji.data("still-url");
            if (still_url) {
                $status_emoji.attr("src", still_url);
            }
        }
    });
}
