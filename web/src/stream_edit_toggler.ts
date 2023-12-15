import $ from "jquery";

import * as browser_history from "./browser_history";
import * as components from "./components";
import * as hash_util from "./hash_util";
import {$t} from "./i18n";
import * as sub_store from "./sub_store";
import type {StreamSubscription} from "./sub_store";

export let toggler: components.Toggle;
export let select_tab = "personal";

export function setup_subscriptions_stream_hash(
    sub: StreamSubscription,
    right_side_tab: string,
): void {
    const hash = hash_util.stream_edit_url(sub, right_side_tab);
    browser_history.update(hash);
}

export function setup_toggler(): void {
    toggler = components.toggle({
        child_wants_focus: true,
        values: [
            {label: $t({defaultMessage: "General"}), key: "general"},
            {label: $t({defaultMessage: "Personal"}), key: "personal"},
            {label: $t({defaultMessage: "Subscribers"}), key: "subscribers"},
        ],
        callback(_name, key) {
            $(".stream_section").hide();
            $(`[data-stream-section="${CSS.escape(key)}"]`).show();
            select_tab = key;
            const $stream_header = $("#streams_overlay_container .stream_settings_header");
            const stream_id = Number.parseInt($stream_header.attr("data-stream-id") ?? "", 10);
            const sub = sub_store.get(stream_id);
            if (sub) {
                setup_subscriptions_stream_hash(sub, select_tab);
            }
        },
    });
}
