// This module is kind of small, but it will help us keep
// server_events.js simple while breaking some circular
// dependencies that existed when this code was in people.js.
// (We should do bot updates here too.)
import $ from "jquery";

import * as activity_ui from "./activity_ui";
import * as blueslip from "./blueslip";
import {buddy_list} from "./buddy_list";
import * as compose_state from "./compose_state";
import * as message_live_update from "./message_live_update";
import * as narrow_state from "./narrow_state";
import {page_params} from "./page_params";
import * as people from "./people";
import * as pm_list from "./pm_list";
import * as settings from "./settings";
import * as settings_account from "./settings_account";
import * as settings_config from "./settings_config";
import * as settings_linkifiers from "./settings_linkifiers";
import * as settings_org from "./settings_org";
import * as settings_profile_fields from "./settings_profile_fields";
import * as settings_realm_user_settings_defaults from "./settings_realm_user_settings_defaults";
import * as settings_streams from "./settings_streams";
import * as settings_users from "./settings_users";
import * as stream_events from "./stream_events";

export const update_person = function update(person) {
    const person_obj = people.maybe_get_user_by_id(person.user_id);

    if (!person_obj) {
        blueslip.error("Got update_person event for unexpected user", {user_id: person.user_id});
        return;
    }

    if (Object.hasOwn(person, "new_email")) {
        const user_id = person.user_id;
        const new_email = person.new_email;

        narrow_state.update_email(user_id, new_email);
        compose_state.update_email(user_id, new_email);

        if (people.is_my_user_id(person.user_id)) {
            page_params.email = new_email;
        }

        people.update_email(user_id, new_email);
    }

    if (Object.hasOwn(person, "delivery_email")) {
        const delivery_email = person.delivery_email;
        person_obj.delivery_email = delivery_email;
        if (people.is_my_user_id(person.user_id)) {
            settings_account.update_email(delivery_email);
            page_params.delivery_email = delivery_email;
            settings_account.hide_confirm_email_banner();
        }
    }

    if (Object.hasOwn(person, "full_name")) {
        people.set_full_name(person_obj, person.full_name);

        settings_users.update_user_data(person.user_id, person);
        activity_ui.redraw();
        message_live_update.update_user_full_name(person.user_id, person.full_name);
        pm_list.update_private_messages();
        if (people.is_my_user_id(person.user_id)) {
            page_params.full_name = person.full_name;
            settings_account.update_full_name(person.full_name);
        }
    }

    if (Object.hasOwn(person, "role")) {
        person_obj.role = person.role;
        person_obj.is_owner = person.role === settings_config.user_role_values.owner.code;
        person_obj.is_admin =
            person.role === settings_config.user_role_values.admin.code || person_obj.is_owner;
        person_obj.is_guest = person.role === settings_config.user_role_values.guest.code;
        person_obj.is_moderator = person.role === settings_config.user_role_values.moderator.code;
        settings_users.update_user_data(person.user_id, person);

        if (people.is_my_user_id(person.user_id) && page_params.is_owner !== person_obj.is_owner) {
            page_params.is_owner = person_obj.is_owner;
            settings_org.maybe_disable_widgets();
            settings.update_lock_icon_in_sidebar();
        }

        if (people.is_my_user_id(person.user_id) && page_params.is_admin !== person_obj.is_admin) {
            page_params.is_admin = person_obj.is_admin;
            settings_linkifiers.maybe_disable_widgets();
            settings_org.maybe_disable_widgets();
            settings_profile_fields.maybe_disable_widgets();
            settings_streams.maybe_disable_widgets();
            settings_realm_user_settings_defaults.maybe_disable_widgets();
            settings_account.update_account_settings_display();
            settings.update_lock_icon_in_sidebar();
        }

        if (
            people.is_my_user_id(person.user_id) &&
            page_params.is_moderator !== person_obj.is_moderator
        ) {
            page_params.is_moderator = person_obj.is_moderator;
        }
    }

    if (Object.hasOwn(person, "is_billing_admin")) {
        person_obj.is_billing_admin = person.is_billing_admin;
        if (people.is_my_user_id(person.user_id)) {
            page_params.is_billing_admin = person_obj.is_billing_admin;
        }
    }

    if (Object.hasOwn(person, "avatar_url")) {
        const url = person.avatar_url;
        person_obj.avatar_url = url;
        person_obj.avatar_version = person.avatar_version;

        if (people.is_my_user_id(person.user_id)) {
            page_params.avatar_source = person.avatar_source;
            page_params.avatar_url = url;
            page_params.avatar_url_medium = person.avatar_url_medium;
            $("#user-avatar-upload-widget .image-block").attr("src", person.avatar_url_medium);
            $("#personal-menu .header-button-avatar").attr("src", `${person.avatar_url_medium}`);
        }

        message_live_update.update_avatar(person_obj.user_id, person.avatar_url);
    }

    if (Object.hasOwn(person, "custom_profile_field")) {
        people.set_custom_profile_field_data(person.user_id, person.custom_profile_field);
    }

    if (Object.hasOwn(person, "timezone")) {
        person_obj.timezone = person.timezone;
    }

    if (Object.hasOwn(person, "bot_owner_id")) {
        person_obj.bot_owner_id = person.bot_owner_id;
    }

    if (Object.hasOwn(person, "is_active")) {
        if (person.is_active) {
            people.add_active_user(person_obj);
        } else {
            people.deactivate(person_obj);
            stream_events.remove_deactivated_user_from_all_streams(person.user_id);
            settings_users.update_view_on_deactivate(person.user_id);
            buddy_list.maybe_remove_user_id({user_id: person.user_id});
        }
        settings_account.maybe_update_deactivate_account_button();
        if (people.user_is_bot(person.user_id)) {
            settings_users.update_bot_data(person.user_id);
        }
    }
};
