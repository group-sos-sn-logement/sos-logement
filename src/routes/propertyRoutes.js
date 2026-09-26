const express = require("express");

const router = express.Router();

const {
    authenticateToken,
    requireRole
} = require("../middleware/authMiddleware");

const {
    createProperty,
    getApprovedProperties
} = require("../controllers/propertyController");

const {
    addPropertyImages
} = require("../controllers/propertyImageController");


// =====================================================
// GET — العروض المعتمدة فقط للزوار
// =====================================================
router.get(
    "/",
    getApprovedProperties
);


// =====================================================
// POST — إضافة عقار
// المالك فقط
// =====================================================
router.post(
    "/",
    authenticateToken,
    requireRole("owner"),
    createProperty
);


// =====================================================
// POST — إضافة صور العقار
// المالك فقط
// =====================================================
router.post(
    "/:id/images",
    authenticateToken,
    requireRole("owner"),
    addPropertyImages
);


module.exports = router;