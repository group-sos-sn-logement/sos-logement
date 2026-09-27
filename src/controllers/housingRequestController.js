const pool = require("../config/database");

/* =========================================================
   CREATE REQUEST
========================================================= */

async function createHousingRequest(req, res) {
    try {
        const {
            nom,
            prenom,
            email,
            tel,
            nomMaison,
            propertyReference,
            propertyQuartier,
            propertyType,
            note,
            rental_duration,
            visiter
        } = req.body;

        if (
            !nom ||
            !prenom ||
            !email ||
            !tel ||
            !rental_duration ||
            !visiter
        ) {
            return res.status(400).json({
                success: false,
                message: "Veuillez remplir tous les champs obligatoires."
            });
        }

        const result = await pool.query(
            `
            INSERT INTO housing_requests (
                property_reference,
                nom,
                prenom,
                email,
                telephone,
                nom_logement,
                quartier,
                property_type,
                note,
                rental_duration,
                visiter
            )
            VALUES (
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11
            )
            RETURNING *
            `,
            [
                propertyReference || null,
                nom,
                prenom,
                email,
                tel,
                nomMaison || null,
                propertyQuartier || null,
                propertyType || null,
                note || null,
                rental_duration,
                visiter
            ]
        );

        return res.status(201).json({
            success: true,
            message: "Votre demande a été envoyée avec succès.",
            request: result.rows[0]
        });

    } catch (error) {
        console.error("CREATE HOUSING REQUEST ERROR:", error);

        return res.status(500).json({
            success: false,
            message: "Erreur serveur."
        });
    }
}


/* =========================================================
   ADMIN — GET ALL
========================================================= */

async function getHousingRequests(req, res) {
    try {
        const result = await pool.query(`
            SELECT *
            FROM housing_requests
            ORDER BY created_at DESC
        `);

        res.json({
            success: true,
            requests: result.rows
        });

    } catch (error) {
        console.error("GET HOUSING REQUESTS ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Erreur serveur."
        });
    }
}


/* =========================================================
   ADMIN — GET ONE
========================================================= */

async function getHousingRequest(req, res) {
    try {
        const { id } = req.params;

        const result = await pool.query(
            `
            SELECT *
            FROM housing_requests
            WHERE id = $1
            `,
            [id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Demande introuvable."
            });
        }

        res.json({
            success: true,
            request: result.rows[0]
        });

    } catch (error) {
        console.error("GET HOUSING REQUEST ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Erreur serveur."
        });
    }
}


/* =========================================================
   ADMIN — REPLY
========================================================= */

async function replyHousingRequest(req, res) {
    try {
        const { id } = req.params;
        const { reply, status } = req.body;

        if (!reply || !reply.trim()) {
            return res.status(400).json({
                success: false,
                message: "La réponse est obligatoire."
            });
        }

        const result = await pool.query(
            `
            UPDATE housing_requests
            SET
                admin_reply = $1,
                status = $2,
                replied_at = NOW(),
                updated_at = NOW()
            WHERE id = $3
            RETURNING *
            `,
            [
                reply.trim(),
                status || "answered",
                id
            ]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Demande introuvable."
            });
        }

        res.json({
            success: true,
            message: "Réponse enregistrée.",
            request: result.rows[0]
        });

    } catch (error) {
        console.error("REPLY HOUSING REQUEST ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Erreur serveur."
        });
    }
}


/* =========================================================
   ADMIN — STATUS
========================================================= */

async function updateHousingRequestStatus(req, res) {
    try {
        const { id } = req.params;
        const { status } = req.body;

        const allowed = [
            "pending",
            "processing",
            "answered",
            "accepted",
            "rejected",
            "closed"
        ];

        if (!allowed.includes(status)) {
            return res.status(400).json({
                success: false,
                message: "Statut invalide."
            });
        }

        const result = await pool.query(
            `
            UPDATE housing_requests
            SET
                status = $1,
                updated_at = NOW()
            WHERE id = $2
            RETURNING *
            `,
            [status, id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Demande introuvable."
            });
        }

        res.json({
            success: true,
            request: result.rows[0]
        });

    } catch (error) {
        console.error("UPDATE HOUSING REQUEST STATUS ERROR:", error);

        res.status(500).json({
            success: false,
            message: "Erreur serveur."
        });
    }
}


module.exports = {
    createHousingRequest,
    getHousingRequests,
    getHousingRequest,
    replyHousingRequest,
    updateHousingRequestStatus
};