const express = require("express");

const router = express.Router();

const {
authenticateToken
} = require("../middleware/authMiddleware");

const {
createStudentReservation,
getStudentBookingState,
getStudentOffers
} = require("../controllers/studentReservationController");

/*
GET /api/student-reservations/offers
العروض الطلابية التي بدأ الحجز عليها
*/
router.get(
"/offers",
getStudentOffers
);

/*
GET /api/student-reservations/:propertyCode/state
حالة المقاعد والجنس المسموح
*/
router.get(
"/:propertyCode/state",
getStudentBookingState
);

/*
POST /api/student-reservations
إنشاء حجز جديد
*/
router.post(
"/",
authenticateToken,
createStudentReservation
);

module.exports = router;
