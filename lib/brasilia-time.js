const BRASILIA_TIME_ZONE = "America/Sao_Paulo";
const BRASILIA_OFFSET_HOURS = -3;

function getBrasiliaDateParts(date = new Date()) {
    const formatter = new Intl.DateTimeFormat("en-CA", {
        timeZone: BRASILIA_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hourCycle: "h23",
    });

    const parts = Object.fromEntries(
        formatter.formatToParts(date)
            .filter((part) => part.type !== "literal")
            .map((part) => [part.type, Number.parseInt(part.value, 10)]),
    );

    return {
        year: parts.year,
        month: parts.month,
        day: parts.day,
        hour: parts.hour,
        minute: parts.minute,
        second: parts.second,
    };
}

function createHourlyWindow(windowHours, date = new Date()) {
    const parts = getBrasiliaDateParts(date);
    const slotHour = Math.floor(parts.hour / windowHours) * windowHours;
    const nextSlotUtc = Date.UTC(
        parts.year,
        parts.month - 1,
        parts.day,
        slotHour + windowHours - BRASILIA_OFFSET_HOURS,
        0,
        0,
    );

    return {
        slotKey: `${parts.year}-${String(parts.month).padStart(2, "0")}-${String(parts.day).padStart(2, "0")}:${String(slotHour).padStart(2, "0")}`,
        resetAt: nextSlotUtc,
    };
}

module.exports = {
    BRASILIA_TIME_ZONE,
    createHourlyWindow,
    getBrasiliaDateParts,
};
