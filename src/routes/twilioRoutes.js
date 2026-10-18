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

            const phone = from.replace(/^whatsapp:/, "");

            // منع تسجيل الرسالة نفسها مرتين
            const duplicate = await pool.query(
                `SELECT id
                 FROM message_replies
                 WHERE channel = 'whatsapp'
                   AND external_id = $1
                 LIMIT 1`,
                [messageSid]
            );

            if (duplicate.rows.length) {
                const twiml = new twilio.twiml.MessagingResponse();
                return res.type("text/xml").send(twiml.toString());
            }

            // البحث عن محادثة سابقة لهذا الرقم
            const existing = await pool.query(
                `SELECT id
                 FROM messages
                 WHERE source = 'whatsapp'
                   AND phone = $1
                 ORDER BY created_at ASC, id ASC
                 LIMIT 1`,
                [phone]
            );

            let messageId;

            if (existing.rows.length) {
                messageId = existing.rows[0].id;
            } else {
                // إنشاء محادثة جديدة
                const created = await pool.query(
                    `INSERT INTO messages (
                        source, source_label, status, phone,
                        subject, message, details
                    )
                    VALUES ($1, $2, $3, $4, $5, $6, $7)
                    RETURNING id`,
                    [
                        "whatsapp",
                        "WhatsApp",
                        "new",
                        phone,
                        "WhatsApp entrant",
                        body,
                        JSON.stringify({
                            messageSid,
                            channel: "whatsapp"
                        })
                    ]
                );

                messageId = created.rows[0].id;
            }

            // حفظ رسالة العميل داخل المحادثة
            await pool.query(
                `INSERT INTO message_replies (
                    message_id, sender, channel,
                    body, external_id, status
                )
                VALUES ($1, 'client', 'whatsapp', $2, $3, 'received')
                ON CONFLICT (channel, external_id)
                WHERE external_id IS NOT NULL
                DO NOTHING`,
                [messageId, body, messageSid]
            );

            await pool.query(
                `UPDATE messages
                 SET updated_at = NOW()
                 WHERE id = $1`,
                [messageId]
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