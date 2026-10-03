const express = require("express");

const router = express.Router();

const {
    getAllOwners,
    getAllStudents,
    getAllSeekers
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

router.get(
    "/users/students",
    authenticateToken,
    requireRole("admin"),
    getAllStudents
);


router.get(
    "/users/seekers",
    authenticateToken,
    requireRole("admin"),
    getAllSeekers
);

module.exports = router;