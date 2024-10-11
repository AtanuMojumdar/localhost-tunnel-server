import express from "express";
import http from 'http';
import { Server } from 'socket.io';
import EventEmitter from "events";

const app = express();
const PORT = process.argv[2] || 80;

let SingleSocket = null;
let pendingResponses = {}; 

const server = http.createServer(app);
const io = new Server(server);
const requestEvent = new EventEmitter();

requestEvent.on("request", (requestId) => {
    const socket = SingleSocket;
    if (socket) {
        socket.emit("request", requestId); 
    }
});

app.get('/api', (req, res) => { //endpoint
    try{
        const requestId = Date.now(); 
        pendingResponses[requestId] = res; 
    
        requestEvent.emit("request", requestId); 
    }
    catch(err){
        res.status(500).send("Internal Server Error!")
    }
});

io.use((socket, next) => {
    SingleSocket = socket;
    next();
});

io.on("connection", (socket) => {
    console.log("New Socket Connected With ID:", socket.id);

    socket.on("response", (data, requestId) => {
        // console.log(data);
        
        if (pendingResponses[requestId]) {
            const res = pendingResponses[requestId];
            res.send(data); 
            delete pendingResponses[requestId]; 
        }
    });

    socket.on("disconnect", () => {
        SingleSocket = null;
        console.log(`Socket is disconnected, ${socket.id}`);
    });
});

// Start the server
server.listen(PORT, () => {
    console.log(`Listening on ${PORT}`);
});
