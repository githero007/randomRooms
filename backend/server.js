const express = require('express');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');
const app = express();
const server = createServer(app);
const io = new Server(server);
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { time } = require('node:console');
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
    rooms.push({ room: roomId, members: 0, question: question, yes: 0, no: 0, votedUser: new Set() });
    res.send({ roomId });
});
function getRandomIndex(arr) {
    if (arr.length === 0) return null; // Return null if the array is empty
    const randomIndex = Math.floor(Math.random() * arr.length);
    return randomIndex;
}
let voteCounter = 0;
io.on('connection', (socket) => {
    console.log('a user connected');
    let roomIndex = null;
    let currentRoom = null;
    try {
        socket.on('joinRoom', (name) => {
            const randomIndex = getRandomIndex(rooms);
            roomIndex = randomIndex;
            if (currentRoom != null) { return socket.emit('roomJoined', "already in a room"); }
            if (randomIndex != null) {
                const roomId = rooms[randomIndex].room;
                rooms[randomIndex].members += 1;
                socket.join(roomId);
                console.log(`Socket ${socket.id} joined room `);
                console.log(name);
                socket.emit('roomJoined', name, rooms[randomIndex].members);
                socket.to(roomId).emit('roomJoined', name, rooms[randomIndex].members);
                currentRoom = 1;
                socket.emit('question', `shall i ${rooms[randomIndex].question}`);
            }
            else {
                socket.emit('error', "no room was found");

            }
        });
        socket.on('leaveroom', (name) => {
            if (rooms.length == 0) return socket.emit('error', 'no room was found to join');
            console.log(roomIndex);
            rooms[roomIndex].members--;
            socket.to(rooms[roomIndex].room).emit('leftRoom', name, rooms[roomIndex].members);
            socket.leave(roomId);
            if (rooms[roomIndex].members === 0) {
                rooms.splice(roomIndex, 1);
            }
            currentRoom = null;
        });
        socket.on('createRoom', (roomId, name) => {
            socket.join(roomId);
            console.log(name);
            roomIndex = rooms.findIndex((rm) => rm.room === roomId);
            rooms[roomIndex].members++;
            socket.emit('roomJoined', name, rooms[roomIndex].members);
            currentRoom = 1;
            roomIndex = rooms.findIndex(rm => rm.room === roomId);
            socket.emit('question', `shall i ${rooms[roomIndex].question}`);
            const timeoutId = setTimeout(() => {
                socket.emit('timeOut');
                io.to(roomId).disconnectSockets();
                console.log('closing the room');
            }, 10 * 100 * 1000);
            socket.on('disconnect', () => {
                clearTimeout(timeoutId); // Clear the timeout if the user disconnects
            });
        })
        socket.on('vote', (vote) => {
            if (rooms[roomIndex].votedUser.has(socket.id)) {
                socket.emit('error', `oops you can only vote once`);
                return;
            }
            rooms[roomIndex].votedUser.add(socket.id);
            if (vote == 'yes') rooms[roomIndex].yes++;
            else rooms[roomIndex].no++;
            socket.emit('recVote', rooms[roomIndex].yes, rooms[roomIndex].no);

        })
        socket.on('sendMsg', (name, sendMessage) => {
            console.log(name);
            socket.to(rooms[roomIndex].room).emit('recieveMsg', name, sendMessage);
            console.log('messages event triggered');
        })
    } catch (error) {
        console.log(error);
    }

});


server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
});