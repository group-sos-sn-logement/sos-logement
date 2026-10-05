const jwt = require("jsonwebtoken");
const pool = require("../config/database");

const securityAttempts = new Map();

const SECURITY_WINDOW = 10 * 60 * 1000; // 10 minutes
const SECURITY_MAX_ATTEMPTS = 10;

function isSecurityBlocked(ip) {

    const now = Date.now();

    const data = securityAttempts.get(ip);

    if (!data) {
        securityAttempts.set(ip, {
            count: 1,
            firstAttempt: now
        });

        return false;
    }

    if (now - data.firstAttempt > SECURITY_WINDOW) {

        securityAttempts.set(ip, {
            count: 1,
            firstAttempt: now
        });

        return false;
    }

    data.count++;

    if (data.count > SECURITY_MAX_ATTEMPTS) {
        return true;
    }

    return false;
}


/* =========================================================
   LOG TENTATIVE D'ACCÈS NON AUTORISÉE
========================================================= */

async function logSecurityEvent(req, type, message) {

    try {

        const ip =
            req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
            || req.socket.remoteAddress
            || "unknown";

        const userAgent =
            req.headers["user-agent"]
            || "unknown";

        await pool.query(
            `
            INSERT INTO security_events (
                event_type,
                message,
                user_id,
                ip_address,
                user_agent,
                method,
                path
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            `,
            [
                type,
                message,
                req.user?.id || null,
                ip,
                userAgent,
                req.method,
                req.originalUrl
            ]
        );

        console.warn(
            "🚨 SECURITY EVENT:",
            type,
            message,
            "IP:",
            ip,
            "PATH:",
            req.originalUrl
        );

    } catch (error) {

        console.error(
            "SECURITY LOG ERROR:",
            error
        );

    }
}

/* =========================================================
   VERIFY TOKEN
========================================================= */

const authenticateToken = async (req, res, next) => {

    try {

        const authHeader =
            req.headers.authorization;


        /* TOKEN ABSENT */

        if (
            !authHeader ||
            !authHeader.startsWith("Bearer ")
        ) {

            await logSecurityEvent(
                req,
                "NO_TOKEN",
                "Tentative d'accès sans authentification"
            );

            return res.status(401).json({
                success: false,
                message: "Authentification requise"
            });

        }


        const token =
            authHeader.split(" ")[1];


        /* TOKEN INVALIDE */

        let decoded;

        try {

            decoded =
                jwt.verify(
                    token,
                    process.env.JWT_SECRET
                );

        } catch (error) {

            const ip =
                req.headers["x-forwarded-for"]?.split(",")[0]?.trim()
                || req.socket.remoteAddress
                || "unknown";


            const blocked =
                isSecurityBlocked(ip);


            await logSecurityEvent(
                req,
                "INVALID_TOKEN",
                blocked
                    ? "Trop de tentatives avec un token invalide"
                    : "Token invalide ou expiré"
            );


            if (blocked) {

                return res.status(429).json({
                    success: false,
                    message:
                        "Trop de tentatives. Veuillez patienter."
                });

            }


            return res.status(401).json({
                success: false,
                message:
                    "Token invalide ou expiré"
            });

        }


        /* UTILISATEUR */

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

            await logSecurityEvent(
                req,
                "UNKNOWN_USER",
                "Token associé à un utilisateur inexistant"
            );

            return res.status(401).json({
                success: false,
                message: "Utilisateur introuvable"
            });

        }


        const user =
            result.rows[0];


        /* COMPTE DÉSACTIVÉ */

        if (!user.is_active) {

            await logSecurityEvent(
                req,
                "DISABLED_ACCOUNT",
                `Compte désactivé: ${user.id}`
            );

            return res.status(403).json({
                success: false,
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

        return res.status(500).json({
            success: false,
            message: "Erreur d'authentification"
        });

    }

};


/* =========================================================
   ROLE CHECK
========================================================= */

const requireRole = (...allowedRoles) => {

    return async (req, res, next) => {

        if (!req.user) {

            await logSecurityEvent(
                req,
                "NO_USER",
                "Accès sans utilisateur authentifié"
            );

            return res.status(401).json({
                success: false,
                message: "Authentification requise"
            });

        }


        if (
            !allowedRoles.includes(
                req.user.role
            )
        ) {

            await logSecurityEvent(
                req,
                "FORBIDDEN_ROLE",
                `Utilisateur ${req.user.id} (${req.user.role}) a tenté un accès réservé à: ${allowedRoles.join(", ")}`
            );

            return res.status(403).json({
                success: false,
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