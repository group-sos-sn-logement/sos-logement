const pool = require("../config/database");

const {
    buildOfferReference
} = require("../utils/ownerReference");

// =====================================================
// CREATE PROPERTY
// =====================================================

async function createProperty(req, res) {

    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        const {
            title,
            type,
            description,
            city,
            exact_location,

            price_type,
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
            max_students
        } = req.body;


        /* =================================================
           OWNER
        ================================================= */

        const ownerResult = await client.query(
            `
            SELECT
                owner_code,
                next_offer_number
            FROM users
            WHERE id = $1
              AND role = 'owner'
            FOR UPDATE
            `,
            [req.user.id]
        );


        if (ownerResult.rows.length === 0) {

            await client.query("ROLLBACK");

            return res.status(403).json({
                success: false,
                message: "Référence propriétaire introuvable"
            });

        }


        const owner =
            ownerResult.rows[0];


        /* =================================================
           PROPERTY REFERENCE
        ================================================= */

        const propertyReference =
            buildOfferReference(
                owner.owner_code,
                owner.next_offer_number
            );


        /* =================================================
           CREATE PROPERTY
        ================================================= */

        const result = await client.query(
            `
            INSERT INTO properties (
                owner_id,
                property_code,

                title,
                type,
                description,
                city,
                exact_location,

                price_type,
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

                status
            )

            VALUES (
                $1,
                $2,

                $3,
                $4,
                $5,
                $6,
                $7,

                $8,
                $9,
                $10,
                $11,

                $12,
                $13,
                $14,
                $15,
                $16,

                $17,
                $18,
                $19,

                'pending'
            )

            RETURNING *
            `,
            [
                req.user.id,
                propertyReference,

                title,
                type,
                description,
                city,
                exact_location,

                price_type,
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
                max_students
            ]
        );


        /* =================================================
           INCREMENT NEXT PROPERTY NUMBER
        ================================================= */

        await client.query(
            `
            UPDATE users
            SET
                next_offer_number =
                    next_offer_number + 1,

                updated_at = NOW()

            WHERE id = $1
            `,
            [req.user.id]
        );


        await client.query("COMMIT");


        return res.status(201).json({

            success: true,

            message:
                "Propriété créée et envoyée pour validation",

            property:
                result.rows[0]

        });


    } catch (error) {

        await client.query("ROLLBACK");

        console.error(
            "❌ CREATE PROPERTY:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Erreur lors de la création de la propriété"

        });

    } finally {

        client.release();

    }

}


// =====================================================
// GET APPROVED PROPERTIES
// =====================================================
// IMPORTANT :
// Seules les propriétés avec status = 'approved'
// sont visibles publiquement.
// =====================================================

async function getApprovedProperties(req, res) {

    try {

        const result = await pool.query(
            `
            SELECT

                p.id,
                p.owner_id,
                p.property_code,

                p.title,p.owner_id,

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
                p.created_at,

                COALESCE(

                    json_agg(

                        json_build_object(

                            'id',
                            pi.id,

                            'url',
                            pi.url,

                            'public_id',
                            pi.public_id,

                            'resource_type',
                            pi.resource_type

                        )

                        ORDER BY pi.id ASC

                    )

                    FILTER (
                        WHERE pi.id IS NOT NULL
                    ),

                    '[]'::json

                ) AS images

            FROM properties p

            LEFT JOIN property_images pi
                ON pi.property_id = p.id

            WHERE p.status = 'approved'

            GROUP BY p.id

            ORDER BY p.created_at DESC
            `
        );


        return res.status(200).json({

            success: true,

            count: result.rows.length,

            properties: result.rows

        });


    } catch (error) {

        console.error(
            "❌ GET APPROVED PROPERTIES:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Erreur lors du chargement des propriétés"

        });

    }

}

// =====================================================
// GET PENDING PROPERTIES — ADMIN
// =====================================================

async function getPendingProperties(req, res) {

    try {

        const result = await pool.query(`
            SELECT
                p.id,
                p.owner_id,
                p.property_code,
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
                p.created_at,

                u.name AS owner_name,
                u.phone AS owner_phone,
                u.owner_ref,

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

            LEFT JOIN users u
                ON u.id = p.owner_id

            LEFT JOIN property_images pi
                ON pi.property_id = p.id

            WHERE p.status = 'pending'

            GROUP BY p.id, u.id

            ORDER BY p.created_at DESC
        `);

        return res.json(result.rows);

    } catch (error) {

        console.error("❌ GET PENDING PROPERTIES:", error);

        return res.status(500).json({
            success: false,
            message: "Erreur lors du chargement des biens en attente"
        });

    }
}


// =====================================================
// APPROVE PROPERTY — ADMIN
// =====================================================

async function approveProperty(req, res) {

    try {

        const propertyId = Number(req.params.id);

        const result = await pool.query(`
            UPDATE properties
            SET
                status = 'approved',
                updated_at = NOW()
            WHERE id = $1
              AND status = 'pending'
            RETURNING *
        `, [propertyId]);

        if (result.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Bien introuvable ou déjà traité"
            });

        }

        return res.json({
            success: true,
            message: "Bien approuvé et publié.",
            property: result.rows[0]
        });

    } catch (error) {

        console.error("❌ APPROVE PROPERTY:", error);

        return res.status(500).json({
            success: false,
            message: "Erreur lors de l'approbation"
        });

    }
}


// =====================================================
// REJECT PROPERTY — ADMIN
// =====================================================

async function rejectProperty(req, res) {

    try {

        const propertyId = Number(req.params.id);

        const result = await pool.query(`
            UPDATE properties
            SET
                status = 'rejected',
                updated_at = NOW()
            WHERE id = $1
              AND status = 'pending'
            RETURNING *
        `, [propertyId]);

        if (result.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Bien introuvable ou déjà traité"
            });

        }

        return res.json({
            success: true,
            message: "Bien refusé.",
            property: result.rows[0]
        });

    } catch (error) {

        console.error("❌ REJECT PROPERTY:", error);

        return res.status(500).json({
            success: false,
            message: "Erreur lors du refus"
        });

    }
}

const getPropertyByCode = async (req, res) => {

    try {

        const { code } = req.params;

        const result = await pool.query(
            `
            SELECT

                p.*,

                COALESCE(

                    json_agg(

                        json_build_object(

                            'id',
                            pi.id,

                            'url',
                            pi.url,

                            'public_id',
                            pi.public_id,

                            'resource_type',
                            pi.resource_type

                        )

                        ORDER BY pi.id ASC

                    )

                    FILTER (
                        WHERE pi.id IS NOT NULL
                    ),

                    '[]'::json

                ) AS images

            FROM properties p

            LEFT JOIN property_images pi
                ON pi.property_id = p.id

            WHERE p.property_code = $1
              AND p.status = 'approved'

            GROUP BY p.id
            `,
            [code]
        );


        if (result.rows.length === 0) {

            return res.status(404).json({

                success: false,

                message: "Bien introuvable"

            });

        }


        return res.status(200).json(

            result.rows[0]

        );


    } catch (error) {

        console.error(
            "❌ GET PROPERTY BY CODE:",
            error
        );

        return res.status(500).json({

            success: false,

            message: "Erreur serveur"

        });

    }

};

module.exports = {

    createProperty,
    getApprovedProperties,
    getPendingProperties,
    approveProperty,
    rejectProperty,
    getPropertyByCode

};