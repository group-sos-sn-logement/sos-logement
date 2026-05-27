const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");

router.post("/", auth, async (req,res)=>{

    res.json({
        message:"Hotel route works"
    });

});

module.exports = router;


const hotelController =
require("../controllers/hotelController");

const auth =
require("../middleware/auth");

const adminOnly =
require("../middleware/adminOnly");



// ===============================
// إنشاء فندق
// ===============================

router.post(
    "/hotels",
    auth,
    hotelController.createHotel
);



// ===============================
// صور الفندق
// ===============================

router.post(
    "/hotels/:id/images",
    auth,
    hotelController.addHotelImages
);



// ===============================
// لوجو الفندق
// ===============================

router.post(
    "/hotels/:id/logo",
    auth,
    hotelController.addHotelLogo
);



// ===============================
// الفنادق المقبولة
// ===============================

router.get(
    "/hotels",
    hotelController.getApprovedHotels
);




// ===============================
// الأدمن
// ===============================

router.get(
    "/admin/hotels",
    auth,
    adminOnly,
    hotelController.getAllHotelsAdmin
);




// ===============================
// الموافقة على الفندق
// ===============================

router.put(
    "/admin/hotels/:id/approve",
    auth,
    adminOnly,
    hotelController.approveHotel
);

module.exports = router;