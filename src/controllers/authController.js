const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const pool = require("../config/database");

const {
    numberToLetters,
    buildOwnerReference
} = require("../utils/ownerReference");


/* =========================================================
   REGISTER — UTILISATEURS NORMAUX
   name + phone + password + role
========================================================= */

const register = async (req, res) => {

    try {

        const {
            name,
            phone,
            password,
            role
        } = req.body;

        if (!name || !phone || !password || !role) {
            return res.status(400).json({
                message: "Tous les champs sont obligatoires"
            });
        }

        if (!["seeker", "student", "owner"].includes(role)) {
            return res.status(400).json({
                message: "Type d'utilisateur invalide"
            });
        }

        const existingUser = await pool.query(
            `
            SELECT id
            FROM users
            WHERE phone = $1
            `,
            [phone]
        );

        if (existingUser.rows.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Ce numéro existe déjà",
                userExists: true
            });
        }

        const passwordHash =
            await bcrypt.hash(password, 12);

        /* =========================================
           UTILISATEUR NORMAL
        ========================================= */

        if (role !== "owner") {

            const result = await pool.query(
                `
                INSERT INTO users
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
                    is_active
                `,
                [
                    name,
                    phone,
                    passwordHash,
                    role
                ]
            );

            const user = result.rows[0];

            const token = jwt.sign(
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

            return res.status(201).json({
                success: true,
                message: "Compte créé avec succès",
                accessToken: token,
                user
            });
        }

        /* =========================================
           PROPRIÉTAIRE
        ========================================= */

        const client = await pool.connect();

        try {

            await client.query("BEGIN");

            const sequenceResult = await client.query(
                `
                SELECT COUNT(*)::INTEGER AS count
                FROM users
                WHERE owner_code IS NOT NULL
                FOR UPDATE
                `
            );

            const ownerNumber =
                sequenceResult.rows[0].count + 1;

            const ownerCode =
                numberToLetters(ownerNumber);

            const ownerRef =
                buildOwnerReference(ownerCode);

            const result = await client.query(
                `
                INSERT INTO users
                (
                    name,
                    phone,
                    password_hash,
                    role,
                    owner_code,
                    owner_ref,
                    next_offer_number
                )
                VALUES
                (
                    $1,
                    $2,
                    $3,
                    'owner',
                    $4,
                    $5,
                    1
                )
                RETURNING
                    id,
                    name,
                    phone,
                    role,
                    owner_code,
                    owner_ref,
                    next_offer_number,
                    is_active
                `,
                [
                    name,
                    phone,
                    passwordHash,
                    ownerCode,
                    ownerRef
                ]
            );

            await client.query("COMMIT");

            const user = result.rows[0];

            const token = jwt.sign(
                {
                    id: user.id,
                    phone: user.phone,
                    role: "owner"
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "7d"
                }
            );

            return res.status(201).json({
                success: true,
                message:
                    "Compte propriétaire créé avec succès",
                accessToken: token,
                user
            });

        } catch (error) {

            await client.query("ROLLBACK");
            throw error;

        } finally {

            client.release();

        }

    } catch (error) {

        console.error(
            "REGISTER ERROR:",
            error
        );

        return res.status(500).json({
            message: "Erreur serveur"
        });
    }
};


/* =========================================================
   LOGIN NORMAL
   phone + password
   seeker / student / owner
========================================================= */

const login = async (req, res) => {

    try {

        const {
            phone,
            password
        } = req.body;


        if (!phone || !password) {

            return res.status(400).json({
                message:
                    "Numéro de téléphone et mot de passe requis"
            });

        }


        const result = await pool.query(
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


        const user = result.rows[0];


        if (!user.is_active) {

            return res.status(403).json({
                message:
                    "Votre compte est désactivé"
            });

        }


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


        const token = jwt.sign(
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
   ADMIN LOGIN
   phone + email + password
   ADMIN UNIQUEMENT
========================================================= */

const adminLogin = async (req, res) => {

    try {

        const {
            phone,
            email,
            password
        } = req.body;


        /* -----------------------------------------
           VALIDATION
        ----------------------------------------- */

        if (!phone || !email || !password) {

            return res.status(400).json({
                message:
                    "Numéro de téléphone, email et mot de passe requis"
            });

        }


        /* -----------------------------------------
           RECHERCHE ADMIN
        ----------------------------------------- */

        const result = await pool.query(
            `SELECT
                id,
                name,
                phone,
                email,
                password_hash,
                role,
                is_active
             FROM users
             WHERE phone = $1
               AND email = $2
               AND role = 'admin'
             LIMIT 1`,
            [
                phone,
                email
            ]
        );


        if (result.rows.length === 0) {

            return res.status(401).json({
                message:
                    "Identifiants administrateur incorrects"
            });

        }


        const admin = result.rows[0];


        /* -----------------------------------------
           COMPTE ACTIF
        ----------------------------------------- */

        if (!admin.is_active) {

            return res.status(403).json({
                message:
                    "Compte administrateur désactivé"
            });

        }


        /* -----------------------------------------
           PASSWORD
        ----------------------------------------- */

        const passwordValid =
            await bcrypt.compare(
                password,
                admin.password_hash
            );


        if (!passwordValid) {

            return res.status(401).json({
                message:
                    "Identifiants administrateur incorrects"
            });

        }


        /* -----------------------------------------
           JWT ADMIN
        ----------------------------------------- */

        const token = jwt.sign(
            {
                id: admin.id,
                phone: admin.phone,
                role: "admin"
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "8h"
            }
        );


        /* -----------------------------------------
           REPONSE
        ----------------------------------------- */

        res.json({

            success: true,

            message:
                "Connexion administrateur réussie",

            accessToken:
                token,

            user: {
                id: admin.id,
                name: admin.name,
                phone: admin.phone,
                email: admin.email,
                role: admin.role
            }

        });


    } catch (error) {

        console.error(
            "ADMIN LOGIN ERROR:",
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

/* =========================================================
   BECOME OWNER
========================================================= */

const becomeOwner = async (req, res) => {

    const client = await pool.connect();

    try {

        await client.query("BEGIN");

        const userId = req.user.id;

        const userResult = await client.query(
            `
            SELECT
                id,
                name,
                phone,
                email,
                role,
                owner_code,
                owner_ref,
                next_offer_number
            FROM users
            WHERE id = $1
            FOR UPDATE
            `,
            [userId]
        );

        if (userResult.rows.length === 0) {

            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Utilisateur introuvable."
            });
        }

        const user = userResult.rows[0];

        let ownerCode = user.owner_code;
        let ownerRef = user.owner_ref;
        let nextOfferNumber = user.next_offer_number;

        /* =========================================
           DÉJÀ PROPRIÉTAIRE
        ========================================= */

        if (user.role === "owner" && ownerCode && ownerRef) {

            await client.query("COMMIT");

            const accessToken = jwt.sign(
                {
                    id: user.id,
                    phone: user.phone,
                    role: "owner"
                },
                process.env.JWT_SECRET,
                {
                    expiresIn: "7d"
                }
            );

            return res.json({
                success: true,
                message: "Votre compte est déjà propriétaire.",
                accessToken,
                user
            });
        }

        /* =========================================
           NOUVEAU PROPRIÉTAIRE
        ========================================= */

        const countResult = await client.query(
            `
            SELECT COUNT(*)::INTEGER AS count
            FROM users
            WHERE owner_code IS NOT NULL
            `
        );

        const ownerNumber =
            countResult.rows[0].count + 1;

        ownerCode =
            numberToLetters(ownerNumber);

        ownerRef =
            buildOwnerReference(ownerCode);

        nextOfferNumber = 1;

        const result = await client.query(
            `
            UPDATE users
            SET
                role = 'owner',
                owner_code = $1,
                owner_ref = $2,
                next_offer_number = $3,
                updated_at = NOW()
            WHERE id = $4
            RETURNING
                id,
                name,
                phone,
                email,
                role,
                owner_code,
                owner_ref,
                next_offer_number,
                is_active
            `,
            [
                ownerCode,
                ownerRef,
                nextOfferNumber,
                userId
            ]
        );

        await client.query("COMMIT");

        const updatedUser = result.rows[0];

        const accessToken = jwt.sign(
            {
                id: updatedUser.id,
                phone: updatedUser.phone,
                role: "owner"
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "7d"
            }
        );

        return res.json({

            success: true,

            message:
                "Votre compte est maintenant propriétaire.",

            accessToken,

            user: updatedUser,

            owner: {
                id: updatedUser.id,
                name: updatedUser.name,
                phone: updatedUser.phone,
                role: "owner",
                ownerRef: updatedUser.owner_ref
            }

        });

    } catch (error) {

        await client.query("ROLLBACK");

        console.error(
            "BECOME OWNER ERROR:",
            error
        );

        return res.status(500).json({
            success: false,
            message: "Erreur serveur."
        });

    } finally {

        client.release();

    }
};


module.exports = {
    register,
    login,
    adminLogin,
    me,
    becomeOwner
};