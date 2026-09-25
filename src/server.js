require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const pool = require("./config/database");

const app = express();

const authRoutes = require("./routes/authRoutes");

const budgetRoutes = require("./routes/budgetRoutes");




app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);

app.use("/api/budget-requests", budgetRoutes);










app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "S.O.S LOGEMENT API fonctionne"
    });
});

app.get("/api/health", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            success: true,
            database: "connected",
            time: result.rows[0].now
        });
    } catch (error) {
        console.error(error);

        res.status(500).json({
            success: false,
            database: "disconnected"
        });
    }
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`🚀 S.O.S LOGEMENT API : http://localhost:${PORT}`);
});
