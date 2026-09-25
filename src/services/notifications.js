const nodemailer = require("nodemailer");


/* =========================================================
   GMAIL
========================================================= */
const dns = require("dns");

dns.setDefaultResultOrder("ipv4first");

const transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,

    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD
    }
});


/* =========================================================
   EMAIL — PROPRIÉTAIRE
========================================================= */

async function sendOwnerEmail({
    name,
    phone,
    email,
    ownerRef
}) {

    await transporter.sendMail({

        from:
            `"S.O.S LOGEMENT" <${process.env.EMAIL_USER}>`,

        to:
            "sos.sn.logement@gmail.com",

        subject:
            "Nouveau propriétaire accepté — S.O.S LOGEMENT",

        html: `
            <div style="font-family:Arial,sans-serif">

                <h2>Nouveau propriétaire</h2>

                <p>
                    Un utilisateur vient de devenir
                    propriétaire sur S.O.S LOGEMENT.
                </p>

                <hr>

                <p>
                    <strong>Nom :</strong>
                    ${name}
                </p>

                <p>
                    <strong>Téléphone :</strong>
                    ${phone}
                </p>

                <p>
                    <strong>E-mail :</strong>
                    ${email || "Non renseigné"}
                </p>

                <p>
                    <strong>Référence propriétaire :</strong>
                    ${ownerRef}
                </p>

            </div>
        `

    });

}


/* =========================================================
   WHATSAPP
========================================================= */

async function sendOwnerWhatsApp({
    phone,
    name,
    ownerRef
}) {

    if (
        !process.env.WHATSAPP_TOKEN ||
        !process.env.WHATSAPP_PHONE_NUMBER_ID
    ) {

        console.warn("⚠️ WhatsApp non configuré");

        return;

    }

    const recipient =
        phone.replace(/\D/g, "");

    const message =

`Bonjour ${name},

Votre demande pour devenir propriétaire sur S.O.S LOGEMENT a été acceptée.

Votre code propriétaire est :

${ownerRef}

Vous pouvez maintenant revenir sur le site S.O.S LOGEMENT, vous connecter avec votre numéro de téléphone, puis cliquer sur :

« Ajouter un bien »

Bienvenue dans S.O.S LOGEMENT.`;

    const response =
        await fetch(
            `https://graph.facebook.com/${process.env.WHATSAPP_API_VERSION || "v23.0"}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`,
            {
                method: "POST",

                headers: {
                    "Authorization":
                        `Bearer ${process.env.WHATSAPP_TOKEN}`,

                    "Content-Type":
                        "application/json"
                },

                body: JSON.stringify({

                    messaging_product:
                        "whatsapp",

                    recipient_type:
                        "individual",

                    to:
                        recipient,

                    type:
                        "text",

                    text: {
                        body:
                            message
                    }

                })

            }
        );

    const data =
        await response.json();

    if (!response.ok) {

        console.error(
            "WHATSAPP ERROR:",
            data
        );

        throw new Error(
            "Impossible d'envoyer le message WhatsApp"
        );

    }

    return data;

}


/* =========================================================
   EMAIL — DEMANDE SELON LE BUDGET
========================================================= */

async function sendBudgetRequestEmail(request) {

    await transporter.sendMail({

        from:
            `"S.O.S LOGEMENT" <${process.env.EMAIL_USER}>`,

        to:
            process.env.EMAIL_USER,

        subject:
            `Nouvelle demande de logement — ${request.full_name}`,

        html: `

            <div style="
                font-family: Arial, sans-serif;
                max-width: 700px;
                margin: auto;
                padding: 30px;
            ">

                <h2>
                    🏠 Nouvelle demande de logement
                </h2>

                <hr>

                <p>
                    <strong>Nom :</strong>
                    ${request.full_name}
                </p>

                <p>
                    <strong>E-mail :</strong>
                    ${request.email}
                </p>

                <p>
                    <strong>Téléphone :</strong>
                    ${request.phone}
                </p>

                <p>
                    <strong>Zone recherchée :</strong>
                    ${request.zone}
                </p>

                <p>
                    <strong>Type de logement :</strong>
                    ${request.house_type}
                </p>

                <p>
                    <strong>Budget :</strong>
                    ${request.budget}
                </p>

                <p>
                    <strong>Profil :</strong>
                    ${request.user_type}
                </p>

                <p>
                    <strong>Nombre d'étudiants :</strong>
                    ${request.students_number || "Non précisé"}
                </p>

                <p>
                    <strong>Note :</strong>
                    ${request.note || "Aucune note"}
                </p>

                <hr>

                <p>
                    <strong>Date :</strong>
                    ${request.created_at}
                </p>

                <hr>

                <p>
                    <strong>S.O.S LOGEMENT</strong>
                </p>

            </div>

        `

    });

}


/* =========================================================
   EXPORTS
========================================================= */

module.exports = {

    sendOwnerEmail,

    sendOwnerWhatsApp,

    sendBudgetRequestEmail

};