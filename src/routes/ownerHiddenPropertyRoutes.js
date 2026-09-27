const express = require("express");

const router = express.Router();

const {
    authenticateToken,
    requireRole
} = require("../middleware/authMiddleware");

const {
    getHiddenProperties,
    restoreProperty,
    deletePropertyConfirm
} = require("../controllers/ownerHiddenPropertyController");


router.use(
    authenticateToken,
    requireRole("owner")
);


/* Mes biens masqués */
router.get(
    "/properties-hidden",
    getHiddenProperties
);


/* Réactiver */
router.put(
    "/properties/:id/restore",
    restoreProperty
);


/* Suppression définitive */
router.delete(
    "/properties/:id/delete-confirm",
    deletePropertyConfirm
);


module.exports = router;