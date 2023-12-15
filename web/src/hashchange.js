import $ from "jquery";

import * as about_zulip from "./about_zulip";
import * as admin from "./admin";
import * as blueslip from "./blueslip";
import * as browser_history from "./browser_history";
import * as drafts_overlay_ui from "./drafts_overlay_ui";
import * as hash_parser from "./hash_parser";
import * as hash_util from "./hash_util";
import {$t_html} from "./i18n";
import * as inbox_ui from "./inbox_ui";
import * as inbox_util from "./inbox_util";
import * as info_overlay from "./info_overlay";
import * as message_lists from "./message_lists";
import * as message_viewport from "./message_viewport";
import * as modals from "./modals";
import * as narrow from "./narrow";
import * as overlays from "./overlays";
import {page_params} from "./page_params";
import * as popovers from "./popovers";
import * as recent_view_ui from "./recent_view_ui";
import * as recent_view_util from "./recent_view_util";
import * as scheduled_messages_overlay_ui from "./scheduled_messages_overlay_ui";
import * as settings from "./settings";
import * as settings_panel_menu from "./settings_panel_menu";
import * as settings_toggle from "./settings_toggle";
import * as sidebar_ui from "./sidebar_ui";
import * as spectators from "./spectators";
import * as stream_settings_ui from "./stream_settings_ui";
import * as ui_report from "./ui_report";
import * as user_group_edit from "./user_group_edit";
import {user_settings} from "./user_settings";

// Read https://zulip.readthedocs.io/en/latest/subsystems/hashchange-system.html
// or locally: docs/subsystems/hashchange-system.md

function maybe_hide_recent_view() {
    if (recent_view_util.is_visible()) {
        recent_view_ui.hide();
        return true;
    }
    return false;
}

function maybe_hide_inbox() {
    if (inbox_util.is_visible()) {
        inbox_ui.hide();
        return true;
    }
    return false;
}

function show_all_message_view() {
    narrow.deactivate();
}

export function set_hash_to_home_view() {
    let home_view_hash = `#${user_settings.web_home_view}`;
    if (home_view_hash === "#recent_topics") {
        home_view_hash = "#recent";
    }

    if (window.location.hash !== home_view_hash) {
        // We want to set URL with no hash here. It is not possible
        // to do so with `window.location.hash` since it will set an empty
        // hash. So, we use `pushState` which simply updates the current URL
        // but doesn't trigger `hashchange`. So, we trigger hashchange directly
        // here to let it handle the whole rendering process for us.
        browser_history.set_hash("");
        hashchanged(false);
    }
}

function show_home_view() {
    // This function should only be called from the hashchange
    // handlers, as it does not set the hash to "".
    //
    // We only allow the primary recommended options for home views
    // rendered without a hash.
    switch (user_settings.web_home_view) {
        case "recent_topics": {
            maybe_hide_inbox();
            recent_view_ui.show();
            break;
        }
        case "all_messages": {
            // Hides inbox/recent views internally if open.
            show_all_message_view();
            break;
        }
        case "inbox": {
            maybe_hide_recent_view();
            inbox_ui.show();
            break;
        }
        default: {
            // NOTE: Setting a hash which is not rendered on
            // empty hash (like a stream narrow) will
            // introduce a bug that user will not be able to
            // go back in browser history. See
            // https://chat.zulip.org/#narrow/stream/9-issues/topic/Browser.20back.20button.20on.20RT
            // for detailed description of the issue.
            window.location.hash = user_settings.web_home_view;
        }
    }
}

// Returns true if this function performed a narrow
function do_hashchange_normal(from_reload) {
    message_viewport.stop_auto_scrolling();

    // NB: In Firefox, window.location.hash is URI-decoded.
    // Even if the URL bar says #%41%42%43%44, the value here will
    // be #ABCD.
    const hash = window.location.hash.split("/");

    switch (hash[0]) {
        case "#narrow": {
            let operators;
            try {
                // TODO: Show possible valid URLs to the user.
                operators = hash_util.parse_narrow(hash);
            } catch {
                ui_report.error(
                    $t_html({defaultMessage: "Invalid URL"}),
                    undefined,
                    $("#home-error"),
                    2000,
                );
            }
            if (operators === undefined) {
                // If the narrow URL didn't parse,
                // send them to web_home_view.
                // We cannot clear hash here since
                // it will block user from going back
                // in browser history.
                show_home_view();
                return false;
            }
            const narrow_opts = {
                change_hash: false, // already set
                trigger: "hash change",
            };
            if (from_reload) {
                blueslip.debug("We are narrowing as part of a reload.");
                if (page_params.initial_narrow_pointer !== undefined) {
                    message_lists.home.pre_narrow_offset = page_params.initial_offset;
                    narrow_opts.then_select_id = page_params.initial_narrow_pointer;
                    narrow_opts.then_select_offset = page_params.initial_narrow_offset;
                }
            }

            const location_data_for_hash = history.state;
            if (location_data_for_hash) {
                narrow_opts.then_select_id = location_data_for_hash.narrow_pointer;
                narrow_opts.then_select_offset = location_data_for_hash.narrow_offset;
            }
            narrow.activate(operators, narrow_opts);
            return true;
        }
        case "":
        case "#":
            show_home_view();
            break;
        case "#recent_topics":
            // The URL for Recent Conversations was changed from
            // #recent_topics to #recent in 2022. Because pre-change
            // Welcome Bot messages included links to this URL, we
            // need to support the "#recent_topics" hash as an alias
            // for #recent permanently. We show the view and then
            // replace the current URL hash in a way designed to hide
            // this detail in the browser's forward/back session history.
            recent_view_ui.show();
            window.location.replace("#recent");
            break;
        case "#recent":
            maybe_hide_inbox();
            recent_view_ui.show();
            break;
        case "#inbox":
            maybe_hide_recent_view();
            inbox_ui.show();
            break;
        case "#all_messages":
            show_all_message_view();
            break;
        case "#keyboard-shortcuts":
        case "#message-formatting":
        case "#search-operators":
        case "#drafts":
        case "#invite":
        case "#streams":
        case "#organization":
        case "#settings":
        case "#about-zulip":
        case "#scheduled":
            blueslip.error("overlay logic skipped for: " + hash);
            break;
        default:
            show_home_view();
    }
    return false;
}

function do_hashchange_overlay(old_hash) {
    if (old_hash === undefined) {
        // The user opened the app with an overlay hash; we need to
        // show the user's home view behind it.
        show_home_view();
    }
    const base = hash_parser.get_current_hash_category();
    const old_base = hash_parser.get_hash_category(old_hash);
    let section = hash_parser.get_current_hash_section();

    if (base === "groups" && page_params.is_guest) {
        // The #groups settings page is unfinished, and disabled in production.
        show_home_view();
        return;
    }

    const coming_from_overlay = hash_parser.is_overlay_hash(old_hash);
    if (section === "display-settings") {
        // Since display-settings was deprecated and replaced with preferences
        // #settings/display-settings is being redirected to #settings/preferences.
        section = "preferences";
    }
    if ((base === "settings" || base === "organization") && !section) {
        let settings_panel_object = settings_panel_menu.normal_settings;
        if (base === "organization") {
            settings_panel_object = settings_panel_menu.org_settings;
        }
        history.replaceState(
            null,
            "",
            browser_history.get_full_url(base + "/" + settings_panel_object.current_tab()),
        );
    }

    if (base === "streams" && !section) {
        history.replaceState(null, "", browser_history.get_full_url("streams/subscribed"));
    }

    // Start by handling the specific case of going
    // from something like streams/all to streams_subscribed.
    //
    // In most situations we skip by this logic and load
    // the new overlay.
    if (coming_from_overlay && base === old_base) {
        if (base === "streams") {
            // e.g. #streams/29/social/subscribers
            const right_side_tab = hash_parser.get_current_nth_hash_section(4);
            stream_settings_ui.change_state(section, right_side_tab);
            return;
        }

        if (base === "groups") {
            user_group_edit.change_state(section);
        }

        if (base === "settings") {
            if (!section) {
                // We may be on a really old browser or somebody
                // hand-typed a hash.
                blueslip.warn("missing section for settings");
            }
            settings_panel_menu.normal_settings.activate_section_or_default(section);
            return;
        }

        if (base === "organization") {
            if (!section) {
                // We may be on a really old browser or somebody
                // hand-typed a hash.
                blueslip.warn("missing section for organization");
            }
            settings_panel_menu.org_settings.activate_section_or_default(section);
            return;
        }

        // TODO: handle other cases like internal settings
        //       changes.
        return;
    }

    // This is a special case when user clicks on a URL that makes the overlay switch
    // from org settings to user settings or user edits the URL to switch between them.
    const settings_hashes = new Set(["settings", "organization"]);
    // Ensure that we are just switching between user and org settings and the settings
    // overlay is open.
    const is_hashchange_internal =
        settings_hashes.has(base) && settings_hashes.has(old_base) && overlays.settings_open();
    if (is_hashchange_internal) {
        if (base === "settings") {
            settings_panel_menu.normal_settings.activate_section_or_default(section);
        } else {
            settings_panel_menu.org_settings.activate_section_or_default(section);
        }
        settings_toggle.highlight_toggle(base);
        return;
    }

    // It's not super likely that an overlay is already open,
    // but you can jump from /settings to /streams by using
    // the browser's history menu or hand-editing the URL or
    // whatever.  If so, just close the overlays.
    if (base !== old_base) {
        overlays.close_for_hash_change();
    }

    // NORMAL FLOW: basically, launch the overlay:

    if (!coming_from_overlay) {
        browser_history.set_hash_before_overlay(old_hash);
    }

    if (base === "streams") {
        // e.g. #streams/29/social/subscribers
        const right_side_tab = hash_parser.get_current_nth_hash_section(4);
        stream_settings_ui.launch(section, right_side_tab);
        return;
    }

    if (base === "groups") {
        user_group_edit.launch(section);
        return;
    }

    if (base === "drafts") {
        drafts_overlay_ui.launch();
        return;
    }

    if (base === "settings") {
        settings.build_page();
        admin.build_page();
        settings.launch(section);
        return;
    }

    if (base === "organization") {
        settings.build_page();
        admin.build_page();
        admin.launch(section);
        return;
    }

    if (base === "keyboard-shortcuts") {
        info_overlay.show("keyboard-shortcuts");
        return;
    }

    if (base === "message-formatting") {
        info_overlay.show("message-formatting");
        return;
    }

    if (base === "search-operators") {
        info_overlay.show("search-operators");
        return;
    }

    if (base === "about-zulip") {
        about_zulip.launch();
    }

    if (base === "scheduled") {
        scheduled_messages_overlay_ui.launch();
    }
}

function hashchanged(from_reload, e) {
    const current_hash = window.location.hash;
    const old_hash = e && (e.oldURL ? new URL(e.oldURL).hash : browser_history.old_hash());
    const is_hash_web_public_compatible = browser_history.update_web_public_hash(current_hash);

    const was_internal_change = browser_history.save_old_hash();
    if (was_internal_change) {
        return undefined;
    }

    // TODO: Migrate the `#reload` syntax to use slashes as separators
    // so that this can be part of the main switch statement.
    if (window.location.hash.startsWith("#reload")) {
        // We don't want to change narrow if app is undergoing reload.
        return undefined;
    }

    if (page_params.is_spectator && !is_hash_web_public_compatible) {
        spectators.login_to_access();
        return undefined;
    }

    if (hash_parser.is_overlay_hash(current_hash)) {
        browser_history.state.changing_hash = true;
        do_hashchange_overlay(old_hash);
        browser_history.state.changing_hash = false;
        return undefined;
    }

    // We are changing to a "main screen" view.
    overlays.close_for_hash_change();
    sidebar_ui.hide_all();
    popovers.hide_all();
    modals.close_active_if_any();
    browser_history.state.changing_hash = true;
    const ret = do_hashchange_normal(from_reload);
    browser_history.state.changing_hash = false;
    return ret;
}

export function initialize() {
    // We don't want browser to restore the scroll
    // position of the new hash in the current hash.
    window.history.scrollRestoration = "manual";

    $(window).on("hashchange", (e) => {
        hashchanged(false, e.originalEvent);
    });
    hashchanged(true);
}
