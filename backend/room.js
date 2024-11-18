const mongoose = require('mongoose');
const { Schema } = mongoose;

const roomSchema = new Schema({
    room: String,
    question: String,
    members: Number,
    yes: Number,
    no: Number,
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 3600,
    }
});
module.exports = mongoose.model('Room', roomSchema);