const pool = require("../config/database");

/* =========================================================
   CREATE MESSAGE
========================================================= */

async function createMessage(req, res) {

    try {

        const {
            source,
            source_label,
            full_name,
            email,
            phone,
            country,
            subject,
            message,
            details
        } = req.body;


        if (!source) {

            return res.status(400).json({
                success: false,
                message: "La source du message est obligatoire."
            });

        }


        const result = await pool.query(
            `
            INSERT INTO messages (
                source,
                source_label,
                status,
                full_name,
                email,
                phone,
                country,
                subject,
                message,
                details
            )
            VALUES (
                $1,
                $2,
                'new',
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,
                $9
            )
            RETURNING *
            `,
            [
                source,
                source_label || source,
                full_name || null,
                email || null,
                phone || null,
                country || null,
                subject || null,
                message || null,
                details || {}
            ]
        );


        return res.status(201).json({

            success: true,

            message: "Message enregistré avec succès.",

            data: result.rows[0]

        });

    }

    catch (error) {

        console.error(
            "❌ CREATE MESSAGE:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Erreur lors de l'enregistrement du message."

        });

    }

}


/* =========================================================
   GET ADMIN MESSAGES
========================================================= */

async function getMessages(req, res) {

    try {

        const result = await pool.query(
            `
            SELECT *
            FROM messages
            ORDER BY created_at DESC
            `
        );


        return res.json({

            success: true,

            messages: result.rows

        });

    }

    catch (error) {

        console.error(
            "❌ GET MESSAGES:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Erreur lors du chargement des messages."

        });

    }

}


/* =========================================================
   GET ONE MESSAGE
========================================================= */

async function getMessage(req, res) {

    try {

        const id =
            Number(req.params.id);


        const result = await pool.query(
            `
            SELECT *
            FROM messages
            WHERE id = $1
            `,
            [id]
        );


        if (!result.rows.length) {

            return res.status(404).json({

                success: false,

                message: "Message introuvable."

            });

        }


        return res.json({

            success: true,

            message: result.rows[0]

        });

    }

    catch (error) {

        console.error(
            "❌ GET MESSAGE:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Erreur lors du chargement du message."

        });

    }

}


/* =========================================================
   UPDATE STATUS
========================================================= */

async function updateMessageStatus(req, res) {

    try {

        const id =
            Number(req.params.id);

        const {
            status
        } = req.body;


        const allowedStatuses = [
            "new",
            "read",
            "replied",
            "done"
        ];


        if (
            !allowedStatuses.includes(status)
        ) {

            return res.status(400).json({

                success: false,

                message: "Statut invalide."

            });

        }


        const result = await pool.query(
            `
            UPDATE messages
            SET
                status = $1,
                updated_at = NOW()
            WHERE id = $2
            RETURNING *
            `,
            [
                status,
                id
            ]
        );


        if (!result.rows.length) {

            return res.status(404).json({

                success: false,

                message: "Message introuvable."

            });

        }


        return res.json({

            success: true,

            message: "Statut mis à jour.",

            data: result.rows[0]

        });

    }

    catch (error) {

        console.error(
            "❌ UPDATE MESSAGE STATUS:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Erreur lors de la modification du statut."

        });

    }

}


/* =========================================================
   REPLY
========================================================= */

async function replyMessage(req, res) {

    try {

        const id =
            Number(req.params.id);

        const {
            reply
        } = req.body;


        if (!reply || !reply.trim()) {

            return res.status(400).json({

                success: false,

                message: "La réponse est vide."

            });

        }


        const result = await pool.query(
            `
            UPDATE messages
            SET
                admin_reply = $1,
                status = 'replied',
                replied_at = NOW(),
                updated_at = NOW()
            WHERE id = $2
            RETURNING *
            `,
            [
                reply.trim(),
                id
            ]
        );


        if (!result.rows.length) {

            return res.status(404).json({

                success: false,

                message: "Message introuvable."

            });

        }


        return res.json({

            success: true,

            message: "Réponse enregistrée.",

            data: result.rows[0]

        });

    }

    catch (error) {

        console.error(
            "❌ REPLY MESSAGE:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Erreur lors de l'enregistrement de la réponse."

        });

    }

}


/* =========================================================
   DELETE
========================================================= */

async function deleteMessage(req, res) {

    try {

        const id =
            Number(req.params.id);


        const result = await pool.query(
            `
            DELETE FROM messages
            WHERE id = $1
            RETURNING id
            `,
            [id]
        );


        if (!result.rows.length) {

            return res.status(404).json({

                success: false,

                message: "Message introuvable."

            });

        }


        return res.json({

            success: true,

            message: "Message supprimé."

        });

    }

    catch (error) {

        console.error(
            "❌ DELETE MESSAGE:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Erreur lors de la suppression."

        });

    }

}


module.exports = {

    createMessage,
    getMessages,
    getMessage,
    updateMessageStatus,
    replyMessage,
    deleteMessage

};