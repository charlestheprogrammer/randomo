import dotenv from "dotenv";
dotenv.config();

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN; // ⚠️ garde-le secret
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID; // ex: 1234567890

export async function sendWhatsAppMessage(to, message) {
    const url = `https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`;

    const payload = {
        messaging_product: "whatsapp",
        to, // numéro au format international, ex: "33612345678"
        type: "text",
        text: {
            body: message
        }
    };

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
    });

    const data = await response.json();
    console.log("Réponse WhatsApp API:", data);
}

sendWhatsAppMessage("33680201571", "Bonjour ! Ceci est un test ✅");
