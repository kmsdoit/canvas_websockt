const express = require('express')
const app = express()
const cors = require('cors')
const fs = require('fs')
const sslOptions = {
    key : fs.readFileSync('node-key.pem'),
    cert : fs.readFileSync('node-cert.pem')
}
const server = require('https').createServer(sslOptions,app)
const io = require("socket.io")(server,{
    cors : {
        origin : '*',
        method: ['GET','POST']
    }
});
const { ExpressPeerServer } = require("peer");
const peerServer = ExpressPeerServer(server, {
    debug: true,
});
const { v4: uuidV4 } = require("uuid");
const {Client} = require("pg");
const dbClient = new Client({
    user: "postgres",
    host: "211.219.71.59",
    database: "postgres",
    password: "password",
    port: 5432
});
dbClient.connect();

app.use(cors())
app.use("/peerjs", peerServer);
app.use(express.json())
app.use(express.static("public"));
app.set('view engine', 'ejs')



app.get('/', (req,res) => {
    res.render('register.ejs')
})

app.get('/home', (req,res) => {
    res.render('home.ejs')
})

app.get("/user", (req,res) => {
    dbClient.query(`select id,name,roomId from webrtc_test`, (error, result) => {
        if(result) {
            res.send({
                "statusCode" : 200,
                "data" : result.rows
            })
        }else {
            res.sendStatus(500);
        }
    })
})

app.post("/register",(req,res) => {
    const item = req.body;
    dbClient.query(`insert into webrtc_test(id,password,name) values("${item.id}","${item.password}", "${item.name}")`,(error, result) => {
        if(result) {
            res.cookie("userid",item.id)
            res.send({"statusCode":200});
        } else {
            console.log(error)
            res.sendStatus(500);
        }
    })
})

app.post("/join", (req, res) => {
    const roomId = uuidV4()
    const item = req.body
    console.log(item)
    dbClient.query(`update webrtc_test set roomid = '${roomId}' where id = '${item.myId}'`, (error, result) => {
        if (result) {
            dbClient.query(`update webrtc_test set roomid = '${roomId}' where id = '${item.partnerId}'`, (error, result) => {
                if (result) {
                    return res.send({"statusCode": 200, "roomId": roomId})
                } else {
                    console.log(error)
                    return res.sendStatus(500)
                }
            })
        } else {
            console.log(error)
            return res.sendStatus(500)
        }
    })
});

app.get("/getRoomId", (req,res) => {
    const userid = req.query.id
    console.log(userid)
    dbClient.query(`select roomid from webrtc_test where id = '${userid}'`,(error,result) => {
        if (result) {
            return res.send({
                "statusCode" : 200,
                "data" : result.rows
            })
        }else {
            console.log(error)
            return res.sendStatus(404)
        }
    })
});

app.get("/:room", (req, res) => {
    res.render("room", { roomId: req.params.room });
});

io.on("connection", (socket) => {
    socket.on("join-room", (roomId, userId) => {
        console.log(userId)
        socket.join(roomId);
        socket.to(roomId).broadcast.emit("user-connected", userId);
        // messages
        socket.on("message", (message) => {
            //send message to the same room
            io.to(roomId).emit("createMessage", message);
        });
        console.log(roomId)
        socket.on("beginPath", ({ x, y, size,origin,target}) =>{
            io.to(roomId).emit("beganPath", { x, y,size,origin,target })
        });
        socket.on("strokePath", ({ x, y, color,origin,target,mouseX,mouseY }) =>{
            io.to(roomId).emit("strokedPath", { x, y, color,origin,target,mouseX,mouseY});
        });
        socket.on("erasePath", ({ x, y,origin,target }) =>{
            io.to(roomId).emit("erasedPath", { x, y,origin,target});
        });
        socket.on("disconnect", () => {
            io.to(roomId).emit("user-disconnected", userId);
        });
    });
});


server.listen(8081, () => {
    console.log("server On")
})