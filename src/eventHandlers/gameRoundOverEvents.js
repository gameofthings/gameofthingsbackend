function createGameRoundOverEvents(socket, io) {
    const InboundEvents = require('../constants/InboundEvents');
    const OutboundEvents = require('../constants/OutboundEvents');
    const PlayerStates = require('../constants/PlayerStates');
    const GameStates = require('../constants/GameStates');
    const Game = require('../models/GameModel')();
    const Player = require('../models/PlayerModel')();
    const info = require('./getInfo');

    socket.on(InboundEvents.BACK_TO_LOBBY, (gameId) => {
        Game.updateOne({ gameId: gameId }, { gameState: GameStates.LOBBY, topic: '' }, (err, res) => {
            if (err) {
                socket.emit(OutboundEvents.BACKEND_ERROR, err);
                return;
            }
            Player.updateMany({ gameId: gameId }, { state: PlayerStates.LOBBY, answer: '' }, (err, res) => {
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
    });
}

module.exports = createGameRoundOverEvents;