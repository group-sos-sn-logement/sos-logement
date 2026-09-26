const pool = require("../config/database");


// ==========================================
// AJOUTER UNE PROPRIÉTÉ
// ==========================================

async function createProperty(req, res) {
    try {

        if (req.user.role !== "owner") {
            return res.status(403).json({
                success: false,
                message: "Accès réservé aux propriétaires"
            });
        }

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


        if (!title || !type) {
            return res.status(400).json({
                success: false,
                message: "Le titre et le type sont obligatoires"
            });
        }


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
                $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,
                $11,$12,$13,$14,$15,$16,$17,$18,'pending'
            )
            RETURNING *
            `,
            [
                req.user.id,
                title,
                type,
                description || "",
                city || "",
                exact_location || "",
                price_type || null,
                price_month || 0,
                price_week || 0,
                price_day || 0,
                chambres || 0,
                cuisine || 0,
                sdb || 0,
                salon || 0,
                surface || 0,
                commission || 0,
                is_student || false,
                max_students || 0
            ]
        );


        res.status(201).json({
            success: true,
            message: "Propriété créée et envoyée pour validation",
            property: result.rows[0]
        });


    } catch (error) {

        console.error("❌ CREATE PROPERTY:", error);

        res.status(500).json({
            success: false,
            message: "Erreur lors de la création de la propriété"
        });
    }
}


module.exports = {
    createProperty
};