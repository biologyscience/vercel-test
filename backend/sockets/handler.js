const
    charging = require('./charging'),
    ebikes = require('./ebikes');

let clientCount = 0, dbEbikes, dbOutlets, EM;

function init(EBIKES, OUTLETS, EVENTMANAGER)
{
    dbEbikes = EBIKES;
    dbOutlets = OUTLETS;
    EM = EVENTMANAGER;
};

function handler(socket)
{
    clientCount++;
    console.log(`-> ${socket.id}`);

    socket.on('disconnect', () =>
    {
        clientCount--;
        console.log(`<- ${socket.id}`);
    });

    socket.on('WantBikeStatus', () => ebikes.WantBikeStatus(socket, dbEbikes));
    socket.on('WantDailyUsage', () => ebikes.WantDailyUsage(socket));
    socket.on('WantWeeklyUsage', () => ebikes.WantWeeklyUsage(socket));
    
    socket.on('WantPastBookings', () => ebikes.WantPastBookings(socket, dbEbikes));
    socket.on('WantEbikeSession', ({session}) => socket.emit('TakeEbikeSession', dbEbikes.data.sessions[session]));
    socket.on('StartTracking', () => socket.emit('TakeTracking', dbEbikes.data.status));

    EM.on('StatusUpdate', () => socket.emit('TakeTracking', dbEbikes.data.status));

    socket.on('WantOutletsData', () => socket.emit('TakeOutletsData', dbOutlets.data));
};

setInterval(async () =>
{
    if (clientCount <= 0) return;

    await charging.updateMeterData(dbOutlets);
}, 2000);

module.exports = { handler, init };