require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const pool = require("./config/database");

const app = express();

const authRoutes = require("./routes/authRoutes");

const budgetRoutes = require("./routes/budgetRoutes");

const propertyRoutes = require("./routes/propertyRoutes");

const adminRoutes = require("./routes/adminRoutes");

const ownerRoutes = require("./routes/ownerRoutes");

const ownerHiddenPropertyRoutes =
    require("./routes/ownerHiddenPropertyRoutes");

const housingRequestRoutes = require("./routes/housingRequestRoutes");   

const messageRoutes =
    require("./routes/messageRoutes");

const adminPropertyRoutes =
    require("./routes/adminPropertyRoutes");

const securityRoutes =
    require("./routes/securityRoutes");

const favoritesRoutes =
    require("./routes/favoritesRoutes");






app.use(helmet());
const allowedOrigins = [
    "https://soslogement.sn",
    "https://www.soslogement.sn",
    "https://sos-logement.netlify.app",
    "http://127.0.0.1:5501"
];


app.use(
    cors({
        origin: function (origin, callback) {

            // السماح لطلبات السيرفر بدون Origin
            if (!origin) {
                return callback(null, true);
            }

            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            return callback(
                new Error("CORS: Origin non autorisée")
            );
        },

        credentials: true
    })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", authRoutes);

app.use("/api/budget-requests", budgetRoutes);

app.use("/api/properties", propertyRoutes);

app.use("/api/admin", adminRoutes);

app.use("/api/owner", ownerRoutes);

app.use(
    "/api/owner",
    ownerHiddenPropertyRoutes
);

app.use("/api/housing-requests", housingRequestRoutes);

app.use(
    "/api/messages",
    messageRoutes
);

app.use(
    "/api/admin",
    adminPropertyRoutes
);

app.use(
    "/api/admin/security",
    securityRoutes
);


app.use(
    "/api/favorites",
    favoritesRoutes
);










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
