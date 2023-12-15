import $ from "jquery";

import * as compose_actions from "./compose_actions";
import * as compose_recipient from "./compose_recipient";
import * as dropdown_widget from "./dropdown_widget";
import {$t} from "./i18n";
import * as message_lists from "./message_lists";
import * as message_view_header from "./message_view_header";
import * as message_viewport from "./message_viewport";
import * as narrow_state from "./narrow_state";
import * as narrow_title from "./narrow_title";
import * as pm_list from "./pm_list";
import * as resize from "./resize";
import * as search from "./search";
import * as stream_list from "./stream_list";
import * as unread_ui from "./unread_ui";

export const FILTERS = {
    ALL_TOPICS: "all_topics",
    UNMUTED_TOPICS: "unmuted_topics",
    FOLLOWED_TOPICS: "followed_topics",
};

export const COMMON_DROPDOWN_WIDGET_PARAMS = {
    get_options: filters_dropdown_options,
    tippy_props: {
        placement: "bottom-start",
        offset: [0, 2],
    },
    unique_id_type: dropdown_widget.DATA_TYPES.STRING,
    hide_search_box: true,
    bold_current_selection: true,
    disable_for_spectators: true,
};

export function filters_dropdown_options() {
    return [
        {
            unique_id: FILTERS.FOLLOWED_TOPICS,
            name: $t({defaultMessage: "Followed topics"}),
            description: $t({defaultMessage: "Only topics you follow"}),
            bold_current_selection: this.current_value === FILTERS.FOLLOWED_TOPICS,
        },
        {
            unique_id: FILTERS.UNMUTED_TOPICS,
            name: $t({defaultMessage: "Standard view"}),
            description: $t({defaultMessage: "All unmuted topics"}),
            bold_current_selection: this.current_value === FILTERS.UNMUTED_TOPICS,
        },
        {
            unique_id: FILTERS.ALL_TOPICS,
            name: $t({defaultMessage: "All topics"}),
            description: $t({
                defaultMessage: "Includes muted streams and topics",
            }),
            bold_current_selection: this.current_value === FILTERS.ALL_TOPICS,
        },
    ];
}

export function show(opts) {
    if (narrow_state.has_shown_message_list_view) {
        message_lists.save_pre_narrow_offset_for_reload();
    }

    if (opts.is_visible()) {
        // If we're already visible, E.g. because the user hit Esc
        // while already in the view, do nothing.
        return;
    }

    // Hide selected elements in the left sidebar.
    opts.highlight_view_in_left_sidebar();
    stream_list.handle_message_view_deactivated();
    pm_list.handle_message_view_deactivated();

    // Hide "middle-column" which has html for rendering
    // a messages narrow. We hide it and show the view.
    $("#message_feed_container").hide();
    opts.$view.show();
    opts.set_visible(true);

    unread_ui.hide_unread_banner();
    opts.update_compose();
    narrow_state.reset_current_filter();
    narrow_title.update_narrow_title(narrow_state.filter());
    message_view_header.render_title_area();
    compose_recipient.handle_middle_pane_transition();
    search.clear_search_form();
    opts.complete_rerender();
    compose_actions.on_show_navigation_view();

    // Misc.
    if (opts.is_recent_view) {
        resize.update_recent_view_filters_height();
    }
}

export function hide(opts) {
    const $focused_element = $(document.activeElement);
    if (opts.$view.has($focused_element)) {
        $focused_element.trigger("blur");
    }

    $("#message_feed_container").show();
    opts.$view.hide();
    opts.set_visible(false);

    // This solves a bug with message_view_header
    // being broken sometimes when we narrow
    // to a filter and back to view
    // before it completely re-rerenders.
    message_view_header.render_title_area();

    // Fire our custom event
    $("#message_feed_container").trigger("message_feed_shown");

    // This makes sure user lands on the selected message
    // and not always at the top of the narrow.
    message_viewport.plan_scroll_to_selected();
}
