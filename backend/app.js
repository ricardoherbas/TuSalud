require('dotenv').config({
    path: require('path').resolve(__dirname, '../.env')
});

const Server = require('./core/server');

const server = new Server();

server.listen();