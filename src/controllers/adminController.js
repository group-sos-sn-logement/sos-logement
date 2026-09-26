const pool = require("../config/database");


// =========================================================
// GET ALL OWNERS
// =========================================================

const getAllOwners = async (req, res) => {

    try {

        const result = await pool.query(`
            SELECT
                id,
                name,
                phone,
                email,
                role,
                is_active
            FROM users
            WHERE role = 'owner'
            ORDER BY id DESC
        `);

        res.json(result.rows);

    } catch (error) {

        console.error("Erreur getAllOwners :", error);

        res.status(500).json({
            success: false,
            message: "Erreur serveur"
        });
    }
};


module.exports = {
    getAllOwners
};