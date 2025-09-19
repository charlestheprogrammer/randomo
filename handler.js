import { Game } from "./models.js";
import { runDraw } from "./draw.js";
import fetch from "node-fetch";

export async function handleIncomingMessage(from, text) {
    const [command, ...args] = text.trim().split(" ");

    switch (command) {
        case "/create":
            await createGame(from, args[0]);
            break;

        case "/add":
            await addParticipant(from, args[0], args[1]);
            break;

        case "/exclude":
            await addExclusion(from, args[0], args[1]);
            break;

        case "/list":
            await listParticipants(from);
            break;

        case "/draw":
            await drawAndSendResults(from);
            break;

        default:
            await sendWhatsAppMessage(from, "Commande inconnue. Utilisez /create, /add, /exclude, /list, /draw.");
    }
}

async function createGame(ownerPhone, name) {
    const existing = await Game.findOne({ ownerPhone });
    if (existing) await existing.deleteOne();
    if (!name) return sendWhatsAppMessage(ownerPhone, "❌ Veuillez fournir un nom pour le jeu.");

    const game = await Game.create({ ownerPhone, participants: [], exclusions: [], name });
    await sendWhatsAppMessage(ownerPhone, `✅ Nouveau jeu créé ! Vous pouvez maintenant /add des participants.`);
}

async function addParticipant(ownerPhone, name, phone) {
    const game = await Game.findOne({ ownerPhone });
    if (!game) return sendWhatsAppMessage(ownerPhone, "❌ Aucun jeu trouvé. Utilisez /create d'abord.");

    game.participants.push({ name, phone });
    await game.save();

    const list = game.participants.map(p => p.name).join(", ");
    await sendWhatsAppMessage(ownerPhone, `✅ ${name} ajouté. Participants : ${list}`);
}

async function addExclusion(ownerPhone, from, to) {
    const game = await Game.findOne({ ownerPhone });
    if (!game) return sendWhatsAppMessage(ownerPhone, "❌ Aucun jeu trouvé. Utilisez /create d'abord.");

    game.exclusions.push({ from, to });
    await game.save();

    await sendWhatsAppMessage(ownerPhone, `🚫 Exclusion ajoutée : ${from} ne peut pas tirer ${to}`);
}

async function listParticipants(ownerPhone) {
    const game = await Game.findOne({ ownerPhone });
    if (!game) return sendWhatsAppMessage(ownerPhone, "❌ Aucun jeu trouvé. Utilisez /create d'abord.");

    const list = game.participants.map(p => `• ${p.name}`).join("\n");
    await sendWhatsAppMessage(ownerPhone, `👥 Participants :\n${list || "Aucun participant pour le moment"}`);
}

async function drawAndSendResults(ownerPhone) {
    const game = await Game.findOne({ ownerPhone });
    if (!game) return sendWhatsAppMessage(ownerPhone, "❌ Aucun jeu trouvé. Utilisez /create d'abord.");

    const result = runDraw(game.participants, game.exclusions);
    if (!result) return sendWhatsAppMessage(ownerPhone, "⚠️ Aucun tirage valide possible. Vérifiez les exclusions.");

    // envoyer à chaque participant via template
    for (const pair of result) {
        await sendResultTemplate(pair.from.phone, pair.from.name, game.name, pair.to.name);
    }

    await sendWhatsAppMessage(ownerPhone, "🎲 Tirage terminé ! Les résultats ont été envoyés aux participants.");
}

async function sendWhatsAppMessage(to, message) {
    const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
    const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

    await fetch(`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            text: { body: message },
        }),
    });
}

async function sendResultTemplate(to, participant_name, sort_name, participant_assoc) {
    const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
    const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;
    await fetch(`https://graph.facebook.com/v22.0/${PHONE_NUMBER_ID}/messages`, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${WHATSAPP_TOKEN}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type: "template",
            template: {
                name: "sort_done_fr",
                language: { code: "fr" },
                components: [
                    {
                        type: "body",
                        parameters: [
                            { type: "text", text: participant_name },
                            { type: "text", text: sort_name },
                            { type: "text", text: participant_assoc }
                        ],
                    },
                ],
            },
        }),
    });
}
