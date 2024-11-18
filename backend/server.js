const express = require('express');
const connectMongo = require('./db');
const Room = require('./room');
const { createServer } = require('node:http');
const { join } = require('node:path');
const { Server } = require('socket.io');
const app = express();
const server = createServer(app);
const io = new Server(server);
const { v4: uuidv4 } = require('uuid');
const path = require('path');
const { time } = require('node:console');
const room = require('./room');
app.use(express.json()); ``
app.use(express.static(join(__dirname, 'public')));
let roomId = "";
connectMongo;
app.get('/', async (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
})
app.post('/create', async (req, res) => {
    roomId = uuidv4();
    const question = req.body.question;
    const newRoom = new Room({ room: roomId, members: 0, question: question, yes: 0, no: 0 })
    try {
        const savedRoom = await newRoom.save();
        console.log('Room created:', savedRoom);
    } catch (err) {
        console.error('Error creating room:', err);
    }
    res.send({ roomId });
});
async function getRandomRoom() {
    try {
        const randomRoom = await Room.aggregate([{ $sample: { size: 1 } }]); // Randomly select 1 room
        return randomRoom[0]; // Return the first room (since only one is selected)
    } catch (err) {
        console.error('Error fetching random room:', err);
    }
}

io.on('connection', (socket) => {
    let randomRoom = null;
    let currentRoom = null;
    console.log('a user connected');

    try {
        socket.on('joinRoom', async (name) => {
            randomRoom = await getRandomRoom();
            if (currentRoom != null) { return socket.emit('roomJoined', "already in a room"); }
            if (randomRoom != null) {
                const roomId = randomRoom.room;
                randomRoom.members += 1;
                await Room.findOneAndUpdate({
                    room: randomRoom.room
                }, {
                    members: randomRoom.members
                }

                )
                socket.join(roomId);
                console.log(`Socket ${socket.id} joined room `);
                console.log(name);
                socket.emit('roomJoined', name, randomRoom.members);
                socket.to(roomId).emit('roomJoined', name, randomRoom.members);
                currentRoom = 1;
                socket.emit('question', `shall i ${randomRoom.question}`);
            }
            else {
                socket.emit('error', "no room was found");

            }
        });
        socket.on('leaveroom', async (name) => {
            if (randomRoom == null) return socket.emit('error', 'no room was found to join');
            console.log(randomRoom);
            randomRoom.members--;
            await Room.findOneAndUpdate({
                room: randomRoom.room
            }, {
                members: randomRoom.members
            })
            socket.to(randomRoom.room).emit('leftRoom', name, randomRoom.members);
            socket.leave(roomId);
            currentRoom = null;
        });
        socket.on('createRoom', async (roomId, name) => {
            socket.join(roomId);
            console.log(name);
            randomRoom = await Room.findOne({ room: roomId });
            randomRoom.members++;
            await Room.findOneAndUpdate({
                room: randomRoom.room
            }, {
                members: randomRoom.members
            })
            socket.emit('roomJoined', name, randomRoom.members);
            currentRoom = 1;
            socket.emit('question', `shall i ${randomRoom.question}`);
        })
        socket.on('vote', async (vote) => {
            console.log(vote);
            await Room.updateOne(
                { room: randomRoom.room },
                { $inc: { yes: vote === 'yes' ? 1 : 0, no: vote === 'no' ? 1 : 0 } }
            );
            randomRoom = await Room.findOne({ room: roomId });
            socket.emit('recVote', randomRoom.yes, randomRoom.no);
            socket.to(randomRoom.room).emit('recVote', randomRoom.yes, randomRoom.no);

        })
        socket.on('sendMsg', (name, sendMessage) => {
            socket.to(randomRoom.room).emit('recieveMsg', name, sendMessage);
            console.log('messages event triggered');
        })
    } catch (error) {
        console.log(error);
    }

});


server.listen(3000, () => {
    console.log('server running at http://localhost:3000');
});