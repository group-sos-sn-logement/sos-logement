require("dotenv").config();

const { BirdClient } = require("@messagebird/sdk");

const bird = new BirdClient({
    apiKey: process.env.BIRD_API_KEY
});

async function sendSMS(phone, message) {

    console.log("PHONE RECEIVED =", phone);

    const { data, error } = await bird.sms.send({

        to: phone,

        text: message,

        category: "transactional"

    }).safe();

    if (error) {
        console.error(error);
        throw new Error("Impossible d'envoyer le SMS");
    }

    return data;
}

module.exports = {
    sendSMS
};