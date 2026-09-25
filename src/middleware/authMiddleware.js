const jwt = require("jsonwebtoken");
const pool = require("../config/database");


/* =========================================================
   VERIFY TOKEN
========================================================= */

const authenticateToken = async (req, res, next) => {

    try {

        const authHeader =
            req.headers.authorization;


        if (
            !authHeader ||
            !authHeader.startsWith("Bearer ")
        ) {

            return res.status(401).json({
                message: "Authentification requise"
            });

        }


        const token =
            authHeader.split(" ")[1];


        const decoded =
            jwt.verify(
                token,
                process.env.JWT_SECRET
            );


        const result =
            await pool.query(
                `SELECT
                    id,
                    name,
                    phone,
                    role,
                    is_active
                 FROM users
                 WHERE id = $1`,
                [decoded.id]
            );


        if (result.rows.length === 0) {

            return res.status(401).json({
                message: "Utilisateur introuvable"
            });

        }


        const user =
            result.rows[0];


        if (!user.is_active) {

            return res.status(403).json({
                message: "Compte désactivé"
            });

        }


        req.user = user;

        next();


    } catch (error) {

        console.error(
            "AUTH MIDDLEWARE ERROR:",
            error
        );


        return res.status(401).json({
            message: "Token invalide ou expiré"
        });

    }

};


/* =========================================================
   ROLE CHECK
========================================================= */

const requireRole = (...allowedRoles) => {

    return (req, res, next) => {

        if (!req.user) {

            return res.status(401).json({
                message: "Authentification requise"
            });

        }


        if (
            !allowedRoles.includes(
                req.user.role
            )
        ) {

            return res.status(403).json({
                message: "Accès refusé"
            });

        }


        next();

    };

};


module.exports = {
    authenticateToken,
    requireRole
};
