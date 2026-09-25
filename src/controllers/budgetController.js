const pool = require("../config/database");
const { sendBudgetRequestEmail } = require("../services/notifications");


const createBudgetRequest = async (req, res) => {

    try {

        const {
            full_name,
            email,
            phone,
            zone,
            house_type,
            budget,
            user_type,
            students_number,
            note
        } = req.body;


        if (
            !full_name ||
            !email ||
            !phone ||
            !zone ||
            !house_type ||
            !budget ||
            !user_type
        ) {

            return res.status(400).json({
                success: false,
                message: "Veuillez remplir tous les champs obligatoires."
            });

        }


        const result = await pool.query(
            `INSERT INTO budget_requests
            (
                full_name,
                email,
                phone,
                zone,
                house_type,
                budget,
                user_type,
                students_number,
                note
            )
            VALUES
            ($1,$2,$3,$4,$5,$6,$7,$8,$9)
            RETURNING *`,
            [
                full_name,
                email,
                phone,
                zone,
                house_type,
                budget,
                user_type,
                students_number || null,
                note || null
            ]
        );


        const request = result.rows[0];


        /* =========================================
           SEND EMAIL TO S.O.S LOGEMENT
        ========================================= */

        try {

            await sendBudgetRequestEmail(request);

        } catch (emailError) {

            console.error(
                "BUDGET EMAIL ERROR:",
                emailError
            );

        }


        res.status(201).json({

            success: true,

            message:
                "Votre demande a été envoyée avec succès.",

            request: {

                id:
                    request.id,

                created_at:
                    request.created_at

            }

        });


    } catch (error) {

        console.error(
            "CREATE BUDGET REQUEST ERROR:",
            error
        );


        res.status(500).json({

            success: false,

            message:
                "Erreur lors de l'envoi de votre demande."

        });

    }

};


module.exports = {
    createBudgetRequest
};