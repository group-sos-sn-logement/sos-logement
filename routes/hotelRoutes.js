const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");

const hotelController =
require("../controllers/hotelController");

// إنشاء فندق
router.post(
    "/",
    auth,
    hotelController.createHotel
);

// صور الفندق
router.post(
    "/:id/images",
    auth,
    hotelController.addHotelImages
);

// لوجو الفندق
router.post(
    "/:id/logo",
    auth,
    hotelController.addHotelLogo
);

// الفنادق المقبولة
router.get(
    "/",
    hotelController.getApprovedHotels
);

// الأدمن
router.get(
    "/admin/hotels",
    auth,
    adminOnly,
    hotelController.getAllHotelsAdmin
);

// الموافقة
router.put(
    "/admin/hotels/:id/approve",
    auth,
    adminOnly,
    hotelController.approveHotel
);

module.exports = router;