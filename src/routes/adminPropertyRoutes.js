const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/authMiddleware");

const {
    getAllHiddenProperties,
    adminHideProperty,
    adminRestoreProperty
} = require("../controllers/adminHiddenPropertiesController");


/* =========================================================
   ADMIN ONLY
========================================================= */

function adminOnly(req, res, next) {

    if (!req.user || req.user.role !== "admin") {

        return res.status(403).json({
            success: false,
            message: "Accès réservé à l'administrateur."
        });

    }

    next();
}


/* Tous les biens masqués */

router.get(
    "/properties/hidden",
    authMiddleware,
    adminOnly,
    getAllHiddenProperties
);


/* Admin masque */

router.patch(
    "/properties/:id/hide",
    authMiddleware,
    adminOnly,
    adminHideProperty
);


/* Admin réactive */

router.patch(
    "/properties/:id/restore",
    authMiddleware,
    adminOnly,
    adminRestoreProperty
);


module.exports = router;