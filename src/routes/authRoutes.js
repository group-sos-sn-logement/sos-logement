const express = require("express");

const {
    register
} = require("../controllers/authController");

const {
    requestRecovery,
    verifyRecoveryCode,
    resetPassword
} = require("../controllers/recoveryController");

const router = express.Router();

router.post("/register", register);

router.post("/recovery/request", requestRecovery);
router.post("/recovery/verify", verifyRecoveryCode);
router.post("/recovery/reset", resetPassword);

module.exports = router;