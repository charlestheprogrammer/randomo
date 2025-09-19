import express from "express";
import bodyParser from "body-parser";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
dotenv.config();

import { sendWhatsAppMessage } from "./send_message.js";

const app = express();
app.use(bodyParser.json());

const games = {}; // stockage en mémoire (utilise une DB plus tard)

app.get("/webhook", (req, res) => {
    const VERIFY_TOKEN = process.env.VERIFY_TOKEN;

    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
        console.log("Webhook vérifié !");
        res.status(200).send(challenge);
    } else {
        res.sendStatus(403);
    }
});

// Réception des messages WhatsApp
app.post("/webhook", (req, res) => {
    const body = req.body;

    if (body.entry && body.entry[0].changes) {
        const messages = body.entry[0].changes[0].value.messages;
        if (messages) {
            const msg = messages[0];
            const from = msg.from; // numéro de l'expéditeur
            const text = msg.text?.body; // contenu du message

            console.log("Message reçu:", text, "de", from);

            handleIncomingMessage(from, text);
        }
    }

    res.sendStatus(200);
});

function handleIncomingMessage(from, text) {
    console.log(text);
    const [command, ...args] = text.trim().split(" ");

    switch (command) {
        case "/create":
            createGame(from);
            break;

        case "/add":
            addParticipant(from, args[0], args[1]);
            break;

        case "/exclude":
            excludeRule(from, args[0], args[1]);
            break;

        case "/list":
            listParticipants(from);
            break;

        case "/draw":
            drawAndSendResults(from);
            break;

        default:
            sendWhatsAppMessage(from, "Commande inconnue. Utilisez /create, /add, /exclude, /list, /draw.");
    }
}

// Créer un tirage
app.post("/create", (req, res) => {
    const id = uuidv4();
    games[id] = { id, participants: [], exclusions: [] };
    res.json({ id });
});

// Ajouter un participant
app.post("/add", (req, res) => {
    const { gameId, name, phone } = req.body;
    if (!games[gameId]) return res.status(404).json({ error: "Tirage introuvable" });

    games[gameId].participants.push({ name, phone });
    res.json({ success: true, participants: games[gameId].participants });
});

// Ajouter une exclusion
app.post("/exclude", (req, res) => {
    const { gameId, from, to } = req.body;
    if (!games[gameId]) return res.status(404).json({ error: "Tirage introuvable" });

    games[gameId].exclusions.push({ from, to });
    res.json({ success: true, exclusions: games[gameId].exclusions });
});

// Lancer le tirage
app.post("/draw", (req, res) => {
    const { gameId } = req.body;
    const game = games[gameId];
    if (!game) return res.status(404).json({ error: "Tirage introuvable" });

    const result = runDraw(game.participants, game.exclusions);
    if (!result) return res.status(400).json({ error: "Impossible de générer un tirage valide" });

    res.json({ result });
});

function runDraw(participants, exclusions) {
    const names = participants.map(p => p.name);
    let shuffled = shuffle([...names]);

    let attempts = 0;
    while (!isValid(shuffled, exclusions) && attempts < 1000) {
        shuffled = shuffle([...names]);
        attempts++;
    }

    if (attempts === 1000) return null;

    // Associer chaque participant à son destinataire
    return participants.map((p, i) => ({
        from: p.name,
        to: shuffled[i]
    }));
}

function isValid(shuffled, exclusions) {
    return exclusions.every(rule => {
        const index = shuffled.indexOf(rule.to);
        const fromIndex = shuffled.indexOf(rule.from);
        return fromIndex === -1 || index !== fromIndex;
    });
}

function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

app.listen(3000, () => console.log("API démarrée sur http://localhost:3000"));
