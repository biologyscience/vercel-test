const
    express = require('express'),
    path = require('path'),
    { readFileSync } = require('fs'),
    { Server } = require('socket.io'),
    { Low } = require('lowdb'),
    { JSONFile } = require('lowdb/node'),
    { EventEmitter } = require('events'),
    { interalPort, externalPort, localIP } = require('./custom/network');

const app = express();

const
    dbEbikes = new Low(new JSONFile('./json/ebikes.json'), {}),
    dbOutlets = new Low(new JSONFile('./json/outlets.json'), {}),
    EventManager = new EventEmitter();

const socketHandler = require('./sockets/handler');
socketHandler.init(dbEbikes, dbOutlets, EventManager);

app.use(express.json());

app.use('/api/ebikes', require('./api/ebikes')(dbEbikes, EventManager));
app.use('/api/charging', require('./api/charging')(dbOutlets));

app.use('/app/charging/start', (request, response) =>
{
    const { outlet } = request.query;

    if (outlet === undefined) return response.sendStatus(400);

    const html = readFileSync('./html/AppHandle.html', 'utf-8');

    response.send(html.replace('${DEEP_LINK}', `com.ev://start?outlet=${outlet}`));
});

app.use(express.static(path.join(__dirname, '../frontend/build')));
app.get('*name', (request, response) => response.sendFile(path.join(__dirname, '../frontend/build/index.html')));

app.once('ready', async () =>
{
    // const response = await fetch('https://api.ipify.org/?format=json');

    // const { ip: publicIP } = await response.json();

    const publicIP = '000';

    console.log(`http://${localIP}:${interalPort} -> http://${publicIP}:${externalPort} -> https://ev.q2lens.com`);

    await dbEbikes.read();
    await dbOutlets.read();
});

const server = app.listen(process.env.PORT || 4000, localIP, () => app.emit('ready'));

const io = new Server(server, {cors: {origin: '*'}});

io.on('connect', socket => socketHandler.handler(socket));
