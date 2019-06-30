const mongoose = require('mongoose');

let model = null;

function createGameModel() {
    if (model == null) {
        let GameSchema = new mongoose.Schema({
            gameId: String,
            gameState: String,
            topic: String,
            gameHead: String,
            voter: String
        });
        model = mongoose.model('GameModel', GameSchema, 'Games');
    }
    return model;
}

module.exports = createGameModel;
