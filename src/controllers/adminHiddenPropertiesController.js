const pool = require("../config/database");


/* =========================================================
   TOUS LES BIENS MASQUÉS
========================================================= */

async function getAllHiddenProperties(req, res) {

    try {

        const result = await pool.query(`
            SELECT
                p.id,
                p.owner_id,
                p.title,
                p.type,
                p.description,
                p.city,
                p.exact_location,
                p.price_type,
                p.price_month,
                p.price_week,
                p.price_day,
                p.chambres,
                p.cuisine,
                p.sdb,
                p.salon,
                p.surface,
                p.commission,
                p.is_student,
                p.max_students,
                p.status,
                p.property_code,
                p.owner_hidden,
                p.admin_hidden,
                p.hidden_by_admin,
                p.hidden_at,
                p.status_before_hidden,
                p.created_at,
                p.updated_at,

                u.name AS owner_name,
                u.phone AS owner_phone,
                u.email AS owner_email,

                admin.name AS hidden_by_admin_name,

                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', pi.id,
                            'url', pi.url,
                            'public_id', pi.public_id,
                            'resource_type', pi.resource_type
                        )
                    )
                    FILTER (WHERE pi.id IS NOT NULL),
                    '[]'
                ) AS images

            FROM properties p

            LEFT JOIN users u
                ON u.id = p.owner_id

            LEFT JOIN users admin
                ON admin.id = p.hidden_by_admin

            LEFT JOIN property_images pi
                ON pi.property_id = p.id

            WHERE
                p.status = 'hidden'

            GROUP BY
                p.id,
                u.name,
                u.phone,
                u.email,
                admin.name

            ORDER BY p.updated_at DESC
        `);

        return res.json({
            success: true,
            properties: result.rows
        });

    } catch (error) {

        console.error(
            "GET ALL HIDDEN PROPERTIES ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Erreur lors du chargement des biens masqués."
        });
    }
}


/* =========================================================
   ADMIN MASQUE UN BIEN
========================================================= */

async function adminHideProperty(req, res) {

    try {

        const propertyId = Number(req.params.id);

        if (!propertyId) {

            return res.status(400).json({
                success: false,
                message: "ID du bien invalide."
            });
        }

        const result = await pool.query(`
            UPDATE properties

            SET
                status_before_hidden =
                    CASE
                        WHEN status <> 'hidden'
                        THEN status
                        ELSE status_before_hidden
                    END,

                status = 'hidden',

                owner_hidden = FALSE,

                admin_hidden = TRUE,

                hidden_by_admin = $1,

                hidden_at = CURRENT_TIMESTAMP,

                updated_at = CURRENT_TIMESTAMP

            WHERE id = $2

            RETURNING
                id,
                property_code,
                status,
                owner_hidden,
                admin_hidden
        `, [
            req.user.id,
            propertyId
        ]);

        if (!result.rows.length) {

            return res.status(404).json({
                success: false,
                message: "Bien introuvable."
            });
        }

        return res.json({
            success: true,
            message: "Le bien a été masqué par l'administrateur.",
            property: result.rows[0]
        });

    } catch (error) {

        console.error(
            "ADMIN HIDE PROPERTY ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Erreur lors du masquage du bien."
        });
    }
}


/* =========================================================
   ADMIN RÉACTIVE UN BIEN
========================================================= */

async function adminRestoreProperty(req, res) {

    try {

        const propertyId = Number(req.params.id);

        if (!propertyId) {

            return res.status(400).json({
                success: false,
                message: "ID du bien invalide."
            });
        }

        const result = await pool.query(`
            UPDATE properties

            SET
                status =
                    COALESCE(
                        status_before_hidden,
                        'pending'
                    ),

                admin_hidden = FALSE,

                hidden_by_admin = NULL,

                hidden_at = NULL,

                status_before_hidden = NULL,

                updated_at = CURRENT_TIMESTAMP

            WHERE
                id = $1
                AND admin_hidden = TRUE

            RETURNING
                id,
                property_code,
                status,
                owner_hidden,
                admin_hidden
        `, [
            propertyId
        ]);

        if (!result.rows.length) {

            return res.status(404).json({
                success: false,
                message: "Ce bien n'est pas masqué par l'administrateur."
            });
        }

        return res.json({
            success: true,
            message: "Le bien a été réactivé par l'administrateur.",
            property: result.rows[0]
        });

    } catch (error) {

        console.error(
            "ADMIN RESTORE PROPERTY ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Erreur lors de la réactivation."
        });
    }
}


module.exports = {
    getAllHiddenProperties,
    adminHideProperty,
    adminRestoreProperty
};