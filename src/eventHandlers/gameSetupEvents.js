function generateGameId(length) {
    let validIdChars = '1234567890abcdefghijklmnopqrstuvwxyz!?@&';
    let low = 0, high = validIdChars.length;

    let gameIdLength = length;
    let gameId = '';

    for (let i = 0; i < gameIdLength; i++) {
        gameId += validIdChars.charAt(Math.floor(Math.random() * (high - low) + low));
    }

    return gameId;
}

function createGameStartEvents(socket, io) {
    const InboundEvents = require('../constants/InboundEvents');
    const OutboundEvents = require('../constants/OutboundEvents');
    const PlayerStates = require('../constants/PlayerStates');
    const GameStates = require('../constants/GameStates');
    const Game = require('../models/GameModel')();
    const Player = require('../models/PlayerModel')();
    const DisconnectedPlayer = require('../models/DisconnectedPlayer');
    const info = require('./getInfo');

    function addPlayerToGame(gameId, name, next, tail, points, callback) {
        let NewPlayer = new Player({
            gameId: gameId,
            name: name,
            points: points,
            state: PlayerStates.LOBBY,
            answer: '',
            pickedTopic: false,
            next: next,
            tail: tail,
            roundPoints: 0,
            socketId: socket.id
        });
        NewPlayer.save(err => callback(err));
    }

    socket.on(InboundEvents.NEW_GAME, (name) => {
        name = name.trim();
        console.log('New game being created');
        let gameId = generateGameId(6);

        let NewGame = new Game({
            gameId: gameId,
            gameState: GameStates.LOBBY,
            turn: 1,
            topic: '',
            gameHead: name,
            voter: name
        })

        NewGame.save((err) => {
            if (err) {
                socket.emit(OutboundEvents.BACKEND_ERROR, err);
                return;
            }
            addPlayerToGame(gameId, name, name, true, 0, (err) => {
                if (err) {
                    socket.emit(OutboundEvents.BACKEND_ERROR, err);
                    return;
                }
                console.log('added player ' + name + ' to game ' + gameId);
                socket.join(gameId);

                info.getGameInfo(gameId, (gameInfo) => {
                    info.getPlayerInfo(gameId, (playerInfo) => {
                        socket.emit(OutboundEvents.ADDED_TO_GAME, gameInfo, playerInfo);
                        socket.to(gameId).emit(OutboundEvents.PLAYERS_UPDATE, playerInfo);
                    });
                });
            });
        });
    });

    socket.on(InboundEvents.JOIN_GAME, (gameId, name) => {
        name = name.trim();
        gameId = gameId.trim();
        console.log('New connection joining game: ' + gameId)

        Game.findOne({ gameId: gameId }, (err, game) => {
            if (err) {
                socket.emit(OutboundEvents.BACKEND_ERROR, err);
                return;
            }
            if (game == null) {
                socket.emit(OutboundEvents.NO_GAME_FOUND, gameId);
                return;
            }
            if (game.gameState != GameStates.LOBBY) {
                socket.emit(OutboundEvents.GAME_IN_PROGRESS, gameId);
                return;
            }
            DisconnectedPlayer.findOne({gameId:gameId, name:name}, (err, disPlayer) => {
                if(err){
                    socket.emit(OutboundEvents.BACKEND_ERROR, err);
                    return;
                }
                if(disPlayer == null){
                    Player.findOne({ gameId: gameId, name: name }, (err, player) => {
                        if (err) {
                            socket.emit(OutboundEvents.BACKEND_ERROR, err);
                            return;
                        }
                        if (player != null) {
                            socket.emit(OutboundEvents.NAME_ALREADY_EXISTS, name);
                            return;
                        }
                        Player.findOne({ gameId: gameId, tail: true }, (err, tail) => {
                            if (err) {
                                socket.emit(OutboundEvents.BACKEND_ERROR, {error:'finding tail'});
                                return;
                            }
                            addPlayerToGame(gameId, name, tail.next, true, 0, (err) => {
                                if (err) {
                                    socket.emit(OutboundEvents.BACKEND_ERROR, {error:'adding to game'});
                                    return;
                                }
                                Player.updateOne({ gameId: gameId, name: tail.name }, { next: name, tail: false }, (err, res) => {
                                    if (err) {
                                        socket.emit(OutboundEvents.BACKEND_ERROR, );
                                        return;
                                    }
                                    console.log('added player ' + name + ' to game ' + gameId);
                                    socket.join(gameId);
                                    info.getGameInfo(gameId, (gameInfo) => {
                                        info.getPlayerInfo(gameId, (playerInfo) => {
                                            socket.emit(OutboundEvents.ADDED_TO_GAME, gameInfo, playerInfo);
                                            socket.to(gameId).emit(OutboundEvents.ALL_UPDATE, gameInfo, playerInfo);
                                        });
                                    });
                                })
                            });
                        })
                    });
                }
                else{
                    Player.findOne({ gameId: gameId, tail: true }, (err, tail) => {
                        if (err) {
                            socket.emit(OutboundEvents.BACKEND_ERROR, {error:'finding tail'});
                            return;
                        }
                        addPlayerToGame(gameId, name, tail.next, true, disPlayer.points, (err) => {
                            if (err) {
                                socket.emit(OutboundEvents.BACKEND_ERROR, {error:'adding to game'});
                                return;
                            }
                            Player.updateOne({ gameId: gameId, name: tail.name }, { next: name, tail: false }, (err, res) => {
                                if (err) {
                                    socket.emit(OutboundEvents.BACKEND_ERROR, );
                                    return;
                                }
                                console.log('added player ' + name + ' to game ' + gameId);
                                socket.join(gameId);
                                info.getGameInfo(gameId, (gameInfo) => {
                                    info.getPlayerInfo(gameId, (playerInfo) => {
                                        socket.emit(OutboundEvents.ADDED_TO_GAME, gameInfo, playerInfo);
                                        socket.to(gameId).emit(OutboundEvents.ALL_UPDATE, gameInfo, playerInfo);
                                    });
                                });
                            })
                        });
                    })
                }
            })
        })
    });
}

module.exports = createGameStartEvents;