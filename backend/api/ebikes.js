const
    express = require('express'),
    ebikesAPI = express.Router();

let db, EM;

ebikesAPI.get('/sessions', (request, response) =>
{
    const IDs = [];

    for (const sessionID in db.data.sessions) IDs.push(parseInt(sessionID));

    response.send(IDs);
});

ebikesAPI.post('/StartSession', async (request, response) =>
{
    const { body } = request;

    const data =
    {
        bookingDate: Date.now(),
        ebike: body.EBIKE,
        user: body.username,
        time:
        {
            start: Date.now(),
            end: 'N/A',
            elapsed: 'N/A'
        },
        distance: 'N/A',
        charge:
        {
            start: body.SOC,
            end: 'N/A',
            net: 'N/A'
        },
        coordinates: []
    };

    db.data.sessions[body.SESSIONID] = data;
    db.data.status[body.EBIKE].wifi = true;
    db.data.status[body.EBIKE].locked = false;

    await db.write();

    response.sendStatus(200);
});

ebikesAPI.post('/EndSession', async (request, response) =>
{
    const { body } = request;

    const session = db.data.sessions[body.sessionID];

    const elapsed = new Date(Date.now() - session.time.start);

    session.bookingDate = new Date(session.bookingDate).toLocaleDateString();
    session.time.start = new Date(session.time.start).toLocaleTimeString('en');
    session.time.end = new Date(Date.now()).toLocaleTimeString('en');
    session.time.elapsed = `${elapsed.getUTCHours()}:${elapsed.getUTCMinutes()}:${elapsed.getSeconds()}`;
    session.distance = 0;

    for (let i = 1; (i < session.coordinates.length) && (session.coordinates.length > 1); i++)
    {
        const R = 6371 * 1000;

        const
            lat1 = session.coordinates[i - 1][0] * Math.PI / 180,
            lat2 = session.coordinates[i][0] * Math.PI / 180,
            lng1 = session.coordinates[i - 1][1] * Math.PI / 180,
            lng2 = session.coordinates[i][1] * Math.PI / 180;

        const
            changeInLatitude = lat2 - lat1,
            changeInLongitude = lng2 - lng1;

        const A = Math.pow(Math.sin(changeInLatitude / 2), 2) + Math.cos(lat1) * Math.cos(lat2) * Math.pow(Math.sin(changeInLongitude / 2), 2);

        const C = 2 * Math.atan2(Math.sqrt(A), Math.sqrt(1 - A));

        session.distance += (R * C);
    }

    session.distance = Math.round(session.distance);
    session.charge.end = body.soc;
    session.charge.net = session.charge.start - body.soc;
    db.data.status[session.ebike].wifi = false;
    db.data.status[session.ebike].locked = true;

    EM.emit('StatusUpdate');

    await db.write();

    response.sendStatus(200);
});

ebikesAPI.post('/StatusUpdate', async (request, response) =>
{
    const { body } = request;

    const
        sessionID = body.sessionID,
        ebike = body.ebike,
        speed = body.speed,
        soc = body.soc,
        locked = body.locked,
        currentPosition = body.gps;
    
    db.data.status[ebike].speed = speed;
    db.data.status[ebike].soc = soc;
    db.data.status[ebike].locked = locked;
    db.data.status[ebike].currentPosition = currentPosition;

    const last = db.data.sessions[sessionID].coordinates.at(-1);

    if ((last === undefined) && (currentPosition !== undefined)) db.data.sessions[sessionID].coordinates.push(currentPosition);

    else if ((last?.[0] !== currentPosition?.[0]) || (last?.[1] !== currentPosition?.[1])) db.data.sessions[sessionID].coordinates.push(currentPosition);

    await db.write();

    EM.emit('StatusUpdate');

    response.sendStatus(200);
});

module.exports = (database, EventManager) => { db = database; EM = EventManager; return ebikesAPI; };