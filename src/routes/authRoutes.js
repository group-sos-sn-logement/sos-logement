const express = require("express");

const router = express.Router();

const {
    register,
    login,
    adminLogin,
    me,
    becomeOwner
} = require("../controllers/authController");

const {
    authenticateToken
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


module.exports = router;