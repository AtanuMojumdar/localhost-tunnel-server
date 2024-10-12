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

requestEvent.on("requeststatic", (requestId,requestURL) => {
    const socket = SingleSocket;
    if (socket) {
        socket.emit("requeststatic", requestId,requestURL); 
    }
});

app.get("/health",(req,res)=>{
    return res.json({
        message:"ok"
    })
})

app.get('/api', (req, res) => { //endpoint
    try{
        console.log("route-1 request")
        const requestId = Date.now(); 
        pendingResponses[requestId] = res; 
    
        requestEvent.emit("request", requestId); 
    }
    catch(err){
        console.log("route-1 request error")
        return res.status(500).send("Internal Server Error!")
    }
});

app.get("/*",(req,res)=>{
    try{
        console.log("route-2 request")
        const requestURL = req.url;
        const requestId = Date.now(); 
        pendingResponses[requestId] = res; 

        requestEvent.emit("requeststatic", requestId,requestURL);
    }
    catch(err){
        console.log("route-2 request error")
        return res.status(500).send("Internal Server Error!");

    }
})

io.use((socket, next) => {
    SingleSocket = socket;
    next();
});

io.on("connection", (socket) => {
    console.log("New Socket Connected With ID:", socket.id);

    socket.on("response", (data,headers, requestId) => {
        let res = null;
        try{
            console.log(data);
            
            if (pendingResponses[requestId]) {
                res = pendingResponses[requestId];
                if(data == "Internal Server Error"){
                    return res.status(500).send("internal Server Error"); 
                }
    
                for (const key in headers) {
                    if (Object.prototype.hasOwnProperty.call(headers, key)) {
                        res.setHeader(key,headers[key]);
                        
                    }
                }
                console.log("route-1 response")
                res.send(data); 
                delete pendingResponses[requestId]; 
            }
        }
        catch(err){
            console.log("route-1 response error")
            return res.status(500).send("internal Server Error"); 
        }
    });

    socket.on("responsestatic", (data,headers,requestId) => {
        let res = null;

        try{
            // console.log(data,requestId,headers)
            console.log(data)
            
            if (pendingResponses[requestId]) {
                res = pendingResponses[requestId];
                if(data == "Internal Server Error"){
                    console.log("Yup")
                    res.status(500).send("internal Server Error"); 
                }
    
                for (const key in headers) {
                    if (Object.prototype.hasOwnProperty.call(headers, key)) {
                        res.setHeader(key,headers[key]);
                        
                    }
                }
                console.log("route-2 response")
                res.send(data); 
                delete pendingResponses[requestId]; 
            }
        }
        catch(err){
            console.log("route-2 response error")
            return res.status(500).send("internal Server Error"); 
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
