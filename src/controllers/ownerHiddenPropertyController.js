const pool = require("../config/database");
const bcrypt = require("bcrypt");


/* =====================================================
   BIENS MASQUÉS DU PROPRIÉTAIRE
===================================================== */

async function getHiddenProperties(req, res) {

    try {

        const result = await pool.query(
            `
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
                p.created_at,
                p.updated_at,

                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', pi.id,
                            'url', pi.url,
                            'public_id', pi.public_id,
                            'resource_type', pi.resource_type
                        )
                    ) FILTER (WHERE pi.id IS NOT NULL),
                    '[]'
                ) AS images

            FROM properties p

            LEFT JOIN property_images pi
                ON pi.property_id = p.id

            WHERE
                p.owner_id = $1
                AND p.status = 'hidden'

            GROUP BY p.id

            ORDER BY p.updated_at DESC
            `,
            [req.user.id]
        );

        return res.json(result.rows);

    } catch (error) {

        console.error(
            "GET HIDDEN PROPERTIES ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Erreur lors de la récupération des biens masqués."
        });

    }
}


/* =====================================================
   RÉACTIVER
===================================================== */

async function restoreProperty(req, res) {

    try {

        const propertyId = Number(req.params.id);

        if (!propertyId) {

            return res.status(400).json({
                message: "ID du bien invalide."
            });

        }

        const result = await pool.query(
            `
            UPDATE properties

            SET
                status = 'pending',
                updated_at = CURRENT_TIMESTAMP

            WHERE
                id = $1
                AND owner_id = $2
                AND status = 'hidden'

            RETURNING id, property_code, status
            `,
            [
                propertyId,
                req.user.id
            ]
        );

        if (result.rows.length === 0) {

            return res.status(404).json({
                message: "Bien masqué introuvable ou non autorisé."
            });

        }

        return res.json({
            success: true,
            message: "Le bien a été réactivé et envoyé pour validation.",
            property: result.rows[0]
        });

    } catch (error) {

        console.error(
            "RESTORE PROPERTY ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Erreur lors de la réactivation du bien."
        });

    }
}


/* =====================================================
   SUPPRESSION DÉFINITIVE AVEC MOT DE PASSE
===================================================== */

async function deletePropertyConfirm(req, res) {

    try {

        const propertyId = Number(req.params.id);
        const { password } = req.body;

        if (!propertyId) {

            return res.status(400).json({
                message: "ID du bien invalide."
            });

        }

        if (!password) {

            return res.status(400).json({
                message: "Mot de passe requis."
            });

        }


        /* Vérifier que le bien appartient au propriétaire */

        const propertyResult = await pool.query(
            `
            SELECT id, owner_id, status
            FROM properties
            WHERE
                id = $1
                AND owner_id = $2
            `,
            [
                propertyId,
                req.user.id
            ]
        );


        if (propertyResult.rows.length === 0) {

            return res.status(404).json({
                message: "Bien introuvable ou accès non autorisé."
            });

        }


        const property = propertyResult.rows[0];


        if (property.status !== "hidden") {

            return res.status(400).json({
                message: "Seuls les biens masqués peuvent être supprimés depuis cette page."
            });

        }


        /* Récupérer le mot de passe */

        const userResult = await pool.query(
            `
            SELECT password_hash
            FROM users
            WHERE id = $1
            `,
            [req.user.id]
        );


        if (userResult.rows.length === 0) {

            return res.status(404).json({
                message: "Utilisateur introuvable."
            });

        }


        const validPassword = await bcrypt.compare(
            password,
            userResult.rows[0].password_hash
        );


        if (!validPassword) {

            return res.status(401).json({
                message: "Mot de passe incorrect."
            });

        }


        /* Suppression */

        await pool.query(
            `
            DELETE FROM properties
            WHERE
                id = $1
                AND owner_id = $2
            `,
            [
                propertyId,
                req.user.id
            ]
        );


        return res.json({
            success: true,
            message: "Bien supprimé définitivement."
        });

    } catch (error) {

        console.error(
            "DELETE HIDDEN PROPERTY ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Erreur lors de la suppression du bien."
        });

    }
}


module.exports = {
    getHiddenProperties,
    restoreProperty,
    deletePropertyConfirm
};