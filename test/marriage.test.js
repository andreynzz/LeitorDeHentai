const test = require("node:test");
const assert = require("node:assert/strict");
const {
    checkMarriageAvailability,
    createMarriageRecord,
    getCurrentMarriageWindow,
} = require("../modules/Marriage");

test("checkMarriageAvailability allows marriage when no record exists in current window", () => {
    const result = checkMarriageAvailability(null, new Date("2026-03-14T14:30:00.000Z"));
    assert.equal(result.allowed, true);
    assert.equal(result.slotKey, "2026-03-14:09");
});

test("checkMarriageAvailability blocks repeated marriage in same window", () => {
    const date = new Date("2026-03-14T14:30:00.000Z");
    const currentWindow = getCurrentMarriageWindow(date);
    const result = checkMarriageAvailability({ slotKey: currentWindow.slotKey }, date);

    assert.equal(result.allowed, false);
    assert.equal(result.nextSlotAt, currentWindow.nextSlotAt);
});

test("createMarriageRecord stores character and next slot", () => {
    const date = new Date("2026-03-14T14:30:00.000Z");
    const record = createMarriageRecord({ id: "rias-gremory", name: "Rias Gremory" }, date);

    assert.equal(record.characterId, "rias-gremory");
    assert.equal(record.characterName, "Rias Gremory");
    assert.equal(record.slotKey, "2026-03-14:09");
});
