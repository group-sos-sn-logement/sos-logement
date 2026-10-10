
const express = require("express");
const router = express.Router();

const pool = require("../config/database");

const {
    authenticateToken,
    requireRole
} = require("../middleware/authMiddleware");

// GET — الأخبار المنشورة للزوار
router.get("/", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT id, type, title, content, created_at
            FROM news
            WHERE is_published = TRUE
            ORDER BY created_at DESC, id DESC
        `);

        res.json({
            success: true,
            news: result.rows
        });
    } catch (error) {
        console.error("GET NEWS:", error);
        res.status(500).json({
            success: false,
            message: "Impossible de charger les actualités."
        });
    }
});

// GET — جميع الأخبار للمدير، المنشورة والمسودات
router.get(
    "/admin",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {
        try {
            const result = await pool.query(`
                SELECT id, type, title, content, is_published, created_at
                FROM news
                ORDER BY created_at DESC, id DESC
            `);

            res.json({ success: true, news: result.rows });
        } catch (error) {
            console.error("ADMIN GET NEWS:", error);
            res.status(500).json({
                success: false,
                message: "Impossible de charger les actualités."
            });
        }
    }
);

// POST — إنشاء خبر ونشره أو حفظه كمسودة
router.post(
    "/",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {
        try {
            const { type, title, content, is_published = true } = req.body;

            const allowedTypes = [
                "info",
                "offer",
                "student",
                "reservation"
            ];

            if (
                !allowedTypes.includes(type) ||
                typeof title !== "string" ||
                !title.trim() ||
                typeof content !== "string" ||
                !content.trim()
            ) {
                return res.status(400).json({
                    success: false,
                    message: "Veuillez renseigner le type, le titre et le contenu."
                });
            }

            const result = await pool.query(
                `INSERT INTO news
                    (type, title, content, is_published)
                 VALUES ($1, $2, $3, $4)
                 RETURNING id, type, title, content, is_published, created_at`,
                [
                    type,
                    title.trim(),
                    content.trim(),
                    is_published === true
                ]
            );

            res.status(201).json({
                success: true,
                message: is_published
                    ? "Actualité publiée avec succès."
                    : "Brouillon enregistré avec succès.",
                news: result.rows[0]
            });
        } catch (error) {
            console.error("CREATE NEWS:", error);
            res.status(500).json({
                success: false,
                message: "Impossible d'enregistrer cette actualité."
            });
        }
    }
);

// PATCH — نشر مسودة أو إلغاء نشر خبر
router.patch(
    "/:id/publish",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {
        try {
            const { is_published } = req.body;

            if (typeof is_published !== "boolean") {
                return res.status(400).json({
                    success: false,
                    message: "État de publication invalide."
                });
            }

            const result = await pool.query(
                `UPDATE news
                 SET is_published = $1
                 WHERE id = $2
                 RETURNING id, type, title, content, is_published, created_at`,
                [is_published, req.params.id]
            );

            if (!result.rowCount) {
                return res.status(404).json({
                    success: false,
                    message: "Actualité introuvable."
                });
            }

            res.json({
                success: true,
                message: "Statut de publication mis à jour.",
                news: result.rows[0]
            });
        } catch (error) {
            console.error("UPDATE NEWS STATUS:", error);
            res.status(500).json({
                success: false,
                message: "Impossible de modifier la publication."
            });
        }
    }
);

// DELETE — حذف خبر
router.delete(
    "/:id",
    authenticateToken,
    requireRole("admin"),
    async (req, res) => {
        try {
            const result = await pool.query(
                "DELETE FROM news WHERE id = $1 RETURNING id",
                [req.params.id]
            );

            if (!result.rowCount) {
                return res.status(404).json({
                    success: false,
                    message: "Actualité introuvable."
                });
            }

            res.json({
                success: true,
                message: "Actualité supprimée."
            });
        } catch (error) {
            console.error("DELETE NEWS:", error);
            res.status(500).json({
                success: false,
                message: "Impossible de supprimer cette actualité."
            });
        }
    }
);

module.exports = router;
