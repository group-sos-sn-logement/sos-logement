const express = require("express");

const router = express.Router();

const pool =
    require("../config/database");

const {
    authenticateToken
} =
    require("../middleware/authMiddleware");


/* =========================================================
   GET USER FAVORITES
   GET /api/favorites
========================================================= */

router.get(
    "/",
    authenticateToken,
    async (req, res) => {

        try {

            const result =
                await pool.query(
                    `
                    SELECT
                        id,
                        property_code,
                        created_at
                    FROM favorites
                    WHERE user_id = $1
                    ORDER BY created_at DESC
                    `,
                    [req.user.id]
                );

            res.json({
                success: true,
                favorites: result.rows
            });

        }

        catch (error) {

            console.error(
                "GET FAVORITES:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Erreur serveur."
            });

        }

    }
);


/* =========================================================
   ADD FAVORITE
   POST /api/favorites
========================================================= */

router.post(
    "/",
    authenticateToken,
    async (req, res) => {

        try {

            const propertyCode =
                String(
                    req.body.property_code ||
                    ""
                ).trim();


            if (!propertyCode) {

                return res.status(400).json({
                    success: false,
                    message:
                        "property_code est obligatoire."
                });

            }


            const result =
                await pool.query(
                    `
                    INSERT INTO favorites
                    (
                        user_id,
                        property_code
                    )
                    VALUES
                    ($1, $2)

                    ON CONFLICT
                    (
                        user_id,
                        property_code
                    )

                    DO NOTHING

                    RETURNING
                        id,
                        property_code,
                        created_at
                    `,
                    [
                        req.user.id,
                        propertyCode
                    ]
                );


            res.status(201).json({
                success: true,
                favorite:
                    result.rows[0] || null
            });

        }

        catch (error) {

            console.error(
                "ADD FAVORITE:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Erreur serveur."
            });

        }

    }
);


/* =========================================================
   DELETE FAVORITE
   DELETE /api/favorites/:propertyCode
========================================================= */

router.delete(
    "/:propertyCode",
    authenticateToken,
    async (req, res) => {

        try {

            const propertyCode =
                String(
                    req.params.propertyCode ||
                    ""
                ).trim();


            await pool.query(
                `
                DELETE FROM favorites

                WHERE user_id = $1

                AND property_code = $2
                `,
                [
                    req.user.id,
                    propertyCode
                ]
            );


            res.json({
                success: true
            });

        }

        catch (error) {

            console.error(
                "DELETE FAVORITE:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Erreur serveur."
            });

        }

    }
);


/* =========================================================
   SYNC LOCAL FAVORITES
   POST /api/favorites/sync
========================================================= */

router.post(
    "/sync",
    authenticateToken,
    async (req, res) => {

        try {

            const favorites =
                Array.isArray(
                    req.body.favorites
                )
                    ? req.body.favorites
                    : [];


            for (
                const favorite
                of favorites
            ) {

                const propertyCode =
                    String(
                        favorite.property_code ||
                        favorite.code ||
                        favorite.reference ||
                        favorite.id ||
                        ""
                    ).trim();


                if (!propertyCode) {
                    continue;
                }


                await pool.query(
                    `
                    INSERT INTO favorites
                    (
                        user_id,
                        property_code
                    )
                    VALUES
                    ($1, $2)

                    ON CONFLICT
                    (
                        user_id,
                        property_code
                    )

                    DO NOTHING
                    `,
                    [
                        req.user.id,
                        propertyCode
                    ]
                );

            }


            const result =
                await pool.query(
                    `
                    SELECT
                        id,
                        property_code,
                        created_at
                    FROM favorites
                    WHERE user_id = $1
                    ORDER BY created_at DESC
                    `,
                    [req.user.id]
                );


            res.json({
                success: true,
                favorites: result.rows
            });

        }

        catch (error) {

            console.error(
                "SYNC FAVORITES:",
                error
            );

            res.status(500).json({
                success: false,
                message:
                    "Erreur synchronisation."
            });

        }

    }
);


module.exports = router;