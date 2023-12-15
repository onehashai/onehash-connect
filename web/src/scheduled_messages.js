import * as channel from "./channel";
import {$t} from "./i18n";
import * as timerender from "./timerender";

export const MINIMUM_SCHEDULED_MESSAGE_DELAY_SECONDS = 5 * 60;

// scheduled_messages_data is a dictionary where key=scheduled_message_id and value=scheduled_messages
export const scheduled_messages_data = {};

let selected_send_later_timestamp;

function compute_send_times(now = new Date()) {
    const send_times = {};

    const today = new Date(now);
    const tomorrow = new Date(new Date(now).setDate(now.getDate() + 1));
    // Find the next Monday by subtracting the current day (0-6) from 8
    const monday = new Date(new Date(now).setDate(now.getDate() + 8 - now.getDay()));

    // Since setHours returns a timestamp, it's safe to mutate the
    // original date objects here.
    //
    // today at 9am
    send_times.today_nine_am = today.setHours(9, 0, 0, 0);
    // today at 4pm
    send_times.today_four_pm = today.setHours(16, 0, 0, 0);
    // tomorrow at 9am
    send_times.tomorrow_nine_am = tomorrow.setHours(9, 0, 0, 0);
    // tomorrow at 4pm
    send_times.tomorrow_four_pm = tomorrow.setHours(16, 0, 0, 0);
    // next Monday at 9am
    send_times.monday_nine_am = monday.setHours(9, 0, 0, 0);
    return send_times;
}

export function add_scheduled_messages(scheduled_messages) {
    for (const scheduled_message of scheduled_messages) {
        scheduled_messages_data[scheduled_message.scheduled_message_id] = scheduled_message;
    }
}

export function remove_scheduled_message(scheduled_message_id) {
    if (scheduled_messages_data[scheduled_message_id] !== undefined) {
        delete scheduled_messages_data[scheduled_message_id];
    }
}

export function update_scheduled_message(scheduled_message) {
    if (scheduled_messages_data[scheduled_message.scheduled_message_id] === undefined) {
        return;
    }

    scheduled_messages_data[scheduled_message.scheduled_message_id] = scheduled_message;
}

export function delete_scheduled_message(scheduled_msg_id, success = () => {}) {
    channel.del({
        url: "/json/scheduled_messages/" + scheduled_msg_id,
        success,
    });
}

export function get_count() {
    return Object.keys(scheduled_messages_data).length;
}

export function get_filtered_send_opts(date) {
    const send_times = compute_send_times(date);

    const day = date.getDay(); // Starts with 0 for Sunday.

    const send_later_today = {
        today_nine_am: {
            text: $t(
                {defaultMessage: "Today at {time}"},
                {
                    time: timerender.get_localized_date_or_time_for_format(
                        send_times.today_nine_am,
                        "time",
                    ),
                },
            ),
            stamp: send_times.today_nine_am,
        },
        today_four_pm: {
            text: $t(
                {defaultMessage: "Today at {time}"},
                {
                    time: timerender.get_localized_date_or_time_for_format(
                        send_times.today_four_pm,
                        "time",
                    ),
                },
            ),
            stamp: send_times.today_four_pm,
        },
    };

    const send_later_tomorrow = {
        tomorrow_nine_am: {
            text: $t(
                {defaultMessage: "Tomorrow at {time}"},
                {
                    time: timerender.get_localized_date_or_time_for_format(
                        send_times.tomorrow_nine_am,
                        "time",
                    ),
                },
            ),
            stamp: send_times.tomorrow_nine_am,
        },
        tomorrow_four_pm: {
            text: $t(
                {defaultMessage: "Tomorrow at {time}"},
                {
                    time: timerender.get_localized_date_or_time_for_format(
                        send_times.tomorrow_four_pm,
                        "time",
                    ),
                },
            ),
            stamp: send_times.tomorrow_four_pm,
        },
    };

    const send_later_monday = {
        monday_nine_am: {
            text: $t(
                {defaultMessage: "Monday at {time}"},
                {
                    time: timerender.get_localized_date_or_time_for_format(
                        send_times.monday_nine_am,
                        "time",
                    ),
                },
            ),
            stamp: send_times.monday_nine_am,
        },
    };

    const send_later_custom = {
        text: $t({defaultMessage: "Custom"}),
    };

    let possible_send_later_today = {};
    let possible_send_later_monday = {};

    const minutes_into_day = date.getHours() * 60 + date.getMinutes();
    // Show Today send options based on time of day
    if (minutes_into_day < 9 * 60 - MINIMUM_SCHEDULED_MESSAGE_DELAY_SECONDS / 60) {
        // Allow Today at 9:00am only up to minimum scheduled message delay
        possible_send_later_today = send_later_today;
    } else if (minutes_into_day < (12 + 4) * 60 - MINIMUM_SCHEDULED_MESSAGE_DELAY_SECONDS / 60) {
        // Allow Today at 4:00pm only up to minimum scheduled message delay
        possible_send_later_today.today_four_pm = send_later_today.today_four_pm;
    } else {
        possible_send_later_today = false;
    }
    // Show send_later_monday options only on Fridays and Saturdays.
    if (day >= 5) {
        possible_send_later_monday = send_later_monday;
    } else {
        possible_send_later_monday = false;
    }

    return {
        possible_send_later_today,
        send_later_tomorrow,
        possible_send_later_monday,
        send_later_custom,
    };
}

export function get_selected_send_later_timestamp() {
    if (!selected_send_later_timestamp) {
        return undefined;
    }
    return selected_send_later_timestamp;
}

export function get_formatted_selected_send_later_time() {
    if (!selected_send_later_timestamp) {
        return undefined;
    }
    return timerender.get_full_datetime(new Date(selected_send_later_timestamp * 1000), "time");
}

export function set_selected_schedule_timestamp(timestamp) {
    selected_send_later_timestamp = timestamp;
}

export function reset_selected_schedule_timestamp() {
    selected_send_later_timestamp = undefined;
}

export function initialize(scheduled_messages_params) {
    add_scheduled_messages(scheduled_messages_params.scheduled_messages);
}
