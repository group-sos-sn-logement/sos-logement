const express = require("express");

const router = express.Router();

const {
    getAllOwners
} = require("../controllers/adminController");

const {
    authenticateToken,
    requireRole
} = require("../middleware/authMiddleware");


// =========================================================
// GET ALL OWNERS
// =========================================================

router.get(
    "/owners",
    authenticateToken,
    requireRole("admin"),
    getAllOwners
);


module.exports = router;