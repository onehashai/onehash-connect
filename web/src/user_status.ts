import {z} from "zod";

import * as channel from "./channel";
import * as emoji from "./emoji";
import type {EmojiRenderingDetails} from "./emoji";
import {user_settings} from "./user_settings";

export type UserStatus = z.infer<typeof user_status_schema>;
export type UserStatusEmojiInfo = EmojiRenderingDetails & {
    emoji_alt_code?: boolean;
};

export type UserStatusEvent = z.infer<typeof user_status_event_schema>;

const user_status_event_schema = z.object({
    id: z.number(),
    type: z.literal("user_status"),
    user_id: z.number(),
    away: z.boolean().optional(),
    status_text: z.string(),
    emoji_name: z.string(),
    emoji_code: z.string(),
    reaction_type: z.string(),
});

const user_status_schema = z.union([
    z.object({
        status_text: z.string().optional(),
        emoji_name: z.string(),
        emoji_code: z.string(),
        reaction_type: z.string(),
        away: z.boolean().optional(),
    }),
    z.object({
        emoji_name: z.undefined(),
        status_text: z.string().optional(),
        away: z.boolean().optional(),
    }),
]);

const user_status_param_schema = z.record(z.string(), user_status_schema);

const user_info = new Map<number, string>();
const user_status_emoji_info = new Map<number, UserStatusEmojiInfo>();

export function server_update_status(opts: {
    status_text: string;
    emoji_name: string;
    emoji_code: string;
    reaction_type?: string;
    success?: () => void;
}): void {
    void channel.post({
        url: "/json/users/me/status",
        data: {
            status_text: opts.status_text,
            emoji_name: opts.emoji_name,
            emoji_code: opts.emoji_code,
            reaction_type: opts.reaction_type,
        },
        success() {
            if (opts.success) {
                opts.success();
            }
        },
    });
}

export function server_invisible_mode_on(): void {
    void channel.patch({
        url: "/json/settings",
        data: {
            presence_enabled: false,
        },
    });
}

export function server_invisible_mode_off(): void {
    void channel.patch({
        url: "/json/settings",
        data: {
            presence_enabled: true,
        },
    });
}

export function get_status_text(user_id: number): string | undefined {
    return user_info.get(user_id);
}

export function set_status_text(opts: {user_id: number; status_text: string}): void {
    if (!opts.status_text) {
        user_info.delete(opts.user_id);
        return;
    }

    user_info.set(opts.user_id, opts.status_text);
}

export function get_status_emoji(user_id: number): UserStatusEmojiInfo | undefined {
    return user_status_emoji_info.get(user_id);
}

export function set_status_emoji(event: UserStatusEvent): void {
    const opts = user_status_event_schema.parse(event);

    if (!opts.emoji_name) {
        user_status_emoji_info.delete(opts.user_id);
        return;
    }

    user_status_emoji_info.set(opts.user_id, {
        emoji_alt_code: user_settings.emojiset === "text",
        ...emoji.get_emoji_details_for_rendering({
            emoji_name: opts.emoji_name,
            emoji_code: opts.emoji_code,
            reaction_type: opts.reaction_type,
        }),
    });
}

export function initialize(params: {user_status: unknown}): void {
    user_info.clear();

    const user_status = user_status_param_schema.parse(params.user_status);

    for (const [str_user_id, dct] of Object.entries(user_status)) {
        // JSON does not allow integer keys, so we
        // convert them here.
        const user_id = Number.parseInt(str_user_id, 10);

        if (dct.status_text) {
            user_info.set(user_id, dct.status_text);
        }

        if (dct.emoji_name) {
            user_status_emoji_info.set(user_id, {
                ...emoji.get_emoji_details_for_rendering(dct),
            });
        }
    }
}
