function createGameSubmitTopicEvents(socket, io) {
    const InboundEvents = require('../constants/InboundEvents');
    const OutboundEvents = require('../constants/OutboundEvents');
    const PlayerStates = require('../constants/PlayerStates');
    const GameStates = require('../constants/GameStates');
    const Game = require('../models/GameModel')();
    const Player = require('../models/PlayerModel')();
    const info = require('./getInfo');

    socket.on(InboundEvents.SUBMITTED_TOPIC, (gameId, topic) => {
        topic = topic.trim();
        Game.findOne({ gameId: gameId }, (err, game) => {
            if (err) {
                socket.emit(OutboundEvents.BACKEND_ERROR, err);
                return;
            }
            Player.findOne({ gameId: gameId, name: game.gameHead }, (err, player) => {
                if (err) {
                    socket.emit(OutboundEvents.BACKEND_ERROR, err);
                    return;
                }
                Game.updateOne({ gameId: gameId }, { gameHead: player.next, voter: player.next, gameState: GameStates.ANSWERING, topic: topic }, (err, res) => {
                    if (err) {
                        socket.emit(OutboundEvents.BACKEND_ERROR, err);
                        return;
                    }
                    Player.updateMany({ gameId: gameId }, { state: PlayerStates.UNANSWERED, answer: '' }, (err, res) => {
                        if (err) {
                            socket.emit(OutboundEvents.BACKEND_ERROR, err);
                            return;
                        }
                        info.getPlayerInfo(gameId, (playerInfo) => {
                            info.getGameInfo(gameId, (gameInfo) => {
                                io.to(gameId).emit(OutboundEvents.ALL_UPDATE, gameInfo, playerInfo);
                            });
                        });
                    })
                });
            })
        })
    });
}

module.exports = createGameSubmitTopicEvents;