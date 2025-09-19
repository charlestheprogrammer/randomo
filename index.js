import express from "express";
import mongoose from "mongoose";
import bodyParser from "body-parser";
import { handleIncomingMessage } from "./handler.js";

import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(bodyParser.json());


await mongoose.connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGODB_DB,
})

app.get("/webhook", (req, res) => {
    const VERIFY_TOKEN = process.env.WEBHOOK_VERIFY_TOKEN;
    const mode = req.query["hub.mode"];
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];

    if (mode === "subscribe" && token === VERIFY_TOKEN) {
        return res.status(200).send(challenge);
    }
    res.sendStatus(403);
});

app.post("/webhook", async (req, res) => {
    const messages = req.body.value?.messages;

    if (messages) {
        const msg = messages[0];
        await handleIncomingMessage(msg.from, msg.text?.body || "");
    }
    res.sendStatus(200);
});

app.listen(3000, () => console.log("Server running on port 3000"));
