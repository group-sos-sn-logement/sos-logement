const pool = require("../config/database");


// ======================================================
// AJOUTER LES IMAGES D'UNE PROPRIÉTÉ
// ======================================================

async function addPropertyImages(req, res) {

    try {

        const propertyId = Number(req.params.id);

        const { images } = req.body;


        // ------------------------------------------------
        // Vérification ID
        // ------------------------------------------------

        if (!propertyId) {

            return res.status(400).json({
                success: false,
                message: "ID de propriété invalide"
            });

        }


        // ------------------------------------------------
        // Vérification images
        // ------------------------------------------------

        if (!Array.isArray(images) || images.length === 0) {

            return res.status(400).json({
                success: false,
                message: "Aucune image reçue"
            });

        }


        // ------------------------------------------------
        // Maximum 10 images
        // ------------------------------------------------

        if (images.length > 10) {

            return res.status(400).json({
                success: false,
                message: "Maximum 10 fichiers autorisés"
            });

        }


        // ------------------------------------------------
        // Vérifier que la propriété appartient
        // au propriétaire connecté
        // ------------------------------------------------

        const propertyResult = await pool.query(
            `
            SELECT id, owner_id
            FROM properties
            WHERE id = $1
            `,
            [propertyId]
        );


        if (propertyResult.rows.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Propriété introuvable"
            });

        }


        const property = propertyResult.rows[0];


        if (
            Number(property.owner_id) !==
            Number(req.user.id)
        ) {

            return res.status(403).json({
                success: false,
                message: "Vous n'êtes pas propriétaire de ce bien"
            });

        }


        // ------------------------------------------------
        // Insérer les images
        // ------------------------------------------------

        const insertedImages = [];


        for (const image of images) {

            if (!image.url) {
                continue;
            }


            const result = await pool.query(
                `
                INSERT INTO property_images (
                    property_id,
                    url,
                    public_id,
                    resource_type
                )
                VALUES ($1, $2, $3, $4)
                RETURNING *
                `,
                [
                    propertyId,
                    image.url,
                    image.public_id || null,
                    image.resource_type || null
                ]
            );


            insertedImages.push(
                result.rows[0]
            );

        }


        // ------------------------------------------------
        // Réponse
        // ------------------------------------------------

        return res.status(201).json({

            success: true,

            message:
                "Les médias ont été enregistrés avec succès",

            property_id:
                propertyId,

            images:
                insertedImages

        });


    } catch (error) {

        console.error(
            "❌ ADD PROPERTY IMAGES:",
            error
        );


        return res.status(500).json({

            success: false,

            message:
                "Erreur lors de l'enregistrement des médias"

        });

    }

}


module.exports = {
    addPropertyImages
};