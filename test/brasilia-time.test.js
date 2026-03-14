const test = require("node:test");
const assert = require("node:assert/strict");
const { createHourlyWindow } = require("../lib/brasilia-time");

test("createHourlyWindow creates 3-hour marriage windows in Brasilia time", () => {
    const date = new Date("2026-03-14T14:30:00.000Z");
    const window = createHourlyWindow(3, date);

    assert.equal(window.slotKey, "2026-03-14:09");
    assert.equal(new Date(window.resetAt).toISOString(), "2026-03-14T15:00:00.000Z");
});

test("createHourlyWindow creates hourly roll windows in Brasilia time", () => {
    const date = new Date("2026-03-14T14:30:00.000Z");
    const window = createHourlyWindow(1, date);

    assert.equal(window.slotKey, "2026-03-14:11");
    assert.equal(new Date(window.resetAt).toISOString(), "2026-03-14T15:00:00.000Z");
});
