
const pool = require("../config/database");
const crypto = require("crypto");

/* =====================================================
   HELPERS
===================================================== */

function sendError(res, status, message, extra = {}) {
    return res.status(status).json({
        success: false,
        message,
        ...extra
    });
}

function normalizeGender(gender) {
    return ["male", "female"].includes(gender)
        ? gender
        : null;
}

/* =====================================================
   ADMIN MESSAGE HELPER
   Enregistre le message dans la boîte de réception
===================================================== */

async function saveAdminMessage(
    client,
    {
        propertyCode,
        reservationId = null,
        notificationType,
        studentName,
        gender,
        phone,
        backupPhone,
        nationalityStatus,
        bookingFor,
        propertyTitle
    }
) {
    const genderLabel =
        gender === "male" ? "Masculin" : "Féminin";

    const typeLabel =
        notificationType === "fully_booked"
            ? "Logement étudiant complet"
            : "Nouvelle réservation étudiante";

    const message =
        notificationType === "fully_booked"
            ? `Le logement ${propertyCode} (${propertyTitle}) est complet.`
            : `Nouvelle réservation étudiante pour ${propertyTitle} (${propertyCode}).`;

    const details = {
        property_code: propertyCode,
        reservation_id: reservationId,
        notification_type: notificationType,
        student_name: studentName || null,
        gender,
        gender_label: genderLabel,
        phone: phone || null,
        backup_phone: backupPhone || null,
        nationality_status: nationalityStatus || null,
        booking_for: bookingFor || null
    };

    // Notifications conservées dans la table dédiée
    await client.query(
        `INSERT INTO student_booking_notifications (
            property_code,
            reservation_id,
            notification_type,
            message
        )
        VALUES ($1, $2, $3, $4)`,
        [
            propertyCode,
            reservationId,
            notificationType,
            message
        ]
    );

    // Message visible dans la boîte de réception admin existante
    await client.query(
        `INSERT INTO messages (
            source,
            source_label,
            status,
            full_name,
            phone,
            subject,
            message,
            details
        )
        VALUES (
            'property',
            'student_reservation',
            'new',
            $1,
            $2,
            $3,
            $4,
            $5
        )`,
        [
            studentName || "Administration",
            phone || null,
            typeLabel,
            message,
            details
        ]
    );
}

/* =====================================================
   GET STUDENT OFFERS
   GET /api/student-reservations/offers
===================================================== */

async function getStudentOffers(req, res) {
    try {
        const result = await pool.query(
            `SELECT
                p.property_code,
                p.title,
                p.type,
                p.city,
                p.price_month,
                p.price_week,
                p.price_day,
                p.max_students,
                COALESCE(s.reserved_seats, 0) AS reserved_seats,
                GREATEST(
                    p.max_students - COALESCE(s.reserved_seats, 0),
                    0
                ) AS available_seats,
                s.locked_gender,
                COALESCE(s.is_full, FALSE) AS is_full
             FROM properties p
             LEFT JOIN student_booking_states s
                ON s.property_code = p.property_code
             WHERE p.is_student = TRUE
               AND p.status = 'approved'
               AND COALESCE(p.owner_hidden, FALSE) = FALSE
               AND COALESCE(p.admin_hidden, FALSE) = FALSE
               AND COALESCE(s.reserved_seats, 0) > 0
             ORDER BY p.created_at DESC`
        );

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
        const propertyCode =
            String(req.params.propertyCode || "").trim();

        const result = await pool.query(
            `SELECT
                p.property_code,
                p.title,
                p.max_students,
                p.status,
                p.is_student,
                COALESCE(s.reserved_seats, 0) AS reserved_seats,
                GREATEST(
                    p.max_students - COALESCE(s.reserved_seats, 0),
                    0
                ) AS available_seats,
                s.locked_gender,
                COALESCE(s.is_full, FALSE) AS is_full
             FROM properties p
             LEFT JOIN student_booking_states s
                ON s.property_code = p.property_code
             WHERE p.property_code = $1
             LIMIT 1`,
            [propertyCode]
        );

        if (!result.rows.length) {
            return sendError(res, 404, "Logement introuvable.");
        }

        const property = result.rows[0];

        if (
            property.is_student !== true ||
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
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const {
        property_code,
        booking_for,
        student_name,
        gender: inputGender,
        phone,
        backup_phone,
        nationality_status
    } = req.body;

    const gender = normalizeGender(inputGender);
    const propertyCode = String(property_code || "").trim();

    if (!userId) {
        return sendError(res, 401, "Veuillez vous connecter.");
    }

    if (!propertyCode) {
        return sendError(res, 400, "Référence du logement manquante.");
    }

    if (!["self", "other"].includes(booking_for)) {
        return sendError(
            res,
            400,
            "Choisissez pour qui effectuer la réservation."
        );
    }

    if (!gender) {
        return sendError(res, 400, "Choisissez un genre valide.");
    }

    if (
        typeof student_name !== "string" ||
        !student_name.trim() ||
        typeof phone !== "string" ||
        !phone.trim() ||
        typeof backup_phone !== "string" ||
        !backup_phone.trim()
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
            "Choisissez votre statut : Sénégalais ou diaspora."
        );
    }

    // Uniquement un compte étudiant peut réserver pour lui-même.
    if (booking_for === "self" && userRole !== "student") {
        return sendError(
            res,
            403,
            "La réservation pour soi-même est réservée aux comptes étudiants."
        );
    }

    const client = await pool.connect();
    let transactionStarted = false;

    try {
        await client.query("BEGIN");
        transactionStarted = true;

        // Verrouille le logement pour éviter les réservations simultanées.
        const propertyResult = await client.query(
            `SELECT
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
             FOR UPDATE`,
            [propertyCode]
        );

        if (!propertyResult.rows.length) {
            await client.query("ROLLBACK");
            transactionStarted = false;
            return sendError(res, 404, "Logement introuvable.");
        }

        const property = propertyResult.rows[0];
        const totalSeats = Number(property.max_students);

        if (
            property.is_student !== true ||
            property.status !== "approved" ||
            property.owner_hidden === true ||
            property.admin_hidden === true
        ) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return sendError(
                res,
                400,
                "Ce logement n'est pas disponible à la réservation."
            );
        }

        if (!Number.isInteger(totalSeats) || totalSeats <= 0) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return sendError(
                res,
                400,
                "La capacité étudiante de ce logement n'est pas configurée."
            );
        }

        // Empêche un même étudiant de réserver deux fois le même logement,
        // même avec un autre compte ou en réservant pour une autre personne.
        const normalizedPhone = String(phone)
            .replace(/\D/g, "")
            .slice(-9);

        if (normalizedPhone.length !== 9) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return sendError(
                res,
                400,
                "Veuillez saisir un numéro de téléphone valide."
            );
        }

        const duplicateReservation = await client.query(
            `SELECT id
            FROM student_reservations
            WHERE property_code = $1
            AND RIGHT(REGEXP_REPLACE(phone, '\\D', '', 'g'), 9) = $2
            AND status = 'confirmed'
            LIMIT 1`,
            [propertyCode, normalizedPhone]
        );

        if (duplicateReservation.rows.length > 0) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return sendError(
                res,
                409,
                "Cet étudiant a déjà une réservation confirmée pour ce logement. Vous pouvez réserver un autre logement."
            );
        }

        // Initialise l'état sans écraser les réservations existantes.
        await client.query(
            `INSERT INTO student_booking_states (
                property_code,
                total_seats,
                reserved_seats
             )
             VALUES ($1, $2, 0)
             ON CONFLICT (property_code) DO NOTHING`,
            [propertyCode, totalSeats]
        );

        const stateResult = await client.query(
            `SELECT *
             FROM student_booking_states
             WHERE property_code = $1
             FOR UPDATE`,
            [propertyCode]
        );

        const state = stateResult.rows[0];

        if (Number(state.total_seats) !== totalSeats) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return sendError(
                res,
                409,
                "La capacité a changé. Veuillez contacter l'administration."
            );
        }

        if (
            state.is_full ||
            Number(state.reserved_seats) >= totalSeats
        ) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            return sendError(
                res,
                409,
                "Toutes les places sont déjà réservées."
            );
        }

        // Un compte ne peut pas réserver deux fois pour lui-même.
        if (booking_for === "self") {
            const existing = await client.query(
                `SELECT id
                 FROM student_reservations
                 WHERE property_code = $1
                   AND user_id = $2
                   AND booking_for = 'self'
                   AND status = 'confirmed'
                 LIMIT 1`,
                [propertyCode, userId]
            );

            if (existing.rows.length) {
                await client.query("ROLLBACK");
                transactionStarted = false;

                return sendError(
                    res,
                    409,
                    "Vous avez déjà réservé une place dans ce logement."
                );
            }
        }

        // Le premier genre confirmé détermine celui des réservations suivantes.
        if (state.locked_gender && state.locked_gender !== gender) {
            await client.query("ROLLBACK");
            transactionStarted = false;

            const genderLabel =
                state.locked_gender === "male"
                    ? "masculin"
                    : "féminin";

            return sendError(
                res,
                409,
                `Réservation impossible : la première réservation confirmée était de genre ${genderLabel}.`,
                {
                    code: "GENDER_LOCKED",
                    locked_gender: state.locked_gender
                }
            );
        }

        const reservationCode =
            `ETU-${Date.now()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;

        const reservationResult = await client.query(
            `INSERT INTO student_reservations (
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
             RETURNING *`,
            [
                reservationCode,
                propertyCode,
                userId,
                booking_for,
                student_name.trim(),
                gender,
                phone.trim(),
                backup_phone.trim(),
                nationality_status
            ]
        );

        const reservation = reservationResult.rows[0];
        const reservedSeats = Number(state.reserved_seats) + 1;
        const isFull = reservedSeats >= totalSeats;

        await client.query(
            `UPDATE student_booking_states
             SET
                reserved_seats = $2,
                locked_gender = COALESCE(locked_gender, $3),
                is_full = $4,
                updated_at = NOW()
             WHERE property_code = $1`,
            [
                propertyCode,
                reservedSeats,
                gender,
                isFull
            ]
        );

        // Enregistre le message de chaque réservation dans la boîte admin.
        await saveAdminMessage(client, {
            propertyCode,
            reservationId: reservation.id,
            notificationType: "new_reservation",
            studentName: student_name.trim(),
            gender,
            phone: phone.trim(),
            backupPhone: backup_phone.trim(),
            nationalityStatus: nationality_status,
            bookingFor: booking_for,
            propertyTitle: property.title
        });

        // Si le logement est complet, crée aussi un message dédié.
        if (isFull) {
            await saveAdminMessage(client, {
                propertyCode,
                reservationId: reservation.id,
                notificationType: "fully_booked",
                propertyTitle: property.title
            });
        }

        await client.query("COMMIT");
        transactionStarted = false;

        return res.status(201).json({
            success: true,
            message: isFull
                ? "Réservation confirmée. Toutes les places sont réservées."
                : "Réservation confirmée.",
            reservation,
            booking: {
                total_seats: totalSeats,
                reserved_seats: reservedSeats,
                available_seats: totalSeats - reservedSeats,
                locked_gender: state.locked_gender || gender,
                is_full: isFull
            }
        });
    } catch (error) {
        if (transactionStarted) {
            await client.query("ROLLBACK").catch(() => {});
        }

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

/* =====================================================
   ADMIN — GET NOTIFICATIONS
===================================================== */

async function getAdminStudentNotifications(req, res) {
    try {
        const result = await pool.query(
            `SELECT *
             FROM student_booking_notifications
             ORDER BY created_at DESC
             LIMIT 200`
        );

        return res.json({
            success: true,
            notifications: result.rows
        });
    } catch (error) {
        console.error("GET STUDENT NOTIFICATIONS:", error);

        return sendError(
            res,
            500,
            "Impossible de charger les notifications."
        );
    }
}

/* =====================================================
   ADMIN — MARK NOTIFICATION AS READ
===================================================== */

async function updateStudentNotificationRead(req, res) {
    try {
        const id = Number(req.params.id);

        if (!Number.isInteger(id) || id <= 0) {
            return sendError(res, 400, "Identifiant invalide.");
        }

        const result = await pool.query(
            `UPDATE student_booking_notifications
             SET is_read = TRUE
             WHERE id = $1
             RETURNING *`,
            [id]
        );

        if (!result.rows.length) {
            return sendError(res, 404, "Notification introuvable.");
        }

        return res.json({
            success: true,
            message: "Notification marquée comme lue.",
            notification: result.rows[0]
        });
    } catch (error) {
        console.error("UPDATE STUDENT NOTIFICATION:", error);

        return sendError(
            res,
            500,
            "Impossible de mettre à jour la notification."
        );
    }
}

/* =====================================================
   ADMIN — GET ALL STUDENT RESERVATIONS
   GET /api/student-reservations/admin/reservations
===================================================== */

async function getAdminStudentReservations(req, res) {
    try {
        const result = await pool.query(`
            SELECT
                sr.*,
                p.title AS property_title,
                p.type AS property_type,
                p.city AS property_city,
                p.max_students AS property_capacity
            FROM student_reservations sr
            LEFT JOIN properties p
                ON p.property_code = sr.property_code
            ORDER BY sr.created_at DESC
            LIMIT 1000
        `);

        return res.json({
            success: true,
            total: result.rows.length,
            reservations: result.rows
        });
    } catch (error) {
        console.error("GET ADMIN STUDENT RESERVATIONS:", error);

        return sendError(
            res,
            500,
            "Impossible de charger les réservations étudiantes."
        );
    }
}

module.exports = {
    createStudentReservation,
    getStudentBookingState,
    getStudentOffers,
    getAdminStudentNotifications,
    updateStudentNotificationRead,
    getAdminStudentReservations
};