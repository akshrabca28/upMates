const mongoose = require("mongoose");

const skillSchema = new mongoose.Schema({
    skillName: {
        type: String,
        required: true
    },

    category: {
        type: String,
        required: true
    },

    description: {
        type: String,
        default: ""
    },

    user: {
         type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        required: true
    },

    type: {
        type: String,
        enum: ["teach", "learn"],
        required: true
    }
});

module.exports = mongoose.model("Skill", skillSchema);