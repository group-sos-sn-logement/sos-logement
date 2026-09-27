const express = require("express");

const router = express.Router();

const {
    authenticateToken,
    requireRole
} = require("../middleware/authMiddleware");

const {
    createProperty,
    getApprovedProperties,
    getPendingProperties,
    approveProperty,
    rejectProperty,
    getPropertyByCode
} = require("../controllers/propertyController");

const {
    addPropertyImages
} = require("../controllers/propertyImageController");

// =====================================================
// ADMIN — PROPERTY CONTROL
// =====================================================

const {
    updateProperty,
    hideProperty,
    deleteProperty,
    deletePropertyImage,
    setCover
} = require("../controllers/adminPropertyController");


// MODIFIER
router.put(
    "/:id",
    authenticateToken,
    requireRole("admin"),
    updateProperty
);


// MASQUER
router.put(
    "/:id/hide",
    authenticateToken,
    requireRole("admin"),
    hideProperty
);


// SUPPRIMER LE BIEN
router.delete(
    "/:id",
    authenticateToken,
    requireRole("admin"),
    deleteProperty
);


// SUPPRIMER UNE IMAGE
router.delete(
    "/:id/images/:imageId",
    authenticateToken,
    requireRole("admin"),
    deletePropertyImage
);


// IMAGE PRINCIPALE
router.put(
    "/:id/cover",
    authenticateToken,
    requireRole("admin"),
    setCover
);


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

// =====================================================
// ADMIN — PENDING PROPERTIES
// =====================================================
router.get("/code/:code", getPropertyByCode);

// =====================================================
// ADMIN — APPROVED PROPERTIES
// =====================================================

router.get(
    "/approved",
    authenticateToken,
    requireRole("admin"),
    getApprovedProperties
);


router.get(
    "/pending",
    authenticateToken,
    requireRole("admin"),
    getPendingProperties
);


// =====================================================
// ADMIN — APPROVE
// =====================================================

router.patch(
    "/:id/approve",
    authenticateToken,
    requireRole("admin"),
    approveProperty
);


// =====================================================
// ADMIN — REJECT
// =====================================================

router.patch(
    "/:id/reject",
    authenticateToken,
    requireRole("admin"),
    rejectProperty
);


module.exports = router;