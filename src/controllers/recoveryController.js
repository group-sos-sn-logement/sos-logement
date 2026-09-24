const bcrypt = require("bcrypt");
const pool = require("../config/database");

const recoveryCodes = new Map();

const requestRecovery = async (req, res) => {
    try {
        const { phone } = req.body;

        if (!phone) {
            return res.status(400).json({
                error: "Numéro de téléphone requis"
            });
        }

        const result = await pool.query(
            "SELECT id, phone FROM users WHERE phone = $1 AND is_active = TRUE",
            [phone]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                error: "Aucun compte trouvé avec ce numéro"
            });
        }

        const code = Math.floor(100000 + Math.random() * 900000).toString();

        recoveryCodes.set(phone, {
            code,
            expires: Date.now() + 10 * 60 * 1000
        });

        console.log(`🔐 CODE RECUPERATION ${phone}: ${code}`);

        res.json({
            success: true,
            message: "Code de vérification généré"
        });

    } catch (error) {
        console.error("RECOVERY REQUEST ERROR:", error);

        res.status(500).json({
            error: "Erreur serveur"
        });
    }
};


const verifyRecoveryCode = async (req, res) => {
    try {
        const { phone, code } = req.body;

        const recovery = recoveryCodes.get(phone);

        if (!recovery) {
            return res.status(400).json({
                error: "Code invalide"
            });
        }

        if (Date.now() > recovery.expires) {
            recoveryCodes.delete(phone);

            return res.status(400).json({
                error: "Code expiré"
            });
        }

        if (recovery.code !== code) {
            return res.status(400).json({
                error: "Code incorrect"
            });
        }

        recoveryCodes.set(phone, {
            ...recovery,
            verified: true
        });

        res.json({
            success: true,
            message: "Numéro vérifié"
        });

    } catch (error) {
        console.error("VERIFY RECOVERY ERROR:", error);

        res.status(500).json({
            error: "Erreur serveur"
        });
    }
};


const resetPassword = async (req, res) => {
    try {
        const { phone, password } = req.body;

        const recovery = recoveryCodes.get(phone);

        if (!recovery || !recovery.verified) {
            return res.status(403).json({
                error: "Vérification requise"
            });
        }

        if (Date.now() > recovery.expires) {
            recoveryCodes.delete(phone);

            return res.status(400).json({
                error: "Session expirée"
            });
        }

        if (!password || password.length < 6) {
            return res.status(400).json({
                error: "Le mot de passe doit contenir au moins 6 caractères"
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        await pool.query(
            `UPDATE users
             SET password_hash = $1,
                 updated_at = NOW()
             WHERE phone = $2`,
            [passwordHash, phone]
        );

        recoveryCodes.delete(phone);

        res.json({
            success: true,
            message: "Mot de passe modifié avec succès"
        });

    } catch (error) {
        console.error("RESET PASSWORD ERROR:", error);

        res.status(500).json({
            error: "Erreur serveur"
        });
    }
};


module.exports = {
    requestRecovery,
    verifyRecoveryCode,
    resetPassword
};