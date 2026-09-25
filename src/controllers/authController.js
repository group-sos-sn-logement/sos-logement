const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");


/* =========================================================
   REGISTER
========================================================= */

const register = async (req, res) => {
    try {

        const {
            name,
            phone,
            password,
            role
        } = req.body;


        if (
            !name ||
            !phone ||
            !password ||
            !role
        ) {
            return res.status(400).json({
                error: "Tous les champs sont obligatoires"
            });
        }


        if (
            !["seeker", "student"].includes(role)
        ) {
            return res.status(400).json({
                error: "Type d'utilisateur invalide"
            });
        }


        const existingUser =
            await pool.query(
                "SELECT id FROM users WHERE phone = $1",
                [phone]
            );


        if (existingUser.rows.length > 0) {

            return res.status(409).json({
                error:
                    "Ce numéro de téléphone est déjà utilisé"
            });

        }


        const passwordHash =
            await bcrypt.hash(
                password,
                12
            );


        const result =
            await pool.query(
                `INSERT INTO users
                    (
                        name,
                        phone,
                        password_hash,
                        role
                    )
                 VALUES
                    ($1, $2, $3, $4)
                 RETURNING
                    id,
                    name,
                    phone,
                    role,
                    created_at`,
                [
                    name,
                    phone,
                    passwordHash,
                    role
                ]
            );


        res.status(201).json({

            success: true,

            message:
                "Compte créé avec succès",

            user:
                result.rows[0]

        });


    } catch (error) {

        console.error(
            "REGISTER ERROR:",
            error
        );


        res.status(500).json({
            error: "Erreur serveur"
        });

    }
};



/* =========================================================
   LOGIN
========================================================= */

const login = async (req, res) => {

    try {

        const {
            phone,
            password
        } = req.body;


        /* -----------------------------------------
           VALIDATION
        ----------------------------------------- */

        if (!phone || !password) {

            return res.status(400).json({
                message:
                    "Numéro de téléphone et mot de passe requis"
            });

        }


        /* -----------------------------------------
           RECHERCHE UTILISATEUR
        ----------------------------------------- */

        const result =
            await pool.query(
                `SELECT
                    id,
                    name,
                    phone,
                    password_hash,
                    role,
                    is_active
                 FROM users
                 WHERE phone = $1`,
                [phone]
            );


        if (result.rows.length === 0) {

            return res.status(401).json({
                message:
                    "Numéro de téléphone ou mot de passe incorrect"
            });

        }


        const user =
            result.rows[0];


        /* -----------------------------------------
           COMPTE DESACTIVE
        ----------------------------------------- */

        if (!user.is_active) {

            return res.status(403).json({
                message:
                    "Votre compte est désactivé"
            });

        }


        /* -----------------------------------------
           VERIFICATION PASSWORD
        ----------------------------------------- */

        const passwordValid =
            await bcrypt.compare(
                password,
                user.password_hash
            );


        if (!passwordValid) {

            return res.status(401).json({
                message:
                    "Numéro de téléphone ou mot de passe incorrect"
            });

        }


        /* -----------------------------------------
           JWT
        ----------------------------------------- */

        const token =
            jwt.sign(
                {
                    id: user.id,
                    phone: user.phone,
                    role: user.role
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "7d"
                }
            );


        /* -----------------------------------------
           REPONSE
        ----------------------------------------- */

        res.json({

            success: true,

            message:
                "Connexion réussie",

            accessToken:
                token,

            user: {
                id: user.id,
                name: user.name,
                phone: user.phone,
                role: user.role
            }

        });


    } catch (error) {

        console.error(
            "LOGIN ERROR:",
            error
        );


        res.status(500).json({
            message:
                "Erreur serveur"
        });

    }
};


/* =========================================================
   CURRENT USER
========================================================= */

const me = async (req, res) => {

    try {

        res.json({

            success: true,

            user: {
                id: req.user.id,
                name: req.user.name,
                phone: req.user.phone,
                role: req.user.role
            }

        });

    } catch (error) {

        console.error(
            "ME ERROR:",
            error
        );

        res.status(500).json({
            message: "Erreur serveur"
        });

    }

};


module.exports = {
    register,
    login,
    me
};
