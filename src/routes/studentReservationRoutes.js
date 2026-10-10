const express = require("express");
const router = express.Router();

const {
    authenticateToken,
    requireRole
} = require("../middleware/authMiddleware");

const {
    createStudentReservation,
    getStudentBookingState,
    getStudentOffers,
    getAdminStudentNotifications,
    updateStudentNotificationRead,
    getAdminStudentReservations
} = require("../controllers/studentReservationController");

// العروض الطلابية التي بدأ الحجز عليها
router.get("/offers", getStudentOffers);

// حالة المقاعد والجنس المسموح
router.get("/:propertyCode/state", getStudentBookingState);

// إنشاء حجز
router.post(
    "/",
    authenticateToken,
    createStudentReservation
);

// إشعارات الإدارة
router.get(
    "/admin/notifications",
    authenticateToken,
    requireRole("admin"),
    getAdminStudentNotifications
);

router.patch(
    "/admin/notifications/:id/read",
    authenticateToken,
    requireRole("admin"),
    updateStudentNotificationRead
);

/* ADMIN — ALL STUDENT RESERVATIONS */
router.get(
    "/admin/reservations",
    authenticateToken,
    requireRole("admin"),
    getAdminStudentReservations
);

module.exports = router;