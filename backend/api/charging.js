const
    express = require('express'),
    { Modbus } = require('../custom/ModbusFC03'),
    { digitalWrite } = require('../custom/gpio'),
    chargingAPI = express.Router();

let db;

chargingAPI.post('/getMeterData', async (request, response) =>
{
    const { body } = request;

    const responseArray = await Modbus.getResponses(body);

    const data = { comments: [] };

    responseArray.forEach((packet) =>
    {
        const { slaveID, rawAddress } = packet.request.decode();

        if (data[slaveID] === undefined) data[slaveID] = {};

        data[slaveID][rawAddress] = packet.response === null ? null : packet.response.decode().value;
        data.comments.push(packet.comment);
    });

    response.send(data);
});

chargingAPI.post('/writeGPIO', (request, response) =>
{
    const { body } = request;

    let ERROR;

    try { digitalWrite(body.pin, body.state); }
    catch (e) { ERROR = e; }

    if (ERROR === undefined) return response.status(200).json({success: true});

    response.status(500).json({success: false, reason: ERROR.message});
});

chargingAPI.post('/setOutletState', (request, response) =>
{
    const { body } = request;

    if ((0 >= body.outlet) || (body.outlet > 6)) return response.status(400).json({success: false, reason: 'outlet value can range only from 1 to 6'});

    let ERROR;

    const outletToGPIO = [null, 18, 23, 24, 25, 8, 17];

    try { digitalWrite(outletToGPIO[body.outlet], body.state); }
    catch (e) { ERROR = e; }

    if (ERROR === undefined) return response.status(200).json({success: true});

    response.status(500).json({success: false, reason: ERROR.message});
});

module.exports = (database) => { db = database; return chargingAPI; };