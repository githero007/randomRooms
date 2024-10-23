const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');
const app = express();
const server = createServer(app);
const io = new Server(server);
const { v4: uuidv4 } = require('uuid');
const path = require('path');
app.use(express.json());
let roomId = "";
let rooms = [];
app.get('/', async (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
})
app.post('/create', (req, res) => {
    roomId = uuidv4();
    const question = req.body.question;
    console.log(question);
    rooms.push({ room: roomId, members: 0, question: question });
    res.send({ roomId });
});
function getRandomIndex(arr) {
    if (arr.length === 0) return null; // Return null if the array is empty
    const randomIndex = Math.floor(Math.random() * arr.length);
    return randomIndex;
}

io.on('connection', (socket) => {
    console.log('a user connected');
    let roomIndex = null;
    let currentRoom = null;
    socket.on('joinRoom', () => {
        const randomIndex = getRandomIndex(rooms);
        roomIndex = randomIndex;
        if (currentRoom != null) { return socket.emit('roomJoined', "already in a room"); }
        if (randomIndex != null) {
            const roomId = rooms[randomIndex].room;
            rooms[randomIndex].members += 1;
            socket.join(roomId);
            console.log(`Socket ${socket.id} joined room `);
            socket.emit('roomJoined', `you joined the room`);
            socket.to(roomId).emit('roomJoined', `  ${rooms[randomIndex].members}  members are present in the room`);
            currentRoom = 1;
            socket.emit('question', `shall i ${rooms[randomIndex].question}`);
        }
        else {
            socket.emit('error', "no room was found");

        }
    });
    socket.on('leaveroom', (userName) => {
        if (rooms.length == 0) return socket.emit('error', 'no room was found to join');
        console.log(roomIndex);
        rooms[roomIndex].members--;
        socket.to(rooms[roomIndex].room).emit('leftRoom', `The user ${userName} left the room. ${rooms[roomIndex].members} members are present in the room`);
        socket.leave(roomId);
        currentRoom = null;
    });
    socket.on('createRoom', (roomId) => {
        socket.join(roomId);
        const room = rooms.filter((rm) => rm.room == roomId);
        console.log(room);
        socket.emit('roomJoined', `you created the room`);
        socket.to(roomId).emit('roomJoined', `  ${room[0].members}  members are present in the room`);
        currentRoom = 1;
        roomIndex = rooms.findIndex(rm => rm.room === roomId);
        socket.emit('question', `shall i ${room[0].question}`);
    })
    socket.on('sendMsg', (sendMessage) => {
        console.log(roomIndex);
        socket.to(rooms[roomIndex].room).emit('recieveMsg', sendMessage);
        console.log('messages event triggered');
    })
});

server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
});