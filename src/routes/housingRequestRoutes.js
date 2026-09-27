const express = require("express");

const router = express.Router();

const {
    createHousingRequest,
    getHousingRequests,
    getHousingRequest,
    replyHousingRequest,
    updateHousingRequestStatus
} = require("../controllers/housingRequestController");

const {
    authenticateToken,
    requireRole
} = require("../middleware/authMiddleware");


/* =========================================================
   PUBLIC
========================================================= */

router.post("/", createHousingRequest);


/* =========================================================
   ADMIN
========================================================= */

router.get(
    "/admin",
    authenticateToken,
    requireRole("admin"),
    getHousingRequests
);

router.get(
    "/admin/:id",
    authenticateToken,
    requireRole("admin"),
    getHousingRequest
);

router.patch(
    "/admin/:id/reply",
    authenticateToken,
    requireRole("admin"),
    replyHousingRequest
);

router.patch(
    "/admin/:id/status",
    authenticateToken,
    requireRole("admin"),
    updateHousingRequestStatus
);


module.exports = router;