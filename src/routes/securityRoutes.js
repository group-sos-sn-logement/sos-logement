const express = require("express");

const router = express.Router();

const {
    getSecurityEvents
} = require("../controllers/securityController");

const {
    authenticateToken,
    requireRole
} = require("../middleware/authMiddleware");


router.get(
    "/events",
    authenticateToken,
    requireRole("admin"),
    getSecurityEvents
);


module.exports = router;