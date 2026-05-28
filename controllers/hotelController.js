const db = require("../db");


// ===============================
// إنشاء فندق
// ===============================

exports.createHotel = async (req, res) => {

    try {

        const user_id = req.user.id;

        const {

            hotel_name,
            hotel_type,
            city_region,
            full_address,
            google_maps,
            hotel_phone,
            hotel_email,
            description_hotel,

            checkin,
            checkout,

            familles_groupes,
            max_personnes,

            rooms_services,
            hotel_services,

            reception,
            payment_methods,

            choses_interdites,

            extra_rules,

            proche_de,
            nearby_places,

            rooms

        } = req.body;


        const result = await db.query(

            `
            INSERT INTO hotels (

                user_id,

                hotel_name,
                hotel_type,
                city_region,
                full_address,
                google_maps,

                hotel_phone,
                hotel_email,

                description_hotel,

                checkin,
                checkout,

                familles_groupes,
                max_personnes,

                rooms_services,
                hotel_services,

                reception,
                payment_methods,

                choses_interdites,

                extra_rules,

                proche_de,
                nearby_places,

                rooms

            )

            VALUES (

                $1,$2,$3,$4,$5,$6,
                $7,$8,$9,$10,$11,
                $12,$13,$14,$15,
                $16,$17,$18,$19,
                $20,$21,$22

            )

            RETURNING *
            `,

            [

                user_id,

                hotel_name,
                hotel_type,
                city_region,
                full_address,
                google_maps,

                hotel_phone,
                hotel_email,

                description_hotel,

                checkin,
                checkout,

                familles_groupes,
                max_personnes,

                rooms_services,
                hotel_services,

                reception,
                payment_methods,

                choses_interdites,

                extra_rules,

                proche_de,
                nearby_places,

                rooms

            ]

        );

        res.status(201).json({

            message: "Hôtel créé",

            hotel: result.rows[0]

        });

    }

    catch(err){

        console.error(err);

        res.status(500).json({

            message: "Erreur serveur"

        });

    }

};



// ===============================
// رفع الصور
// ===============================

exports.addHotelImages = async (req, res) => {

    try {

        const hotelId = req.params.id;

        const { images } = req.body;

        for(const img of images){

            await db.query(

                `
                INSERT INTO hotel_images (

                    hotel_id,
                    url,
                    public_id,
                    resource_type

                )

                VALUES ($1,$2,$3,$4)
                `,

                [

                    hotelId,
                    img.url,
                    img.public_id,
                    img.resource_type

                ]

            );

        }

        res.json({

            message: "Images ajoutées"

        });

    }

    catch(err){

        console.error(err);

        res.status(500).json({

            message: "Erreur serveur"

        });

    }

};




// ===============================
// إضافة اللوجو
// ===============================

exports.addHotelLogo = async (req, res) => {

    try {

        const hotelId = req.params.id;

        const {

            logo_url,
            logo_public_id

        } = req.body;

        await db.query(

            `
            UPDATE hotels

            SET

            logo_url = $1,
            logo_public_id = $2

            WHERE id = $3
            `,

            [

                logo_url,
                logo_public_id,
                hotelId

            ]

        );

        res.json({

            message: "Logo ajouté"

        });

    }

    catch(err){

        console.error(err);

        res.status(500).json({

            message: "Erreur serveur"

        });

    }

};




// ===============================
// الفنادق المقبولة فقط
// ===============================

exports.getApprovedHotels = async (req, res) => {

    try {

        const result = await db.query(

            `
            SELECT *

            FROM hotels

            WHERE approved = true

            ORDER BY created_at DESC
            `
        );

        res.json(result.rows);

    }

    catch(err){

        console.error(err);

        res.status(500).json({

            message: "Erreur serveur"

        });

    }

};




// ===============================
// جميع الفنادق للأدمن
// ===============================

exports.getAllHotelsAdmin = async (req, res) => {

    try {

        const result = await db.query(

            `
            SELECT *

            FROM hotels

            ORDER BY created_at DESC
            `
        );

        res.json(result.rows);

    }

    catch(err){

        console.error(err);

        res.status(500).json({

            message: "Erreur serveur"

        });

    }

};




// ===============================
// الموافقة على الفندق
// ===============================

exports.approveHotel = async (req, res) => {

    try {

        const hotelId = req.params.id;

        await db.query(

            `
            UPDATE hotels

            SET approved = true

            WHERE id = $1
            `,

            [hotelId]

        );

        res.json({

            message: "Hôtel approuvé"

        });

    }

    catch(err){

        console.error(err);

        res.status(500).json({

            message: "Erreur serveur"

        });

    }

};