"use strict";

const {strict: assert} = require("assert");

const {zrequire} = require("./lib/namespace");
const {run_test} = require("./lib/test");

const hash_parser = zrequire("hash_parser");
const hash_util = zrequire("hash_util");
const stream_data = zrequire("stream_data");
const people = zrequire("people");
const spectators = zrequire("spectators");

const hamlet = {
    user_id: 15,
    email: "hamlet@example.com",
    full_name: "Hamlet",
};

people.add_active_user(hamlet);

const frontend = {
    stream_id: 99,
    name: "frontend",
};

stream_data.add_sub(frontend);

run_test("hash_util", () => {
    // Test encode_operand and decode_operand
    function encode_decode_operand(operator, operand, expected_val) {
        const encode_result = hash_util.encode_operand(operator, operand);
        assert.equal(encode_result, expected_val);
        const new_operand = encode_result;
        const decode_result = hash_util.decode_operand(operator, new_operand);
        assert.equal(decode_result, operand);
    }

    let operator = "sender";
    let operand = hamlet.email;

    encode_decode_operand(operator, operand, "15-Hamlet");

    operator = "stream";
    operand = "frontend";

    encode_decode_operand(operator, operand, "99-frontend");

    operator = "topic";
    operand = "testing 123";

    encode_decode_operand(operator, operand, "testing.20123");
});

run_test("test_get_hash_category", () => {
    assert.deepEqual(hash_parser.get_hash_category("streams/subscribed"), "streams");
    assert.deepEqual(hash_parser.get_hash_category("#settings/preferences"), "settings");
    assert.deepEqual(hash_parser.get_hash_category("#drafts"), "drafts");
    assert.deepEqual(hash_parser.get_hash_category("invites"), "invites");

    window.location.hash = "#settings/profile";
    assert.deepEqual(hash_parser.get_current_hash_category(), "settings");
});

run_test("test_get_hash_section", () => {
    assert.equal(hash_parser.get_hash_section("streams/subscribed"), "subscribed");
    assert.equal(hash_parser.get_hash_section("#settings/profile"), "profile");

    assert.equal(hash_parser.get_hash_section("settings/10/general/"), "10");

    assert.equal(hash_parser.get_hash_section("#drafts"), "");
    assert.equal(hash_parser.get_hash_section(""), "");

    window.location.hash = "#settings/profile";
    assert.deepEqual(hash_parser.get_current_hash_section(), "profile");
});

run_test("get_current_nth_hash_section", () => {
    window.location.hash = "#settings/profile";
    assert.equal(hash_parser.get_current_nth_hash_section(1), "#settings");
    assert.equal(hash_parser.get_current_nth_hash_section(2), "profile");

    window.location.hash = "#settings/10/general";
    assert.equal(hash_parser.get_current_nth_hash_section(1), "#settings");
    assert.equal(hash_parser.get_current_nth_hash_section(2), "10");
    assert.equal(hash_parser.get_current_nth_hash_section(3), "general");
    assert.equal(hash_parser.get_current_nth_hash_section(4), "");
});

run_test("build_reload_url", () => {
    window.location.hash = "#settings/profile";
    assert.equal(hash_util.build_reload_url(), "+oldhash=settings%2Fprofile");

    window.location.hash = "#test";
    assert.equal(hash_util.build_reload_url(), "+oldhash=test");

    window.location.hash = "#";
    assert.equal(hash_util.build_reload_url(), "+oldhash=");

    window.location.hash = "";
    assert.equal(hash_util.build_reload_url(), "+oldhash=");
});

run_test("test is_editing_stream", () => {
    window.location.hash = "#streams/1/announce";
    assert.equal(hash_parser.is_editing_stream(1), true);
    assert.equal(hash_parser.is_editing_stream(2), false);

    // url is missing name at end
    window.location.hash = "#streams/1";
    assert.equal(hash_parser.is_editing_stream(1), false);

    window.location.hash = "#streams/bogus/bogus";
    assert.equal(hash_parser.is_editing_stream(1), false);

    window.location.hash = "#test/narrow";
    assert.equal(hash_parser.is_editing_stream(1), false);
});

run_test("test_is_create_new_stream_narrow", () => {
    window.location.hash = "#streams/new";
    assert.equal(hash_parser.is_create_new_stream_narrow(), true);

    window.location.hash = "#some/random/hash";
    assert.equal(hash_parser.is_create_new_stream_narrow(), false);
});

run_test("test_parse_narrow", () => {
    assert.deepEqual(hash_util.parse_narrow(["narrow", "stream", "99-frontend"]), [
        {negated: false, operator: "stream", operand: "frontend"},
    ]);

    assert.deepEqual(hash_util.parse_narrow(["narrow", "-stream", "99-frontend"]), [
        {negated: true, operator: "stream", operand: "frontend"},
    ]);

    assert.equal(hash_util.parse_narrow(["narrow", "BOGUS"]), undefined);

    // For nonexistent streams, we get the full slug.
    // We possibly should remove the prefix and fix this test.
    assert.deepEqual(hash_util.parse_narrow(["narrow", "stream", "42-bogus"]), [
        {negated: false, operator: "stream", operand: "42-bogus"},
    ]);
});

run_test("test_stream_edit_url", () => {
    const sub = {
        name: "research & development",
        stream_id: 42,
    };
    assert.equal(
        hash_util.stream_edit_url(sub, "general"),
        "#streams/42/research.20.26.20development/general",
    );
});

run_test("test_by_conversation_and_time_url", () => {
    let message = {
        type: "stream",
        stream_id: frontend.stream_id,
        topic: "testing",
        id: 42,
    };

    assert.equal(
        hash_util.by_conversation_and_time_url(message),
        "http://zulip.zulipdev.com/#narrow/stream/99-frontend/topic/testing/near/42",
    );

    message = {
        type: "private",
        display_recipient: [
            {
                id: hamlet.user_id,
            },
        ],
        id: 43,
    };

    assert.equal(
        hash_util.by_conversation_and_time_url(message),
        "http://zulip.zulipdev.com/#narrow/dm/15-dm/near/43",
    );
});

run_test("test_search_public_streams_notice_url", () => {
    function get_operators(url) {
        return hash_util.parse_narrow(url.split("/"));
    }

    assert.equal(
        hash_util.search_public_streams_notice_url(get_operators("#narrow/search/abc")),
        "#narrow/streams/public/search/abc",
    );

    assert.equal(
        hash_util.search_public_streams_notice_url(
            get_operators("#narrow/has/link/has/image/has/attachment"),
        ),
        "#narrow/streams/public/has/link/has/image/has/attachment",
    );

    assert.equal(
        hash_util.search_public_streams_notice_url(get_operators("#narrow/sender/15")),
        "#narrow/streams/public/sender/15-Hamlet",
    );
});

run_test("test_current_hash_as_next", () => {
    window.location.hash = "#foo";
    assert.equal(spectators.current_hash_as_next(), "next=/%23foo");
});
