const test = require("node:test");
const assert = require("node:assert/strict");
const {
    checkDoujinMarriageAvailability,
    createDoujinMarriageRecord,
    getCurrentDoujinMarriageWindow,
} = require("../modules/DoujinMarriage");

test("checkDoujinMarriageAvailability allows claim when no record exists in current window", () => {
    const result = checkDoujinMarriageAvailability(null, new Date("2026-03-15T14:30:00.000Z"));
    assert.equal(result.allowed, true);
    assert.equal(result.slotKey, "2026-03-15:09");
});

test("checkDoujinMarriageAvailability blocks repeated doujin claim in same window", () => {
    const date = new Date("2026-03-15T14:30:00.000Z");
    const currentWindow = getCurrentDoujinMarriageWindow(date);
    const result = checkDoujinMarriageAvailability({ slotKey: currentWindow.slotKey }, date);

    assert.equal(result.allowed, false);
    assert.equal(result.nextSlotAt, currentWindow.nextSlotAt);
});

test("createDoujinMarriageRecord stores doujin and next slot", () => {
    const date = new Date("2026-03-15T14:30:00.000Z");
    const record = createDoujinMarriageRecord({ id: 123, title: "Test Doujin" }, date);

    assert.equal(record.doujinId, "123");
    assert.equal(record.doujinTitle, "Test Doujin");
    assert.equal(record.slotKey, "2026-03-15:09");
});
