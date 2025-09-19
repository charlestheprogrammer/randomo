import { Game } from "./models.js";
import { runDraw } from "./draw.js";
import fetch from "node-fetch";

const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

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
            await sendWhatsAppMessage(from, "Unknown command. Use /create, /add, /exclude, /list, /draw.");
    }
}

async function createGame(ownerPhone, name) {
    const existing = await Game.findOne({ ownerPhone });
    if (existing) await existing.deleteOne();
    if (!name) return sendWhatsAppMessage(ownerPhone, "❌ Please provide a name for the game.");

    const game = await Game.create({ ownerPhone, participants: [], exclusions: [], name });
    await sendWhatsAppMessage(ownerPhone, `✅ New game created! You can now /add participants.`);
}

async function addParticipant(ownerPhone, name, phone) {
    const game = await Game.findOne({ ownerPhone });
    if (!game) return sendWhatsAppMessage(ownerPhone, "❌ No game found. Use /create first.");

    game.participants.push({ name, phone });
    await game.save();

    const list = game.participants.map(p => p.name).join(", ");
    await sendWhatsAppMessage(ownerPhone, `✅ ${name} added. Participants: ${list}`);
}

async function addExclusion(ownerPhone, from, to) {
    const game = await Game.findOne({ ownerPhone });
    if (!game) return sendWhatsAppMessage(ownerPhone, "❌ No game found. Use /create first.");

    game.exclusions.push({ from, to });
    await game.save();

    await sendWhatsAppMessage(ownerPhone, `🚫 Exclusion added: ${from} cannot draw ${to}`);
}

async function listParticipants(ownerPhone) {
    const game = await Game.findOne({ ownerPhone });
    if (!game) return sendWhatsAppMessage(ownerPhone, "❌ No game found. Use /create first.");

    const list = game.participants.map(p => `• ${p.name}`).join("\n");
    await sendWhatsAppMessage(ownerPhone, `👥 Participants:\n${list || "No participants yet"}`);
}

async function drawAndSendResults(ownerPhone) {
    const game = await Game.findOne({ ownerPhone });
    if (!game) return sendWhatsAppMessage(ownerPhone, "❌ No game found. Use /create first.");

    const result = runDraw(game.participants, game.exclusions);
    if (!result) return sendWhatsAppMessage(ownerPhone, "⚠️ No valid draw possible. Check exclusions.");

    // envoyer à chaque participant via template
    for (const pair of result) {
        await sendResultTemplate(pair.from.phone, pair.from.name, game.name, pair.to.name);
    }

    await sendWhatsAppMessage(ownerPhone, "🎲 Draw completed! Results have been sent to participants.");
}

async function sendWhatsAppMessage(to, message) {
    console.log(to, message);
    console.log(PHONE_NUMBER_ID, WHATSAPP_TOKEN);

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
