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
                owner_ref,
                owner_code,
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


async function getAllStudents(req, res) {
    try {

        const result = await pool.query(`
            SELECT
                id,
                name,
                phone,
                email,
                role,
                is_active,
                created_at
            FROM users
            WHERE role = 'student'
            ORDER BY created_at DESC
        `);

        return res.json({
            success: true,
            students: result.rows
        });

    } catch (error) {

        console.error(
            "GET ALL STUDENTS ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Erreur lors du chargement des étudiants."
        });
    }
}

module.exports = {
    getAllOwners,
    getAllStudents
};