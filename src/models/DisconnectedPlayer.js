const mongoose = require('mongoose');

let model = null;

function createDisconnectedPlayerModel() {
    if (model == null) {
        let DisconnectedPlayerSchema = new mongoose.Schema({
            gameId: String,
            name: String,
            points: Number
        });
        model = mongoose.model('DisconnectedPlayerModel', DisconnectedPlayerSchema, 'DisconnectedPlayers');
    }
    return model;
}

module.exports = createDisconnectedPlayerModel;
