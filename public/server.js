const express = require('express');
const http = require('http');
const {Server} = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

//Store connected clients
let clients = {};

app.use(express.static('public'));

io.on('connection', (socket) => {
    console.log(`Client connected: ${socket.id}`);

    //Add new client
    clients[socket.id] = {id: socket.id};
    io.emit('clients', clients); // Notify all clients of the updated list

    //Handle disconnection
    socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        delete clients[socket.id];
        io.emit('clients', clients);
    });

    //Handle SDP offer
    socket.on('offer', (data) => {
        const {target, offer} = data;
        socket.to(target).emit('offer', {sender: socket.id, offer});
    });

    //Handle SDP answer
    socket.on('answer', (data) => {
        const {target, answer} = data;
        socket.to(target).emit('answer', {sender: socket.id, answer});
    });

    //Handle ICE candidate
    socket.on('ice-candidate', (data) => {
        const {target, candidate} = data;
        socket.to(target).emit('ice-candidate', {sender: socket.id, candidate});
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
