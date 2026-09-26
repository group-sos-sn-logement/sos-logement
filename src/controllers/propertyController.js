const pool = require("../config/database");


// =====================================================
// CREATE PROPERTY
// =====================================================

async function createProperty(req, res) {

    try {

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


        const result = await pool.query(
            `
            INSERT INTO properties (
                owner_id,
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

                'pending'
            )

            RETURNING *
            `,
            [
                req.user.id,

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


        return res.status(201).json({

            success: true,

            message:
                "Propriété créée et envoyée pour validation",

            property: result.rows[0]

        });


    } catch (error) {

        console.error(
            "❌ CREATE PROPERTY:",
            error
        );

        return res.status(500).json({

            success: false,

            message:
                "Erreur lors de la création de la propriété"

        });

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


module.exports = {

    createProperty,

    getApprovedProperties

};