const express = require("express");

const {
    createBudgetRequest
} = require("../controllers/budgetController");

const router = express.Router();


router.post(
    "/",
    createBudgetRequest
);


module.exports = router;
