const express = require("express");
const router = express.Router();

const auth = require("../middleware/auth");
const adminOnly = require("../middleware/adminOnly");

const hotelController =
require("../controllers/hotelController");


// جميع الفنادق
router.get(
  "/hotels",
  auth,
  adminOnly,
  hotelController.getAllHotelsAdmin
);


// الموافقة
router.put(
  "/hotels/:id/approve",
  auth,
  adminOnly,
  hotelController.approveHotel
);


// إخفاء الفندق
router.put(
  "/hotels/:id/hide",
  auth,
  adminOnly,
  hotelController.hideHotel
);


// حذف الفندق
router.delete(
  "/hotels/:id",
  auth,
  adminOnly,
  hotelController.deleteHotel
);

// ===============================
// الفنادق المقبولة
// ===============================

router.get("/hotels-approved", auth, adminOnly, async (req,res)=>{

    try{

        const result = await db.query(`
            SELECT hotels.*, users.first_name,
            users.last_name,
            users.email

            FROM hotels

            JOIN users
            ON hotels.user_id = users.id

            WHERE hotels.approved = true

            ORDER BY hotels.id DESC
        `);

        res.json(result.rows);

    }catch(err){

        console.log(err);
        res.status(500).json({
            error:"Server error"
        });

    }

});

// ===============================
// الفنادق في الانتظار
// ===============================

router.get("/hotels-pending", auth, adminOnly, async (req,res)=>{

    try{

        const result = await db.query(`
            SELECT hotels.*, users.first_name,
            users.last_name,
            users.email

            FROM hotels

            JOIN users
            ON hotels.user_id = users.id

            WHERE hotels.approved = false

            ORDER BY hotels.id DESC
        `);

        res.json(result.rows);

    }catch(err){

        console.log(err);
        res.status(500).json({
            error:"Server error"
        });

    }

});



module.exports = router;