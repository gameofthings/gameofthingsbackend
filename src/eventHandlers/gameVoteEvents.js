function createGameVoteEvents(socket, io) {
    const InboundEvents = require('../constants/InboundEvents');
    const OutboundEvents = require('../constants/OutboundEvents');
    const PlayerStates = require('../constants/PlayerStates');
    const GameStates = require('../constants/GameStates');
    const Game = require('../models/GameModel')();
    const Player = require('../models/PlayerModel')();
    const info = require('./getInfo');

    function getNextPlayer(player, players) {
        let playerDictionary = {};
        players.forEach(tempPlayer => {
            playerDictionary[tempPlayer.name] = tempPlayer
        });

        let nextPlayer = playerDictionary[player.next];
        while (nextPlayer.state === PlayerStates.OUT) {
            nextPlayer = playerDictionary[nextPlayer.next];
        }

        return nextPlayer.name;
    }

    socket.on(InboundEvents.VOTED, (gameId, name, vote) => {
        Player.findOne({ gameId: gameId, name: vote.name, answer: vote.answer }, (err, player) => {
            if (err) {
                socket.emit(OutboundEvents.BACKEND_ERROR, err);
                return;
            }
            if (player == null) {
                Player.findOneAndUpdate({ gameId: gameId, name: name }, { state: PlayerStates.INLINE }, (err, player) => {
                    if (err) {
                        socket.emit(OutboundEvents.BACKEND_ERROR, err);
                        return;
                    }
                    Player.find({ gameId: gameId }, (err, players) => {
                        if (err) {
                            socket.emit(OutboundEvents.BACKEND_ERROR, err);
                            return;
                        }
                        const nextPlayerToVote = getNextPlayer(player, players);
                        Game.updateOne({ gameId: gameId }, { voter: nextPlayerToVote }, (err, res) => {
                            if (err) {
                                socket.emit(OutboundEvents.BACKEND_ERROR, err);
                                return;
                            }
                            Player.updateOne({ gameId: gameId, name: nextPlayerToVote }, { state: PlayerStates.VOTING }, (err, res) => {
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
            }
            else {
                Player.updateOne({ gameId: gameId, name: vote.name }, { state: PlayerStates.OUT }, (err, res) => {
                    if (err) {
                        socket.emit(OutboundEvents.BACKEND_ERROR, err);
                        return;
                    }
                    Player.updateOne({ gameId: gameId, name: name }, { $inc: { points: 1, roundPoints: 1 } }, (err, res) => {
                        if (err) {
                            socket.emit(OutboundEvents.BACKEND_ERROR, err);
                            return;
                        }
                        Player.find({ gameId: gameId, state: { $ne: PlayerStates.OUT } }, (err, players) => {
                            if (err) {
                                socket.emit(OutboundEvents.BACKEND_ERROR, err);
                                return;
                            }
                            if (players.length < 2) {
                                Game.updateOne({ gameId: gameId }, { gameState: GameStates.RESULTS }, (err, res) => {
                                    if (err) {
                                        socket.emit(OutboundEvents.BACKEND_ERROR, err);
                                        return;
                                    }
                                    Player.updateOne({ gameId: gameId, name: name }, { $inc: { points: 2, roundPoints: 2 } }, (err, res) => {
                                        if (err) {
                                            socket.emit(OutboundEvents.BACKEND_ERROR, err);
                                            return;
                                        }
                                        Player.updateMany({ gameId: gameId }, { state: PlayerStates.RESULTS }, (err, res) => {
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
                                    })
                                })
                            }
                            else {
                                info.getPlayerInfo(gameId, (playerInfo) => {
                                    info.getGameInfo(gameId, (gameInfo) => {
                                        io.to(gameId).emit(OutboundEvents.ALL_UPDATE, gameInfo, playerInfo);
                                    });
                                });
                            }
                        })
                    })
                });
            }
        })
    });
}

module.exports = createGameVoteEvents;