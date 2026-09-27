const express = require("express");

const router = express.Router();

const {
    authenticateToken,
    requireRole
} = require("../middleware/authMiddleware");

const {
    getMyProperties,
    getMyProperty,
    updateMyProperty,
    hideMyProperty,
    searchMyProperties,
    deleteMyImage
} = require("../controllers/ownerPropertyController");


/* =====================================================
   TOUTES LES ROUTES SONT PROTÉGÉES
===================================================== */

router.use(
    authenticateToken,
    requireRole("owner")
);


/* =====================================================
   MES BIENS
===================================================== */

router.get(
    "/my-properties",
    getMyProperties
);


/* =====================================================
   RECHERCHE — MES BIENS UNIQUEMENT
===================================================== */

router.get(
    "/search-properties",
    searchMyProperties
);


/* =====================================================
   UN BIEN — PROPRIÉTAIRE CONNECTÉ UNIQUEMENT
===================================================== */

router.get(
    "/properties/:id",
    getMyProperty
);


/* =====================================================
   MODIFIER
===================================================== */

router.put(
    "/properties/:id",
    updateMyProperty
);


/* =====================================================
   MASQUER
===================================================== */

router.put(
    "/properties/:id/hide",
    hideMyProperty
);


/* =====================================================
   SUPPRIMER UNE IMAGE
===================================================== */

router.delete(
    "/images/:id",
    deleteMyImage
);


module.exports = router;