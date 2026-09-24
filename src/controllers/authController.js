const bcrypt = require("bcrypt");
const pool = require("../config/database");

const register = async (req, res) => {
    try {
        const { name, phone, password, role } = req.body;

        if (!name || !phone || !password || !role) {
            return res.status(400).json({
                error: "Tous les champs sont obligatoires"
            });
        }

        if (!["seeker", "student"].includes(role)) {
            return res.status(400).json({
                error: "Type d'utilisateur invalide"
            });
        }

        const existingUser = await pool.query(
            "SELECT id FROM users WHERE phone = $1",
            [phone]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                error: "Ce numéro de téléphone est déjà utilisé"
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const result = await pool.query(
            `INSERT INTO users
                (name, phone, password_hash, role)
             VALUES
                ($1, $2, $3, $4)
             RETURNING id, name, phone, role, created_at`,
            [name, phone, passwordHash, role]
        );

        res.status(201).json({
            success: true,
            message: "Compte créé avec succès",
            user: result.rows[0]
        });

    } catch (error) {
        console.error("REGISTER ERROR:", error);

        res.status(500).json({
            error: "Erreur serveur"
        });
    }
};

module.exports = {
    register
};