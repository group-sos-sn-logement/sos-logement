const pool = require("../config/database");

/* =====================================================
HELPERS
===================================================== */

function sendError(res, status, message) {
return res.status(status).json({
success: false,
message
});
}

function getPropertyCode(value) {
return String(value || "").trim();
}

/* =====================================================
GET STUDENT OFFERS
GET /api/student-reservations/offers
===================================================== */

async function getStudentOffers(req, res) {
try {
const result = await pool.query(`             SELECT
                p.property_code,
                p.title,
                p.type,
                p.city,
                p.price_month,
                p.price_week,
                p.price_day,
                p.max_students,
                p.status,
                COALESCE(sbs.reserved_seats, 0) AS reserved_seats,
                GREATEST(
                    p.max_students - COALESCE(sbs.reserved_seats, 0),
                    0
                ) AS available_seats,
                sbs.locked_gender,
                COALESCE(sbs.is_full, FALSE) AS is_full
            FROM properties p
            LEFT JOIN student_booking_states sbs
                ON sbs.property_code = p.property_code
            WHERE p.is_student = TRUE
              AND p.status = 'approved'
              AND COALESCE(p.owner_hidden, FALSE) = FALSE
              AND COALESCE(p.admin_hidden, FALSE) = FALSE
              AND COALESCE(sbs.is_full, FALSE) = FALSE
            ORDER BY p.created_at DESC
        `);


    return res.json({
        success: true,
        offers: result.rows
    });
} catch (error) {
    console.error("GET STUDENT OFFERS:", error);

    return sendError(
        res,
        500,
        "Impossible de charger les offres étudiantes."
    );
}


}

/* =====================================================
GET BOOKING STATE
GET /api/student-reservations/:propertyCode/state
===================================================== */

async function getStudentBookingState(req, res) {
try {
const propertyCode = getPropertyCode(
req.params.propertyCode
);


    const result = await pool.query(
        `
        SELECT
            p.property_code,
            p.title,
            p.max_students,
            p.status,
            p.is_student,
            COALESCE(sbs.reserved_seats, 0) AS reserved_seats,
            GREATEST(
                p.max_students - COALESCE(sbs.reserved_seats, 0),
                0
            ) AS available_seats,
            sbs.locked_gender,
            COALESCE(sbs.is_full, FALSE) AS is_full
        FROM properties p
        LEFT JOIN student_booking_states sbs
            ON sbs.property_code = p.property_code
        WHERE p.property_code = $1
        LIMIT 1
        `,
        [propertyCode]
    );

    if (!result.rows.length) {
        return sendError(res, 404, "Logement introuvable.");
    }

    const property = result.rows[0];

    if (
        !property.is_student ||
        property.status !== "approved"
    ) {
        return sendError(
            res,
            400,
            "Ce logement n'est pas disponible pour la réservation étudiante."
        );
    }

    return res.json({
        success: true,
        property
    });
} catch (error) {
    console.error("GET STUDENT BOOKING STATE:", error);

    return sendError(
        res,
        500,
        "Impossible de consulter les places disponibles."
    );
}


}

/* =====================================================
CREATE STUDENT RESERVATION
POST /api/student-reservations
===================================================== */

async function createStudentReservation(req, res) {
const {
property_code,
booking_for,
student_name,
gender,
phone,
backup_phone,
nationality_status
} = req.body;


const userId = req.user?.id;
const userRole = req.user?.role;

if (!userId) {
    return sendError(
        res,
        401,
        "Veuillez vous connecter."
    );
}

if (!["self", "other"].includes(booking_for)) {
    return sendError(
        res,
        400,
        "Choisissez pour qui effectuer la réservation."
    );
}

if (!["male", "female"].includes(gender)) {
    return sendError(
        res,
        400,
        "Choisissez un genre valide."
    );
}

if (
    !student_name ||
    !String(student_name).trim() ||
    !phone ||
    !String(phone).trim() ||
    !backup_phone ||
    !String(backup_phone).trim()
) {
    return sendError(
        res,
        400,
        "Le nom, le téléphone et le numéro de secours sont obligatoires."
    );
}

if (
    !["senegalese", "diaspora"].includes(nationality_status)
) {
    return sendError(
        res,
        400,
        "Choisissez votre statut."
    );
}

if (
    booking_for === "self" &&
    userRole !== "student"
) {
    return sendError(
        res,
        403,
        "La réservation pour soi-même est réservée aux comptes étudiants."
    );
}

const propertyCode = getPropertyCode(property_code);

if (!propertyCode) {
    return sendError(
        res,
        400,
        "Référence du logement manquante."
    );
}

const client = await pool.connect();

try {
    await client.query("BEGIN");

    const propertyResult = await client.query(
        `
        SELECT
            id,
            property_code,
            title,
            is_student,
            max_students,
            status,
            owner_hidden,
            admin_hidden
        FROM properties
        WHERE property_code = $1
        FOR UPDATE
        `,
        [propertyCode]
    );

    if (!propertyResult.rows.length) {
        await client.query("ROLLBACK");
        return sendError(res, 404, "Logement introuvable.");
    }

    const property = propertyResult.rows[0];

    if (
        property.is_student !== true ||
        property.status !== "approved" ||
        property.owner_hidden === true ||
        property.admin_hidden === true
    ) {
        await client.query("ROLLBACK");
        return sendError(
            res,
            400,
            "Ce logement n'est pas disponible à la réservation."
        );
    }

    const totalSeats = Number(property.max_students);

    if (!Number.isInteger(totalSeats) || totalSeats <= 0) {
        await client.query("ROLLBACK");
        return sendError(
            res,
            400,
            "La capacité étudiante de ce logement n'est pas configurée."
        );
    }

    /*
      Initialiser l'état à partir de la capacité du logement.
      Ne pas écraser l'état existant.
    */
    await client.query(
        `
        INSERT INTO student_booking_states (
            property_code,
            total_seats,
            reserved_seats
        )
        VALUES ($1, $2, 0)
        ON CONFLICT (property_code) DO NOTHING
        `,
        [propertyCode, totalSeats]
    );

    const stateResult = await client.query(
        `
        SELECT *
        FROM student_booking_states
        WHERE property_code = $1
        FOR UPDATE
        `,
        [propertyCode]
    );

    const state = stateResult.rows[0];

    if (Number(state.total_seats) !== totalSeats) {
        await client.query("ROLLBACK");
        return sendError(
            res,
            409,
            "La capacité du logement a changé. Veuillez contacter l'administration."
        );
    }

    if (
        state.is_full ||
        Number(state.reserved_seats) >= totalSeats
    ) {
        await client.query("ROLLBACK");
        return sendError(
            res,
            409,
            "Toutes les places de ce logement sont réservées."
        );
    }

    /*
      Un même compte étudiant ne peut pas réserver
      plusieurs places pour lui-même dans ce logement.
    */
    if (booking_for === "self") {
        const existing = await client.query(
            `
            SELECT id
            FROM student_reservations
            WHERE property_code = $1
              AND user_id = $2
              AND booking_for = 'self'
              AND status = 'confirmed'
            LIMIT 1
            `,
            [propertyCode, userId]
        );

        if (existing.rows.length) {
            await client.query("ROLLBACK");
            return sendError(
                res,
                409,
                "Vous avez déjà réservé une place dans ce logement."
            );
        }
    }

    /*
      Le premier genre confirmé verrouille le genre
      autorisé pour les réservations suivantes.
    */
    if (
        state.locked_gender &&
        state.locked_gender !== gender
    ) {
        await client.query("ROLLBACK");

        const genderLabel =
            state.locked_gender === "male"
                ? "masculin"
                : "féminin";

        return res.status(409).json({
            success: false,
            code: "GENDER_LOCKED",
            locked_gender: state.locked_gender,
            message:
                `Les réservations de ce logement sont réservées au genre ${genderLabel}, car la première réservation confirmée était de ce genre.`
        });
    }

    const reservationCode =
        `ETU-${Date.now()}-${Math.floor(
            1000 + Math.random() * 9000
        )}`;

    const reservationResult = await client.query(
        `
        INSERT INTO student_reservations (
            reservation_code,
            property_code,
            user_id,
            booking_for,
            student_name,
            gender,
            phone,
            backup_phone,
            nationality_status,
            status
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'confirmed')
        RETURNING
            id,
            reservation_code,
            property_code,
            booking_for,
            student_name,
            gender,
            phone,
            backup_phone,
            nationality_status,
            status,
            created_at
        `,
        [
            reservationCode,
            propertyCode,
            userId,
            booking_for,
            String(student_name).trim(),
            gender,
            String(phone).trim(),
            String(backup_phone).trim(),
            nationality_status
        ]
    );

    const reservation = reservationResult.rows[0];

    const newReservedSeats =
        Number(state.reserved_seats) + 1;

    const isFull = newReservedSeats >= totalSeats;

    await client.query(
        `
        UPDATE student_booking_states
        SET
            reserved_seats = $2,
            locked_gender = COALESCE(locked_gender, $3),
            is_full = $4,
            updated_at = NOW()
        WHERE property_code = $1
        `,
        [
            propertyCode,
            newReservedSeats,
            gender,
            isFull
        ]
    );

    const genderLabel =
        gender === "male" ? "Masculin" : "Féminin";

    await client.query(
        `
        INSERT INTO student_booking_notifications (
            property_code,
            reservation_id,
            notification_type,
            message
        )
        VALUES ($1, $2, 'new_reservation', $3)
        `,
        [
            propertyCode,
            reservation.id,
            `Nouvelle réservation étudiante : ${reservation.student_name}, téléphone ${reservation.phone}, secours ${reservation.backup_phone}, genre ${genderLabel}, statut ${nationality_status}, logement ${propertyCode}.`
        ]
    );

    if (isFull) {
        await client.query(
            `
            INSERT INTO student_booking_notifications (
                property_code,
                reservation_id,
                notification_type,
                message
            )
            VALUES ($1, $2, 'fully_booked', $3)
            `,
            [
                propertyCode,
                reservation.id,
                `Le logement ${propertyCode} (${property.title}) est complet : ${newReservedSeats}/${totalSeats} places réservées.`
            ]
        );
    }

    await client.query("COMMIT");

    return res.status(201).json({
        success: true,
        message: isFull
            ? "Réservation confirmée. Toutes les places sont maintenant réservées."
            : "Réservation confirmée.",
        reservation,
        booking: {
            total_seats: totalSeats,
            reserved_seats: newReservedSeats,
            available_seats: totalSeats - newReservedSeats,
            locked_gender: state.locked_gender || gender,
            is_full: isFull
        }
    });
} catch (error) {
    await client.query("ROLLBACK");

    if (error.code === "23505") {
        return sendError(
            res,
            409,
            "Cette réservation existe déjà."
        );
    }

    console.error("CREATE STUDENT RESERVATION:", error);

    return sendError(
        res,
        500,
        "Une erreur est survenue lors de la réservation."
    );
} finally {
    client.release();
}


}

module.exports = {
createStudentReservation,
getStudentBookingState,
getStudentOffers
};
