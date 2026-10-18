const express = require("express");
const twilio = require("twilio");
const pool = require("../config/database");

const router = express.Router();

router.post(
    "/whatsapp",
    express.urlencoded({ extended: false }),
    async (req, res) => {
        try {
            const from = req.body.From;
            const body = req.body.Body || "";
            const messageSid = req.body.MessageSid;

            if (!from || !messageSid) {
                return res.status(400).send("Invalid webhook");
            }

            await pool.query(
                `INSERT INTO messages (
                    source,
                    source_label,
                    status,
                    phone,
                    subject,
                    message,
                    details
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT DO NOTHING`,
                [
                    "whatsapp",
                    "WhatsApp",
                    "new",
                    from.replace(/^whatsapp:/, ""),
                    "WhatsApp entrant",
                    body,
                    JSON.stringify({
                        messageSid,
                        channel: "whatsapp"
                    })
                ]
            );

            const twiml = new twilio.twiml.MessagingResponse();
            return res.type("text/xml").send(twiml.toString());
        } catch (error) {
            console.error("WhatsApp webhook error:", error);
            return res.status(500).send("Webhook error");
        }
    }
);

module.exports = router;
