const { Client, LegacySessionAuth, MessageMedia} = require('whatsapp-web.js');

const express = require('express');
const qrcode = require('qrcode');
const socketIO = require('socket.io');
const http = require('http');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const SESSION_FILE_PATH = './auth-session.json';
let sessionData;
if (fs.existsSync(SESSION_FILE_PATH)) {
    sessionData = require(SESSION_FILE_PATH);
}

app.get('/', (req, res) => {
    // res.status(200).json({
    //     status:true,
    //     message:'Not Just Hello World'
    // }); ini buat testing
    res.sendFile('index.html', { root: __dirname });
});

const client = new Client({
    puppeteer: { headless: true }, 
    authStrategy: new LegacySessionAuth({
        session: sessionData
    })
});

client.on('authenticated', (session) => {
    console.log('AUTHENTICATED', session);
    sessionData = session;
    fs.writeFile(SESSION_FILE_PATH, JSON.stringify(session), function (err) {
        if (err) {
            console.error(err);
        }
    });
});


// client.on('message', msg => {
//     if (msg.body == 'ping') {
//         msg.reply('pong');
//     } else {
//         msg.reply('Ya Ndak Tau Kok Tanya Saya');
//     }
// });


client.initialize();

//Socket IO
io.on('connection', function (socket) {
    socket.emit('message', "Connecting ....");

    client.on('qr', (qr) => {
        // Generate and scan this code with your phone
        console.log('QR RECEIVED', qr);
        qrcode.toDataURL(qr, (err, url) => {
            socket.emit('qr', url);
            socket.emit('message', 'QR Code Reveived, please scan');
        });
    });

    client.on('ready', () => {
        socket.emit('message', 'WhatsApp is ready!');
    });
});

//send message
app.post('/send-message', (req, res) => {
    const number = req.body.number;
    const message = req.body.message;

    client.sendMessage(number, message).then(response => {
        res.status(200).json({
            status: true,
            response: response
        })
    }).catch(err => {
        res.status(500).json({
            status: false,
            response: err
        })
    });
});

//send media
app.post('/send-media', async (req, res) => {
    const number = req.body.number;
    const caption = req.body.caption;
    const media = await MessageMedia.fromUrl('https://reqres.in/img/faces/7-image.jpg');
    client.sendMessage(number, media, {caption : caption}).then(response => {
        res.status(200).json({
            status: true,
            response: response
        })
    }).catch(err => {
        res.status(500).json({
            status: false,
            response: err
        })
    });
});

server.listen(8000, function () {
    console.log("App running at port 8000");
});