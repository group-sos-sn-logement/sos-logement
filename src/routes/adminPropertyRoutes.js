const express = require("express");

const router = express.Router();

const {
    authenticateToken,
    requireRole
} = require("../middleware/authMiddleware");

const {
    getAllHiddenProperties,
    adminHideProperty,
    adminRestoreProperty
} = require("../controllers/adminHiddenPropertiesController");


/* =========================================================
   BIENS MASQUÉS
========================================================= */

router.get(
    "/properties/hidden",
    authenticateToken,
    requireRole("admin"),
    getAllHiddenProperties
);


/* =========================================================
   ADMIN MASQUE
========================================================= */

router.patch(
    "/properties/:id/hide",
    authenticateToken,
    requireRole("admin"),
    adminHideProperty
);


/* =========================================================
   ADMIN RESTAURE
========================================================= */

router.patch(
    "/properties/:id/restore",
    authenticateToken,
    requireRole("admin"),
    adminRestoreProperty
);


module.exports = router;