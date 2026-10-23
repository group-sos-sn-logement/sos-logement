
const { parsePhoneNumberFromString } = require("libphonenumber-js");

function normalizePhone(phone, country) {
    if (!phone || !country) return null;

    const parsed = parsePhoneNumberFromString(
        String(phone).trim(),
        String(country).toUpperCase()
    );

    if (!parsed || !parsed.isValid()) {
        return null;
    }

    return parsed.number; // Format international E.164
}

module.exports = { normalizePhone };
