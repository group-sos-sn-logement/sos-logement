
const pool = require("../config/database");

function getClientIP(req) {
    // لا نثق بـ X-Forwarded-For إلا بعد ضبط
    // إعدادات proxy في بيئة الاستضافة.
    return req.ip ||
        req.socket?.remoteAddress ||
        "unknown";
}

async function logSecurityEvent(req, type, message, options = {}) {
    try {
        await pool.query(
            `INSERT INTO security_events (
                event_type,
                message,
                user_id,
                ip_address,
                user_agent,
                method,
                path
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
                type,
                String(message).slice(0, 1000),
                req.user?.id || options.userId || null,
                getClientIP(req),
                String(req.get("user-agent") || "unknown").slice(0, 1000),
                req.method,
                String(req.path).slice(0, 1000)
            ]
        );
    } catch (error) {
        // لا نكشف تفاصيل داخلية للزائر.
        console.error("SECURITY LOGGER ERROR:", error.message);
    }
}

module.exports = {
    logSecurityEvent,
    getClientIP
};
