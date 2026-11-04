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
   UPDATE PROPERTY — OWNER
===================================================== */

async function updateMyProperty(req, res) {
    try {
        const propertyId = Number(req.params.id);

        if (!Number.isInteger(propertyId) || propertyId <= 0) {
            return res.status(400).json({
                success: false,
                message: "ID de propriété invalide"
            });
        }

        const {
            title,
            type,
            custom_type,
            is_custom_type,
            description,
            city,
            exact_location,
            price_type,
            price_sale,
            price_month,
            price_week,
            price_day,
            chambres,
            cuisine,
            sdb,
            salon,
            surface,
            commission,
            is_student,
            max_students,
            target_audience
        } = req.body;

        // Convertir proprement les booléens
        const isCustomType =
            is_custom_type === true || is_custom_type === "true";

        const requestedStudent =
            is_student === true || is_student === "true";

        // Vérifier le type de tarification
        const allowedPriceTypes = [
            "sale",
            "monthly",
            "weekly",
            "daily"
        ];

        if (!allowedPriceTypes.includes(price_type)) {
            return res.status(400).json({
                success: false,
                message: "Type de tarification invalide."
            });
        }

        // Vérifier le titre
        const finalTitle = String(title || "").trim();

        if (!finalTitle) {
            return res.status(400).json({
                success: false,
                message: "Le titre est obligatoire."
            });
        }

        // Vérifier le type immobilier
        const finalType = String(
            isCustomType ? custom_type || "" : type || ""
        ).trim();

        if (!finalType) {
            return res.status(400).json({
                success: false,
                message: "Le type de propriété est obligatoire."
            });
        }

        // Vérifier les champs numériques
        const numericFields = {
            price_sale,
            price_month,
            price_week,
            price_day,
            chambres,
            cuisine,
            sdb,
            salon,
            surface,
            commission,
            max_students
        };

        for (const [field, value] of Object.entries(numericFields)) {
            if (
                value !== undefined &&
                value !== null &&
                value !== "" &&
                (!Number.isFinite(Number(value)) || Number(value) < 0)
            ) {
                return res.status(400).json({
                    success: false,
                    message: `Valeur invalide pour ${field}.`
                });
            }
        }

        const isSale = price_type === "sale";
        const salePrice = Number(price_sale) || 0;

        if (isSale && salePrice <= 0) {
            return res.status(400).json({
                success: false,
                message: "Veuillez saisir un prix de vente valide."
            });
        }

        // La base accepte uniquement ces trois valeurs
        const allowedAudiences = [
            "diaspora",
            "senegalese",
            "all"
        ];

        const finalTargetAudience = isSale
            ? "all"
            : String(target_audience || "all").trim().toLowerCase();

        if (!allowedAudiences.includes(finalTargetAudience)) {
            return res.status(400).json({
                success: false,
                message:
                    "Public cible invalide. Valeurs autorisées : diaspora, senegalese, all."
            });
        }

        const finalIsStudent = isSale ? false : requestedStudent;

                
        const ownershipCheck = await pool.query(
            `
            SELECT id
            FROM properties
            WHERE id = $1
            AND owner_id = $2
            `,
            [propertyId, req.user.id]
        );

        if (!ownershipCheck.rows.length) {
            return res.status(404).json({
                success: false,
                message:
                    "Bien introuvable ou vous n'êtes pas son propriétaire."
            });
        }


        // Enregistrer le type personnalisé s'il n'existe pas déjà
        // Cette requête ne nécessite pas de contrainte ON CONFLICT.
        if (isCustomType) {
            await pool.query(
                `
                INSERT INTO property_types (name)
                SELECT $1
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM property_types
                    WHERE LOWER(name) = LOWER($1)
                )
                `,
                [finalType]
            );
        }

        const result = await pool.query(
            `
            UPDATE properties
            SET
                title = $1,
                type = $2,
                custom_type = $3,
                is_custom_type = $4,

                description = $5,
                city = $6,
                exact_location = $7,

                price_type = $8,
                price_sale = $9,
                price_month = $10,
                price_week = $11,
                price_day = $12,

                chambres = $13,
                cuisine = $14,
                sdb = $15,
                salon = $16,
                surface = $17,

                commission = $18,
                is_student = $19,
                max_students = $20,
                target_audience = $21,

                updated_at = NOW()

            WHERE id = $22
              AND owner_id = $23

            RETURNING *
            `,
            [
                finalTitle,
                finalType,
                isCustomType ? finalType : null,
                isCustomType,

                description || null,
                city || null,
                exact_location || null,

                price_type,
                isSale ? salePrice : 0,
                isSale ? 0 : Number(price_month) || 0,
                isSale ? 0 : Number(price_week) || 0,
                isSale ? 0 : Number(price_day) || 0,

                Number(chambres) || 0,
                Number(cuisine) || 0,
                Number(sdb) || 0,
                Number(salon) || 0,
                Number(surface) || 0,

                Number(commission) || 0,
                finalIsStudent,
                finalIsStudent ? Number(max_students) || 0 : 0,
                finalTargetAudience,

                propertyId,
                req.user.id
            ]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                success: false,
                message:
                    "Bien introuvable ou vous n'êtes pas son propriétaire."
            });
        }

        return res.json({
            success: true,
            message: "Bien modifié avec succès.",
            property: result.rows[0]
        });

    } catch (error) {
        console.error("❌ UPDATE MY PROPERTY:", error);

        return res.status(500).json({
            success: false,
            message: "Erreur lors de la modification."
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
                OR CAST(p.price_sale AS TEXT) ILIKE $2
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