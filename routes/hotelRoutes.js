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



const adminOnly =
require("../middleware/adminOnly");



// ===============================
// إنشاء فندق
// ===============================

router.post(
    "/",
    auth,
    hotelController.createHotel
);



// ===============================
// صور الفندق
// ===============================

router.post(
    "/:id/images",
    auth,
    hotelController.addHotelImages
);



// ===============================
// لوجو الفندق
// ===============================

router.post(
    "/:id/logo",
    auth,
    hotelController.addHotelLogo
);



// ===============================
// الفنادق المقبولة
// ===============================

router.get(
    "/",
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