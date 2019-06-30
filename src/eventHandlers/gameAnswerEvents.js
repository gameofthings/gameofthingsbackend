function createGameVoteEvents(socket, io) {
    const InboundEvents = require('../constants/InboundEvents');
    const OutboundEvents = require('../constants/OutboundEvents');
    const PlayerStates = require('../constants/PlayerStates');
    const GameStates = require('../constants/GameStates');
    const Game = require('../models/GameModel')();
    const Player = require('../models/PlayerModel')();
    const info = require('./getInfo');

    socket.on(InboundEvents.SUBMITTED_ANSWER, (gameId, name, answer) => {
        Player.updateOne({ gameId: gameId, name: name }, { state: PlayerStates.ANSWERED, answer: answer }, (err, res) => {
            if (err) {
                socket.emit(OutboundEvents.BACKEND_ERROR, err);
                return;
            }
            Player.find({ gameId: gameId, state: PlayerStates.UNANSWERED }, (err, players) => {
                if (err) {
                    socket.emit(OutboundEvents.BACKEND_ERROR, err);
                    return;
                }
                if (players.length == 0) {
                    Game.findOneAndUpdate({ gameId: gameId }, { gameState: GameStates.VOTING }, (err, game) => {
                        if (err) {
                            socket.emit(OutboundEvents.BACKEND_ERROR, err);
                            return;
                        }
                        Player.updateMany({ gameId: gameId }, { state: PlayerStates.INLINE }, (err, res) => {
                            if (err) {
                                socket.emit(OutboundEvents.BACKEND_ERROR, err);
                                return;
                            }
                            Player.updateOne({ gameId: gameId, name: game.voter }, { state: PlayerStates.VOTING }, (err, res) => {
                                info.getPlayerInfo(gameId, (playerInfo) => {
                                    info.getGameInfo(gameId, (gameInfo) => {
                                        io.to(gameId).emit(OutboundEvents.ALL_UPDATE, gameInfo, playerInfo);
                                    });
                                });
                            })
                        })
                    });
                }
                else {
                    info.getPlayerInfo(gameId, (playerInfo) => {
                        info.getGameInfo(gameId, (gameInfo) => {
                            io.to(gameId).emit(OutboundEvents.ALL_UPDATE, gameInfo, playerInfo);
                        });
                    });
                }
            });
        });
    });
}

module.exports = createGameVoteEvents;