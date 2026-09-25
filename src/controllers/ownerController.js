const bcrypt = require("bcrypt");
const pool = require("../config/database");

const {
    numberToLetters,
    buildOwnerReference
} = require("../utils/ownerReference");

const {
    sendOwnerEmail,
    sendOwnerWhatsApp
} = require("../services/notifications");


/* =========================================================
   CREATE OWNER / UPGRADE USER
========================================================= */

const becomeOwner = async (req, res) => {

    const client =
        await pool.connect();

    try {

        const {
            name,
            phone,
            password
        } = req.body;


        const existingUser =
            req.user || null;


        /* =================================================
           VALIDATION
        ================================================= */

        if (!existingUser) {

            if (
                !name ||
                !phone ||
                !password
            ) {

                return res.status(400).json({
                    message:
                        "Nom, téléphone et mot de passe requis"
                });

            }

        }


        await client.query("BEGIN");


        /* =================================================
           GET / CREATE USER
        ================================================= */

        let user;


        if (existingUser) {

            const result =
                await client.query(
                    `SELECT
                        id,
                        name,
                        phone,
                        role,
                        owner_ref,
                        owner_code
                     FROM users
                     WHERE id = $1
                     FOR UPDATE`,
                    [existingUser.id]
                );


            if (!result.rows.length) {

                throw new Error(
                    "Utilisateur introuvable"
                );

            }


            user =
                result.rows[0];

        }

        else {

            const existing =
                await client.query(
                    `SELECT id
                     FROM users
                     WHERE phone = $1`,
                    [phone]
                );


            if (existing.rows.length) {

                throw new Error(
                    "Ce numéro de téléphone est déjà utilisé. Connectez-vous d'abord."
                );

            }


            const passwordHash =
                await bcrypt.hash(
                    password,
                    12
                );


            const result =
                await client.query(
                    `INSERT INTO users
                    (
                        name,
                        phone,
                        password_hash,
                        role
                    )
                    VALUES
                    ($1,$2,$3,'owner')
                    RETURNING
                        id,
                        name,
                        phone,
                        role`,
                    [
                        name,
                        phone,
                        passwordHash
                    ]
                );


            user =
                result.rows[0];

        }


        /* =================================================
           ALREADY OWNER
        ================================================= */

        if (
            user.role === "owner" &&
            user.owner_ref
        ) {

            await client.query("COMMIT");

            return res.json({

                success: true,

                message:
                    "Vous êtes déjà propriétaire",

                user

            });

        }


        /* =================================================
           GENERATE OWNER CODE
        ================================================= */

        const countResult =
            await client.query(
                `SELECT COUNT(*)::INTEGER AS count
                 FROM users
                 WHERE owner_code IS NOT NULL`
            );


        const ownerNumber =
            countResult.rows[0].count + 1;


        const ownerCode =
            numberToLetters(
                ownerNumber
            );


        const ownerRef =
            buildOwnerReference(
                ownerCode
            );


        /* =================================================
           UPDATE USER
        ================================================= */

        const updated =
            await client.query(
                `UPDATE users

                SET
                    role = 'owner',
                    owner_code = $1,
                    owner_ref = $2,
                    next_offer_number = 1,
                    updated_at = NOW()

                 WHERE id = $3

                 RETURNING
                    id,
                    name,
                    phone,
                    role,
                    owner_code,
                    owner_ref,
                    next_offer_number`,
                [
                    ownerCode,
                    ownerRef,
                    user.id
                ]
            );


        const owner =
            updated.rows[0];


        await client.query("COMMIT");


        /* =================================================
           NOTIFICATIONS
        ================================================= */

        try {

            await sendOwnerEmail({

                name:
                    owner.name,

                phone:
                    owner.phone,


                ownerRef:
                    owner.owner_ref

            });

        }

        catch (emailError) {

            console.error(
                "OWNER EMAIL ERROR:",
                emailError
            );

        }


        try {

            await sendOwnerWhatsApp({

                phone:
                    owner.phone,

                name:
                    owner.name,

                ownerRef:
                    owner.owner_ref

            });

        }

        catch (whatsappError) {

            console.error(
                "OWNER WHATSAPP ERROR:",
                whatsappError
            );

        }


        res.status(201).json({

            success: true,

            message:
                "Votre demande a été acceptée. Vous êtes maintenant propriétaire.",

            owner: {

                id:
                    owner.id,

                name:
                    owner.name,

                phone:
                    owner.phone,

                role:
                    owner.role,

                ownerRef:
                    owner.owner_ref

            }

        });


    }

    catch (error) {

        await client.query("ROLLBACK");

        console.error(
            "BECOME OWNER ERROR:",
            error
        );


        res.status(400).json({

            success: false,

            message:
                error.message ||
                "Impossible de devenir propriétaire"

        });

    }

    finally {

        client.release();

    }

};


module.exports = {
    becomeOwner
};