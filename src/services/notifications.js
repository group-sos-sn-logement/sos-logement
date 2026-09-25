async function sendBudgetRequestEmail(request) {
    console.log("📩 DEMANDE BUDGET REÇUE :", request);
    return true;
}

async function sendOwnerEmail(data) {
    console.log("📩 OWNER EMAIL :", data);
    return true;
}

async function sendOwnerWhatsApp(data) {
    console.log("📱 OWNER WHATSAPP :", data);
    return true;
}

module.exports = {
    sendOwnerEmail,
    sendOwnerWhatsApp,
    sendBudgetRequestEmail
};