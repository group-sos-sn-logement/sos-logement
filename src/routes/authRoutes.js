const express = require("express");


const {
    register,
    login,
    me
} = require("../controllers/authController");


const {
    requestRecovery,
    verifyRecoveryCode,
    resetPassword
} = require("../controllers/recoveryController");


const {
    authenticateToken
} = require("../middleware/authMiddleware");


const router = express.Router();


/* =========================================================
   REGISTER
========================================================= */

router.post(
    "/register",
    register
);


/* =========================================================
   LOGIN
========================================================= */

router.post(
    "/login",
    login
);


/* =========================================================
   CURRENT USER
========================================================= */

router.get(
    "/me",
    authenticateToken,
    me
);


/* =========================================================
   RECOVERY
========================================================= */

router.post(
    "/recovery/request",
    requestRecovery
);


router.post(
    "/recovery/verify",
    verifyRecoveryCode
);


router.post(
    "/recovery/reset",
    resetPassword
);


module.exports = router;