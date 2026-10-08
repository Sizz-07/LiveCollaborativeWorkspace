const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();

app.use(cors());
app.use(express.json());

const server = http.createServer(app);

const io = new Server(server, {
    cors: {
        origin: "http://localhost:5173",
        methods: ["GET", "POST"]
    }
});

const rooms = new Map();

const updateTimes = new Map();

app.get("/", (req, res) => {
    res.send("Live Collaborative Workspace Server Running");
});

io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    socket.on("createRoom", (data) => {
        const { name, roomId, passcode } = data;

        if (!name || !roomId) {
            socket.emit("roomError", "Name and Room ID are required.");
            return;
        }

        if (rooms.has(roomId)) {
            socket.emit("roomError", "Room already exists.");
            return;
        }

        const room = {
            roomId,
            passcode: passcode || null,
            host: socket.id,
            content: "// Start coding together...\n",
            members: [
                {
                    socketId: socket.id,
                    name,
                    joinedAt: Date.now()
                }
            ],
            activity: [
                `${name} created the room`
            ]
        };

        rooms.set(roomId, room);

        socket.join(roomId);

        socket.data.roomId = roomId;
        socket.data.name = name;

        socket.emit("roomCreated", {
            roomId,
            name,
            host: true,
            content: room.content,
            members: room.members,
            activity: room.activity
        });

        console.log(`Room created: ${roomId} by ${name}`);
    });

    socket.on("joinRoom", (data) => {
        const { name, roomId, passcode } = data;

        if (!name || !roomId) {
            socket.emit("roomError", "Name and Room ID are required.");
            return;
        }

        const room = rooms.get(roomId);

        if (!room) {
            socket.emit("roomError", "Room does not exist.");
            return;
        }

        if (room.passcode && room.passcode !== passcode) {
            socket.emit("roomError", "Incorrect passcode.");
            return;
        }

        const member = {
            socketId: socket.id,
            name,
            joinedAt: Date.now()
        };

        room.members.push(member);
        room.activity.push(`${name} joined the room`);

        socket.join(roomId);

        socket.data.roomId = roomId;
        socket.data.name = name;

        socket.emit("roomJoined", {
            roomId,
            name,
            host: false,
            content: room.content,
            members: room.members,
            activity: room.activity
        });

        socket.to(roomId).emit("membersUpdated", room.members);

        socket.to(roomId).emit("activityUpdate", {
            message: `${name} joined the room`
        });

        console.log(`${name} joined room ${roomId}`);
    });

    socket.on("documentUpdate", (content) => {
        const roomId = socket.data.roomId;

        if (!roomId) {
            return;
        }

        const now = Date.now();

        if (!updateTimes.has(socket.id)) {
            updateTimes.set(socket.id, []);
        }

        const times = updateTimes.get(socket.id);

        const recent = times.filter(time => now - time < 1000);

        if (recent.length >= 5) {
            socket.emit("rateLimited", "Too many updates. Slow down.");
            return;
        }

        recent.push(now);
        updateTimes.set(socket.id, recent);

        const room = rooms.get(roomId);

        if (!room) {
            return;
        }

        room.content = content;

        socket.to(roomId).emit("documentUpdate", content);
    });

    socket.on("cursorUpdate", (position) => {
        const roomId = socket.data.roomId;

        if (!roomId) {
            return;
        }

        socket.to(roomId).emit("cursorUpdate", {
            socketId: socket.id,
            name: socket.data.name,
            position
        });
    });

    socket.on("typing", (isTyping) => {
        const roomId = socket.data.roomId;

        if (!roomId) {
            return;
        }

        socket.to(roomId).emit("typing", {
            socketId: socket.id,
            name: socket.data.name,
            isTyping
        });
    });

    socket.on("disconnect", () => {
        console.log("Client disconnected:", socket.id);

        updateTimes.delete(socket.id);

        const roomId = socket.data.roomId;

        if (!roomId) {
            return;
        }

        const room = rooms.get(roomId);

        if (!room) {
            return;
        }

        const disconnectedMember = room.members.find(
            member => member.socketId === socket.id
        );

        room.members = room.members.filter(
            member => member.socketId !== socket.id
        );

        if (disconnectedMember) {
            room.activity.push(`${disconnectedMember.name} disconnected`);
        }

        if (room.host === socket.id) {
            if (room.members.length > 0) {
                room.members.sort(
                    (a, b) => a.joinedAt - b.joinedAt
                );

                room.host = room.members[0].socketId;

                io.to(roomId).emit("hostChanged", {
                    host: room.host
                });
            } else {
                rooms.delete(roomId);
                console.log(`Room deleted: ${roomId}`);
                return;
            }
        }

        io.to(roomId).emit("membersUpdated", room.members);

        io.to(roomId).emit("activityUpdate", {
            message: disconnectedMember
                ? `${disconnectedMember.name} disconnected`
                : "A user disconnected"
        });
    });
});

const PORT = 3001;

server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});