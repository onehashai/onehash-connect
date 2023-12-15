import $ from "jquery";
import type {ReferenceElement} from "tippy.js";
import tippy from "tippy.js";

import {$t} from "./i18n";

export const status_classes = "alert-error alert-success alert-info alert-warning alert-loading";

export function phrase_match(query: string, phrase: string): boolean {
    // match "tes" to "test" and "stream test" but not "hostess"
    let i;
    query = query.toLowerCase();

    phrase = phrase.toLowerCase();
    if (phrase.startsWith(query)) {
        return true;
    }

    const parts = phrase.split(" ");
    for (i = 0; i < parts.length; i += 1) {
        if (parts[i].startsWith(query)) {
            return true;
        }
    }
    return false;
}

export function copy_data_attribute_value($elem: JQuery, key: string): void {
    // function to copy the value of data-key
    // attribute of the element to clipboard
    const $temp = $(document.createElement("input"));
    $("body").append($temp);
    $temp.val($elem.data(key)).trigger("select");
    document.execCommand("copy");
    $temp.remove();
    $elem.fadeOut(250);
    $elem.fadeIn(1000);
}

const keys_map = new Map([
    ["Backspace", "Delete"],
    ["Enter", "Return"],
    ["Home", "←"],
    ["End", "→"],
    ["PgUp", "↑"],
    ["PgDn", "↓"],
    ["Ctrl", "⌘"],
    ["Alt", "⌘"],
]);

const fn_shortcuts = new Set(["Home", "End", "PgUp", "PgDn"]);

export function has_mac_keyboard(): boolean {
    return /mac/i.test(navigator.platform);
}

// We convert the <kbd> tags used for keyboard shortcuts to mac equivalent
// key combinations, when we detect that the user is using a mac-style keyboard.
export function adjust_mac_kbd_tags(kbd_elem_class: string): void {
    if (!has_mac_keyboard()) {
        return;
    }

    $(kbd_elem_class).each(function () {
        let key_text = $(this).text();

        if (fn_shortcuts.has(key_text)) {
            $(this).before("<kbd>Fn</kbd> + ");
            $(this).addClass("arrow-key");
        }

        const replace_key = keys_map.get(key_text);
        if (replace_key !== undefined) {
            key_text = replace_key;
        }

        $(this).text(key_text);
    });
}

// We convert the hotkey hints used in the tooltips to mac equivalent
// key combinations, when we detect that the user is using a mac-style keyboard.
export function adjust_mac_tooltip_keys(hotkeys: string[]): void {
    if (!has_mac_keyboard()) {
        return;
    }

    for (const [index, hotkey] of hotkeys.entries()) {
        const replace_key = keys_map.get(hotkey);

        if (replace_key !== undefined) {
            hotkeys[index] = replace_key;
        }

        if (fn_shortcuts.has(hotkey)) {
            hotkeys.unshift("Fn");
        }
    }
}

// See https://zulip.readthedocs.io/en/latest/development/authentication.html#password-form-implementation
// for design details on this feature.
function set_password_toggle_label(
    password_selector: string,
    label: string,
    tippy_tooltips: boolean,
): void {
    $(password_selector).attr("aria-label", label);
    if (tippy_tooltips) {
        const element: ReferenceElement = $(password_selector)[0];
        const tippy_instance = element._tippy ?? tippy(element);
        tippy_instance.setContent(label);
    } else {
        $(password_selector).attr("title", label);
    }
}

function toggle_password_visibility(
    password_field_id: string,
    password_selector: string,
    tippy_tooltips: boolean,
): void {
    let label;
    const $password_field = $(password_field_id);

    if ($password_field.attr("type") === "password") {
        $password_field.attr("type", "text");
        $(password_selector).removeClass("fa-eye-slash").addClass("fa-eye");
        label = $t({defaultMessage: "Hide password"});
    } else {
        $password_field.attr("type", "password");
        $(password_selector).removeClass("fa-eye").addClass("fa-eye-slash");
        label = $t({defaultMessage: "Show password"});
    }
    set_password_toggle_label(password_selector, label, tippy_tooltips);
}

export function reset_password_toggle_icons(
    password_field: string,
    password_selector: string,
): void {
    $(password_field).attr("type", "password");
    $(password_selector).removeClass("fa-eye").addClass("fa-eye-slash");
    const label = $t({defaultMessage: "Show password"});
    set_password_toggle_label(password_selector, label, true);
}

export function setup_password_visibility_toggle(
    password_field_id: string,
    password_selector: string,
    {tippy_tooltips = false} = {},
): void {
    const label = $t({defaultMessage: "Show password"});
    set_password_toggle_label(password_selector, label, tippy_tooltips);
    $(password_selector).on("click", (e) => {
        e.preventDefault();
        e.stopPropagation();
        toggle_password_visibility(password_field_id, password_selector, tippy_tooltips);
    });
}
