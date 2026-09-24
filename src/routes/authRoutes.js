const express = require("express");

const {
    register,
    login
} = require("../controllers/authController");

const {
    requestRecovery,
    verifyRecoveryCode,
    resetPassword
} = require("../controllers/recoveryController");


const router = express.Router();


/* =========================================================
   AUTH
========================================================= */

router.post(
    "/register",
    register
);


router.post(
    "/login",
    login
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