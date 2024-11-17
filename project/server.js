const express = require('express');
const http = require('http');
const {Server} = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

let clients = {};

app.use(express.static('public'));

io.on('connection', (socket) => {
    clients[socket.id] = {id: socket.id};
    io.emit('clients', clients);

    socket.on('disconnect', () => {
        delete clients[socket.id];
        io.emit('clients', clients);
    });

    socket.on('offer', (data) => socket.to(data.target).emit('offer', {sender: socket.id, offer: data.offer}));
    socket.on('answer', (data) => socket.to(data.target).emit('answer', {sender: socket.id, answer: data.answer}));
    socket.on('ice-candidate', (data) => socket.to(data.target).emit('ice-candidate', {sender: socket.id, candidate: data.candidate}));
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
