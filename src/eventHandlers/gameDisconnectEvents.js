function createGameDisconnectEvents(socket, io) {
    const InboundEvents = require('../constants/InboundEvents');
    const OutboundEvents = require('../constants/OutboundEvents');
    const PlayerStates = require('../constants/PlayerStates');
    const GameStates = require('../constants/GameStates');
    const Game = require('../models/GameModel')();
    const Player = require('../models/PlayerModel')();
    const DisconnectedPlayer = require('../models/DisconnectedPlayer')();
    const info = require('./getInfo');

    function getNextPlayerToVote(player, players) {
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

    function deleteGameMaybe(gameId, callback) {
        Player.find({ gameId: gameId }, (err, players) => {
            if (err) callback(err, false);
            if (players.length == 0) {
                Game.deleteOne({ gameId: gameId }, (err, res) => {
                    if (err) console.log(err);
                    DisconnectedPlayer.deleteMany({ gameId: gameId }, (err, res) => {
                        callback(null, true);
                    })
                })
            } else {
                callback(null, false);
            }
        })
    }

    function disconnect() {
        Player.findOne({ socketId: socket.id }, (err, player) => {
            if (err || player == null) { return; }
            console.log(player.name + ' is disconnecting');
            Game.findOne({ gameId: player.gameId }, (err, game) => {
                if (err || game == null) { return; }
                //Remove from table and fix linked list
                Player.findOne({ gameId: game.gameId, next: player.name }, (err, toFixPlayer) => {
                    if (err || toFixPlayer == null) { return; }
                    let options = { next: player.next };
                    if (player.tail) {
                        options.tail = true
                    }
                    Player.updateOne({ gameId: game.gameId, name: toFixPlayer.name }, options, (err, res) => {
                        if (err) { return; }
                        let options = {}
                        if (game.gameHead === player.name) {
                            options.gameHead = toFixPlayer.name;
                        }
                        if (game.voter === player.name) {
                            options.voter = toFixPlayer.name;
                        }
                        Game.updateOne({ gameId: game.gameId }, options, (err, res) => {
                            if (err) return;
                            Player.deleteOne({ gameId: game.gameId, name: player.name }, (err, res) => {
                                if (err) return;
                                deleteGameMaybe(game.gameId, (err, deleted) => {
                                    if (err) return;
                                    if (!deleted) {
                                        let NewDisconnectedPlayer = new DisconnectedPlayer({
                                            gameId: game.gameId,
                                            name: player.name,
                                            points: player.points
                                        });
                                        NewDisconnectedPlayer.save((err) => {
                                            Player.find({ gameId: game.gameId }, (err, players) => {
                                                if (err) return;
                                                if (players.length == 1) {
                                                    Game.updateOne({ gameId: game.gameId }, { gameState: GameStates.LOBBY }, (err, res) => {
                                                        if (err) return;
                                                        Player.updateMany({ gameId: game.gameId }, { state: PlayerStates.LOBBY }, (err, res) => {
                                                            if (err) return;
                                                            info.getPlayerInfo(game.gameId, (playerInfo) => {
                                                                info.getGameInfo(game.gameId, (gameInfo) => {
                                                                    io.to(game.gameId).emit(OutboundEvents.ALL_UPDATE, gameInfo, playerInfo);
                                                                });
                                                            });
                                                        })
                                                    });
                                                }
                                                else {
                                                    if (game.gameState === GameStates.TOPIC && player.state === PlayerStates.TOPIC) {
                                                        Game.updateOne({ gameId: game.gameId }, { gameState: GameStates.LOBBY }, (err, res) => {
                                                            if (err) return;
                                                            Player.updateMany({ gameId: game.gameId }, { state: PlayerStates.LOBBY }, (err, res) => {
                                                                if (err) {
                                                                    socket.emit(OutboundEvents.BACKEND_ERROR, err);
                                                                    return;
                                                                }
                                                                info.getPlayerInfo(game.gameId, (playerInfo) => {
                                                                    info.getGameInfo(game.gameId, (gameInfo) => {
                                                                        io.to(game.gameId).emit(OutboundEvents.ALL_UPDATE, gameInfo, playerInfo);
                                                                    });
                                                                });
                                                            })
                                                        });
                                                    }
                                                    else if (game.gameState === GameStates.VOTING) {
                                                        //Remove, fix linked list, find next non out player if player was voting
                                                        Player.find({ gameId: game.gameId, state: { $ne: PlayerStates.OUT } }, (err, players) => {
                                                            if (err) return;
                                                            if (players.length < 2) {
                                                                Game.updateOne({ gameId: game.gameId }, { gameState: GameStates.RESULTS }, (err, res) => {
                                                                    Player.updateMany({ gameId: game.gameId }, { state: PlayerStates.RESULTS }, (err, res) => {
                                                                        if (err) return;
                                                                        info.getPlayerInfo(game.gameId, (playerInfo) => {
                                                                            info.getGameInfo(game.gameId, (gameInfo) => {
                                                                                io.to(game.gameId).emit(OutboundEvents.ALL_UPDATE, gameInfo, playerInfo);
                                                                            });
                                                                        });
                                                                    })
                                                                })
                                                            } else {
                                                                if (player.state === PlayerStates.VOTING) {
                                                                    const nextPlayerToVote = getNextPlayerToVote(player, players);
                                                                    Game.updateOne({ gameId: game.gameId }, { voter: nextPlayerToVote }, (err, res) => {
                                                                        if (err) return;
                                                                        Player.updateOne({ gameId: game.gameId, name: nextPlayerToVote }, { state: PlayerStates.VOTING }, (err, res) => {
                                                                            if (err) return;
                                                                            info.getPlayerInfo(game.gameId, (playerInfo) => {
                                                                                info.getGameInfo(game.gameId, (gameInfo) => {
                                                                                    io.to(game.gameId).emit(OutboundEvents.ALL_UPDATE, gameInfo, playerInfo);
                                                                                });
                                                                            });
                                                                        })
                                                                    });
                                                                } else {
                                                                    info.getPlayerInfo(game.gameId, (playerInfo) => {
                                                                        info.getGameInfo(game.gameId, (gameInfo) => {
                                                                            io.to(game.gameId).emit(OutboundEvents.ALL_UPDATE, gameInfo, playerInfo);
                                                                        });
                                                                    });
                                                                }
                                                            }
                                                        })
                                                    }
                                                    else {
                                                        info.getPlayerInfo(game.gameId, (playerInfo) => {
                                                            info.getGameInfo(game.gameId, (gameInfo) => {
                                                                io.to(game.gameId).emit(OutboundEvents.ALL_UPDATE, gameInfo, playerInfo);
                                                            });
                                                        });
                                                    }

                                                }
                                            });
                                        })
                                    }
                                });
                            });
                        })
                    });
                })
            })
        })
    }

    socket.on('disconnect', disconnect);
    socket.on(InboundEvents.LEAVE_GAME, () => {
        socket.disconnect();
    });
}

module.exports = createGameDisconnectEvents;