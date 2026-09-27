const pool = require("../config/database");


/* =====================================================
   MES BIENS — PROPRIÉTAIRE CONNECTÉ
===================================================== */

async function getMyProperties(req, res) {

    try {

        const result = await pool.query(
            `
            SELECT
                p.*,

                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', pi.id,
                            'url', pi.url,
                            'public_id', pi.public_id,
                            'resource_type', pi.resource_type
                        )
                        ORDER BY pi.id ASC
                    )
                    FILTER (WHERE pi.id IS NOT NULL),
                    '[]'::json
                ) AS images

            FROM properties p

            LEFT JOIN property_images pi
                ON pi.property_id = p.id

            WHERE p.owner_id = $1

            GROUP BY p.id

            ORDER BY p.created_at DESC
            `,
            [req.user.id]
        );

        return res.json(result.rows);

    } catch (error) {

        console.error("❌ GET MY PROPERTIES:", error);

        return res.status(500).json({
            success: false,
            message: "Erreur lors du chargement de vos biens"
        });
    }
}


/* =====================================================
   GET ONE PROPERTY
===================================================== */

async function getMyProperty(req, res) {

    try {

        const propertyId = Number(req.params.id);

        if (!propertyId) {
            return res.status(400).json({
                success: false,
                message: "ID de propriété invalide"
            });
        }

        const result = await pool.query(
            `
            SELECT
                p.*,

                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', pi.id,
                            'url', pi.url,
                            'public_id', pi.public_id,
                            'resource_type', pi.resource_type
                        )
                        ORDER BY pi.id ASC
                    )
                    FILTER (WHERE pi.id IS NOT NULL),
                    '[]'::json
                ) AS images

            FROM properties p

            LEFT JOIN property_images pi
                ON pi.property_id = p.id

            WHERE p.id = $1
              AND p.owner_id = $2

            GROUP BY p.id
            `,
            [
                propertyId,
                req.user.id
            ]
        );

        if (!result.rows.length) {

            return res.status(404).json({
                success: false,
                message: "Bien introuvable"
            });
        }

        return res.json(result.rows[0]);

    } catch (error) {

        console.error("❌ GET MY PROPERTY:", error);

        return res.status(500).json({
            success: false,
            message: "Erreur serveur"
        });
    }
}


/* =====================================================
   UPDATE PROPERTY
===================================================== */

async function updateMyProperty(req, res) {

    try {

        const propertyId = Number(req.params.id);

        if (!propertyId) {
            return res.status(400).json({
                success: false,
                message: "ID de propriété invalide"
            });
        }

        const {
            title,
            type,
            description,
            city,
            exact_location,
            price,
            price_month,
            price_week,
            price_day,
            price_type,
            chambres,
            cuisine,
            sdb,
            salon,
            surface,
            is_student,
            max_students
        } = req.body;


        const result = await pool.query(
            `
            UPDATE properties

            SET
                title = COALESCE($1, title),
                type = COALESCE($2, type),
                description = COALESCE($3, description),
                city = COALESCE($4, city),
                exact_location = COALESCE($5, exact_location),

                price_month =
                    COALESCE(
                        $6,
                        price_month
                    ),

                price_week =
                    COALESCE(
                        $7,
                        price_week
                    ),

                price_day =
                    COALESCE(
                        $8,
                        price_day
                    ),

                price_type =
                    COALESCE(
                        $9,
                        price_type
                    ),

                chambres = COALESCE($10, chambres),
                cuisine = COALESCE($11, cuisine),
                sdb = COALESCE($12, sdb),
                salon = COALESCE($13, salon),
                surface = COALESCE($14, surface),

                is_student =
                    COALESCE(
                        $15,
                        is_student
                    ),

                max_students =
                    COALESCE(
                        $16,
                        max_students
                    ),

                updated_at = NOW()

            WHERE id = $17
              AND owner_id = $18

            RETURNING *
            `,
            [
                title,
                type,
                description,
                city,
                exact_location,

                price_month ?? price ?? null,
                price_week ?? null,
                price_day ?? null,
                price_type ?? null,

                chambres,
                cuisine,
                sdb,
                salon,
                surface,

                is_student,
                max_students,

                propertyId,
                req.user.id
            ]
        );


        if (!result.rows.length) {

            return res.status(404).json({
                success: false,
                message:
                    "Bien introuvable ou vous n'êtes pas son propriétaire"
            });
        }


        return res.json({

            success: true,

            message:
                "Bien modifié avec succès",

            property:
                result.rows[0]

        });

    } catch (error) {

        console.error("❌ UPDATE MY PROPERTY:", error);

        return res.status(500).json({
            success: false,
            message: "Erreur lors de la modification"
        });
    }
}


/* =====================================================
   HIDE PROPERTY
===================================================== */

async function hideMyProperty(req, res) {

    try {

        const propertyId =
            Number(req.params.id);


        const result = await pool.query(
            `
            UPDATE properties

            SET
                status = 'hidden',
                updated_at = NOW()

            WHERE id = $1
              AND owner_id = $2

            RETURNING id, property_code, status
            `,
            [
                propertyId,
                req.user.id
            ]
        );


        if (!result.rows.length) {

            return res.status(404).json({
                success: false,
                message:
                    "Bien introuvable ou vous n'êtes pas son propriétaire"
            });
        }


        return res.json({

            success: true,

            message:
                "Bien masqué de la plateforme",

            property:
                result.rows[0]

        });

    } catch (error) {

        console.error("❌ HIDE PROPERTY:", error);

        return res.status(500).json({
            success: false,
            message: "Impossible de masquer le bien"
        });
    }
}


/* =====================================================
   SEARCH MY PROPERTIES
===================================================== */

async function searchMyProperties(req, res) {

    try {

        const q =
            String(
                req.query.q || ""
            ).trim();


        if (!q) {

            return getMyProperties(
                req,
                res
            );
        }


        const result = await pool.query(
            `
            SELECT
                p.*,

                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', pi.id,
                            'url', pi.url,
                            'public_id', pi.public_id,
                            'resource_type', pi.resource_type
                        )
                        ORDER BY pi.id ASC
                    )
                    FILTER (WHERE pi.id IS NOT NULL),
                    '[]'::json
                ) AS images

            FROM properties p

            LEFT JOIN property_images pi
                ON pi.property_id = p.id

            WHERE p.owner_id = $1

            AND (
                p.property_code ILIKE $2
                OR p.title ILIKE $2
                OR p.city ILIKE $2
                OR p.type ILIKE $2
                OR CAST(p.price_month AS TEXT) ILIKE $2
                OR CAST(p.price_week AS TEXT) ILIKE $2
                OR CAST(p.price_day AS TEXT) ILIKE $2
            )

            GROUP BY p.id

            ORDER BY p.created_at DESC
            `,
            [
                req.user.id,
                `%${q}%`
            ]
        );


        return res.json(result.rows);

    } catch (error) {

        console.error("❌ SEARCH MY PROPERTIES:", error);

        return res.status(500).json({
            success: false,
            message: "Recherche impossible"
        });
    }
}


/* =====================================================
   DELETE IMAGE
===================================================== */

async function deleteMyImage(req, res) {

    try {

        const imageId =
            Number(req.params.id);


        if (!imageId) {

            return res.status(400).json({
                success: false,
                message: "ID image invalide"
            });
        }


        const result = await pool.query(
            `
            DELETE FROM property_images pi

            USING properties p

            WHERE pi.id = $1
              AND pi.property_id = p.id
              AND p.owner_id = $2

            RETURNING pi.id
            `,
            [
                imageId,
                req.user.id
            ]
        );


        if (!result.rows.length) {

            return res.status(404).json({
                success: false,
                message:
                    "Image introuvable ou vous n'êtes pas propriétaire de ce bien"
            });
        }


        return res.json({

            success: true,

            message:
                "Image supprimée avec succès"

        });

    } catch (error) {

        console.error("❌ DELETE MY IMAGE:", error);

        return res.status(500).json({
            success: false,
            message: "Impossible de supprimer l'image"
        });
    }
}


module.exports = {

    getMyProperties,
    getMyProperty,
    updateMyProperty,
    hideMyProperty,
    searchMyProperties,
    deleteMyImage

};