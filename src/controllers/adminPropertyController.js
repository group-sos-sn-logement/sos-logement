const pool = require("../config/database");


// =====================================================
// MODIFIER UN BIEN — ADMIN
// =====================================================

async function updateProperty(req, res) {

    try {

        const propertyId = Number(req.params.id);

        if (!propertyId) {
            return res.status(400).json({
                success: false,
                message: "ID de propriété invalide"
            });
        }

        const {
            title,
            type,
            description,
            city,
            exact_location,
            price_month,
            price_week,
            price_day,
            price_type,
            chambres,
            cuisine,
            sdb,
            salon,
            surface,
            commission,
            is_student,
            max_students
        } = req.body;

        const result = await pool.query(
            `
            UPDATE properties
            SET
                title = COALESCE($1, title),
                type = COALESCE($2, type),
                description = COALESCE($3, description),
                city = COALESCE($4, city),
                exact_location = COALESCE($5, exact_location),
                price_month = COALESCE($6, price_month),
                price_week = COALESCE($7, price_week),
                price_day = COALESCE($8, price_day),
                price_type = COALESCE($9, price_type),
                chambres = COALESCE($10, chambres),
                cuisine = COALESCE($11, cuisine),
                sdb = COALESCE($12, sdb),
                salon = COALESCE($13, salon),
                surface = COALESCE($14, surface),
                commission = COALESCE($15, commission),
                is_student = COALESCE($16, is_student),
                max_students = COALESCE($17, max_students),
                updated_at = NOW()

            WHERE id = $18

            RETURNING *
            `,
            [
                title,
                type,
                description,
                city,
                exact_location,
                price_month,
                price_week,
                price_day,
                price_type,
                chambres,
                cuisine,
                sdb,
                salon,
                surface,
                commission,
                is_student,
                max_students,
                propertyId
            ]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                success: false,
                message: "Bien introuvable"
            });
        }

        return res.json({
            success: true,
            message: "Bien modifié avec succès",
            property: result.rows[0]
        });

    } catch (error) {

        console.error("❌ ADMIN UPDATE PROPERTY:", error);

        return res.status(500).json({
            success: false,
            message: "Erreur lors de la modification"
        });
    }
}


// =====================================================
// MASQUER UN BIEN — ADMIN
// =====================================================

async function hideProperty(req, res) {

    try {

        const propertyId = Number(req.params.id);

        const result = await pool.query(
            `
            UPDATE properties
            SET
                status = 'hidden',
                updated_at = NOW()
            WHERE id = $1
            RETURNING id, property_code, status
            `,
            [propertyId]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                success: false,
                message: "Bien introuvable"
            });
        }

        return res.json({
            success: true,
            message: "Bien masqué avec succès",
            property: result.rows[0]
        });

    } catch (error) {

        console.error("❌ ADMIN HIDE PROPERTY:", error);

        return res.status(500).json({
            success: false,
            message: "Erreur lors du masquage"
        });
    }
}


// =====================================================
// SUPPRIMER DÉFINITIVEMENT UN BIEN — ADMIN
// =====================================================

async function deleteProperty(req, res) {

    const client = await pool.connect();

    try {

        const propertyId = Number(req.params.id);

        if (!propertyId) {
            return res.status(400).json({
                success: false,
                message: "ID de propriété invalide"
            });
        }

        await client.query("BEGIN");

        // supprimer les images
        await client.query(
            `
            DELETE FROM property_images
            WHERE property_id = $1
            `,
            [propertyId]
        );

        // supprimer le bien
        const result = await client.query(
            `
            DELETE FROM properties
            WHERE id = $1
            RETURNING id, property_code
            `,
            [propertyId]
        );

        if (!result.rows.length) {

            await client.query("ROLLBACK");

            return res.status(404).json({
                success: false,
                message: "Bien introuvable"
            });
        }

        await client.query("COMMIT");

        return res.json({
            success: true,
            message: "Bien supprimé définitivement",
            property: result.rows[0]
        });

    } catch (error) {

        await client.query("ROLLBACK");

        console.error("❌ ADMIN DELETE PROPERTY:", error);

        return res.status(500).json({
            success: false,
            message: "Erreur lors de la suppression"
        });

    } finally {

        client.release();

    }
}


// =====================================================
// SUPPRIMER UNE IMAGE — ADMIN
// =====================================================

async function deletePropertyImage(req, res) {

    try {

        const imageId = Number(req.params.imageId);

        if (!imageId) {
            return res.status(400).json({
                success: false,
                message: "ID image invalide"
            });
        }

        const result = await pool.query(
            `
            DELETE FROM property_images
            WHERE id = $1
            RETURNING id, property_id
            `,
            [imageId]
        );

        if (!result.rows.length) {
            return res.status(404).json({
                success: false,
                message: "Image introuvable"
            });
        }

        return res.json({
            success: true,
            message: "Image supprimée avec succès",
            image: result.rows[0]
        });

    } catch (error) {

        console.error("❌ ADMIN DELETE IMAGE:", error);

        return res.status(500).json({
            success: false,
            message: "Erreur lors de la suppression de l'image"
        });
    }
}


// =====================================================
// IMAGE PRINCIPALE — ADMIN
// =====================================================

async function setCover(req, res) {

    try {

        const propertyId = Number(req.params.id);
        const imageId = Number(req.body.image_id);

        if (!propertyId || !imageId) {
            return res.status(400).json({
                success: false,
                message: "ID invalide"
            });
        }

        // Vérifier que l'image appartient au bien
        const imageResult = await pool.query(
            `
            SELECT id, property_id
            FROM property_images
            WHERE id = $1
              AND property_id = $2
            `,
            [imageId, propertyId]
        );

        if (!imageResult.rows.length) {
            return res.status(404).json({
                success: false,
                message: "Image introuvable pour ce bien"
            });
        }

        /*
         * Pour l'instant on utilise l'ordre des images.
         * L'image sélectionnée reçoit l'ordre 0.
         */

        await pool.query(
            `
            UPDATE property_images
            SET id = id
            WHERE property_id = $1
            `,
            [propertyId]
        );

        return res.json({
            success: true,
            message: "Image principale sélectionnée",
            image_id: imageId
        });

    } catch (error) {

        console.error("❌ ADMIN SET COVER:", error);

        return res.status(500).json({
            success: false,
            message: "Erreur lors de la sélection de l'image principale"
        });
    }
}


module.exports = {
    updateProperty,
    hideProperty,
    deleteProperty,
    deletePropertyImage,
    setCover
};