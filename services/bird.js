const { BirdClient } = require("@messagebird/sdk");

const bird = new BirdClient({
  apiKey: process.env.BIRD_API_KEY,
});

async function sendSMS(phone, message) {
  const { data, error } = await bird.sms.send({
    to: phone,
    text: message,
    category: "transactional",
  }).safe();

  if (error) {
    throw error;
  }

  return data;
}

module.exports = {
  sendSMS,
};