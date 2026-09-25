const nodemailer = require("nodemailer");


/* =========================================================
   EMAIL
========================================================= */

const transporter =
    nodemailer.createTransport({

        service: "Gmail",

        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }

    });


async function sendOwnerEmail({
    name,
    phone,
    email,
    ownerRef
}) {

    await transporter.sendMail({

        from:
            `"S.O.S LOGEMENT" <${process.env.SMTP_USER}>`,

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

                <hr>

                <p>
                    Le propriétaire peut maintenant
                    se connecter et ajouter ses biens.
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

        console.warn(
            "⚠️ WhatsApp non configuré"
        );

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


module.exports = {
    sendOwnerEmail,
    sendOwnerWhatsApp
};