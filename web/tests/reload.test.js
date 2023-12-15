"use strict";

const {strict: assert} = require("assert");

const {zrequire} = require("./lib/namespace");
const {run_test, noop} = require("./lib/test");

// override file-level function call in reload.js
window.addEventListener = noop;
const reload = zrequire("reload");

run_test("old_metadata_string_is_stale", () => {
    assert.ok(reload.is_stale_refresh_token("1663886962834", "1663883954033"), true);
});

run_test("recent_token_is_not_stale ", () => {
    assert.ok(
        !reload.is_stale_refresh_token(
            {
                url: "#reload:234234235234",
                timestamp: Date.parse("21 Jan 2022 00:00:00 GMT"),
            },
            Date.parse("23 Jan 2022 00:00:00 GMT"),
        ),
    );
});

run_test("old_token_is_stale ", () => {
    assert.ok(
        reload.is_stale_refresh_token(
            {
                url: "#reload:234234235234",
                timestamp: Date.parse("13 Jan 2022 00:00:00 GMT"),
            },
            Date.parse("23 Jan 2022 00:00:00 GMT"),
        ),
    );
});
