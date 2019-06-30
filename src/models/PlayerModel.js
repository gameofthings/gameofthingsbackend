const mongoose = require('mongoose');

let model = null;

function createPlayerModel() {
    if (model == null) {
        let PlayerSchema = new mongoose.Schema({
            gameId: String,
            name: String,
            points: Number,
            state: String,
            answer: String,
            next: String,
            tail: Boolean,
            roundPoints: Number,
            socketId: String
        });
        model = mongoose.model('PlayerModel', PlayerSchema, 'Players');
    }
    return model;
}

module.exports = createPlayerModel;
