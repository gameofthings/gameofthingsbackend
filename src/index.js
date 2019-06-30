const fs = require('fs');
const express = require('express');
const cors = require('cors');

const port = process.env.PORT || 3001;

const mongoose = require('mongoose');
mongoose.connect(process.env.mongodbendpoint || 'mongodb+srv://superuser:gameofthings@gameofthingscluster-2snm7.mongodb.net/thingsgame?retryWrites=true&w=majority', {
    useNewUrlParser: true,
    useFindAndModify: false
});

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }))

const Game = require('./models/GameModel')();
const Player = require('./models/PlayerModel')();
const DisconnectedPlayer = require('./models/DisconnectedPlayer')();

Game.deleteMany({}, (err, res) => { });
Player.deleteMany({}, (err, res) => { });
DisconnectedPlayer.deleteMany({}, (err, res) => { });

app.get('/health', (req, res) => {
    return res.send('Up and running!');
})

const server = app.listen(port, () => {
    console.log('Started!');

    const io = require('socket.io')(server);

    io.on('connection', (socket) => {
        try {
            require('./eventHandlers/gameSetupEvents')(socket, io);
            require('./eventHandlers/gameStartEvents')(socket, io);
            require('./eventHandlers/gameSubmitTopicEvents')(socket, io);
            require('./eventHandlers/gameAnswerEvents')(socket, io);
            require('./eventHandlers/gameVoteEvents')(socket, io);
            require('./eventHandlers/gameRoundOverEvents')(socket, io);
            require('./eventHandlers/gameDisconnectEvents')(socket, io);
        }
        catch (e) {
            console.log('Just saved server from crashing with error: ' + e);
        }
    });
})

var https = require("https");
setInterval(function() {
    https.get('https://game-of-things.herokuapp.com/', (res)=>{
        console.log('Ah, ha, ha, ha, stayin\' alive, stayin\' alive');
    });
}, 300000);