const express = require("express");

const router = express.Router();


const {
    authenticateToken,
    requireRole
} = require("../middleware/authMiddleware");


const {
    createProperty
} = require("../controllers/propertyController");


const {
    addPropertyImages
} = require("../controllers/propertyImageController");


// ======================================================
// CRÉER UNE PROPRIÉTÉ
// ======================================================

router.post(
    "/",
    authenticateToken,
    requireRole("owner"),
    createProperty
);


// ======================================================
// AJOUTER LES IMAGES D'UNE PROPRIÉTÉ
// ======================================================

router.post(
    "/:id/images",
    authenticateToken,
    requireRole("owner"),
    addPropertyImages
);


module.exports = router;