const express = require("express");
const router = express.Router();

const { authenticateToken, requireRole } = require("../middleware/authMiddleware");

const {
    createProperty
} = require("../controllers/propertyController");

router.post(
    "/",
    authenticateToken,
    requireRole("owner"),
    createProperty
);

module.exports = router;