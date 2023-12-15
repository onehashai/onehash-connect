import * as blueslip from "./blueslip";
import * as channel from "./channel";
import {page_params} from "./page_params";

export const ONE_TIME_NOTICES_TO_DISPLAY = new Set();

export function post_onboarding_step_as_read(onboarding_step_name) {
    channel.post({
        url: "/json/users/me/onboarding_steps",
        data: {onboarding_step: onboarding_step_name},
        error(err) {
            if (err.readyState !== 0) {
                blueslip.error("Failed to fetch onboarding steps", {
                    readyState: err.readyState,
                    status: err.status,
                    body: err.responseText,
                });
            }
        },
    });
}

export function filter_new_hotspots(onboarding_steps) {
    return onboarding_steps.filter((onboarding_step) => onboarding_step.type === "hotspot");
}

export function update_notice_to_display(onboarding_steps) {
    ONE_TIME_NOTICES_TO_DISPLAY.clear();

    for (const onboarding_step of onboarding_steps) {
        if (onboarding_step.type === "one_time_notice") {
            ONE_TIME_NOTICES_TO_DISPLAY.add(onboarding_step.name);
        }
    }
}

export function initialize() {
    update_notice_to_display(page_params.onboarding_steps);
}
