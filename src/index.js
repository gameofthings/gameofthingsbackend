const fs = require('fs');
const express = require('express');
const https = require('https');
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

let credentials = {
    key: fs.readFileSync('./server.key'),
    cert: fs.readFileSync('./server.crt')
};

const server = https.createServer(credentials, app);

const Game = require('./models/GameModel')();
const Player = require('./models/PlayerModel')();

Game.deleteMany({}, (err, res) => { });
Player.deleteMany({}, (err, res) => { });

app.get('/health', (req, res) => {
    return res.send('Up and running!');
})

server.listen(port, () => {
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