const express = require("express");

const router = express.Router();

const {
    authenticateToken,
    requireRole
} = require("../middleware/authMiddleware");

const {
    getSecurityEvents
} = require("../controllers/securityController");


router.get(
    "/events",
    authenticateToken,
    requireRole("admin"),
    getSecurityEvents
);


module.exports = router;