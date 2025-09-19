import mongoose from "mongoose";

const participantSchema = new mongoose.Schema({
    name: { type: String, required: true },
    phone: { type: String, required: true },
});

const exclusionSchema = new mongoose.Schema({
    from: { type: String, required: true },
    to: { type: String, required: true },
});

const gameSchema = new mongoose.Schema({
    ownerPhone: { type: String, required: true },
    participants: [participantSchema],
    exclusions: [exclusionSchema],
    createdAt: { type: Date, default: Date.now },
    name: { type: String, required: true },
});

export const Game = mongoose.model("Game", gameSchema);
