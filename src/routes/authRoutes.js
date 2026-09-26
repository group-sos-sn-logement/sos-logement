const express = require("express");

const router = express.Router();

const {
    register,
    login,
    adminLogin,
    me
} = require("../controllers/authController");

const {
    authenticateToken
} = require("../middleware/authMiddleware");

const {
    register,
    login,
    adminLogin,
    me,
    becomeOwner
} = require("../controllers/authController");

const {
    authenticateToken,
    requireRole
} = require("../middleware/authMiddleware");


router.post("/register", register);

router.post("/login", login);

router.post("/admin-login", adminLogin);

router.get(
    "/me",
    authenticateToken,
    me
);


/* =========================================================
   BECOME OWNER
========================================================= */

router.post(
    "/become-owner",
    authenticateToken,
    becomeOwner
);


/* INSCRIPTION NORMALE */
router.post("/register", register);


/* CONNEXION NORMALE */
router.post("/login", login);


/* CONNEXION ADMIN */
router.post("/admin-login", adminLogin);


/* UTILISATEUR CONNECTÉ */
router.get("/me", authenticateToken, me);


module.exports = router;