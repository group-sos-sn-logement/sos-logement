const express = require("express");

const router = express.Router();

const {
    authenticateToken,
    requireRole
} = require("../middleware/authMiddleware");

const {
    createMessage,
    getMessages,
    getMessage,
    updateMessageStatus,
    replyMessage,
    deleteMessage
} = require("../controllers/messageController");


/* =========================================================
   PUBLIC — RECEIVE MESSAGE
========================================================= */

router.post(
    "/",
    createMessage
);


/* =========================================================
   ADMIN — GET ALL
========================================================= */

router.get(
    "/admin",
    authenticateToken,
    requireRole("admin"),
    getMessages
);


/* =========================================================
   ADMIN — GET ONE
========================================================= */

router.get(
    "/admin/:id",
    authenticateToken,
    requireRole("admin"),
    getMessage
);


/* =========================================================
   ADMIN — STATUS
========================================================= */

router.patch(
    "/admin/:id/status",
    authenticateToken,
    requireRole("admin"),
    updateMessageStatus
);


/* =========================================================
   ADMIN — REPLY
========================================================= */

router.patch(
    "/admin/:id/reply",
    authenticateToken,
    requireRole("admin"),
    replyMessage
);


/* =========================================================
   ADMIN — DELETE
========================================================= */

router.delete(
    "/admin/:id",
    authenticateToken,
    requireRole("admin"),
    deleteMessage
);


module.exports = router;