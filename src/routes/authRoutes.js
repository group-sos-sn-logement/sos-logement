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


/* INSCRIPTION NORMALE */
router.post("/register", register);


/* CONNEXION NORMALE */
router.post("/login", login);


/* CONNEXION ADMIN */
router.post("/admin-login", adminLogin);


/* UTILISATEUR CONNECTÉ */
router.get("/me", authenticateToken, me);


module.exports = router;