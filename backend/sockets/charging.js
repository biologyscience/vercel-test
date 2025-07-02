const { Modbus } = require('../custom/ModbusFC03');

async function updateMeterData(db)
{
    for (const key in db.data)
    {
        db.data[key].V = Math.random() * (240 - 220) + 220;
        db.data[key].A = Math.random() * 16;
        db.data[key].Hz = Math.random() * (50.1 - 49.9) + 49.9;
        db.data[key].W = Math.random() * 5000;
        db.data[key].VA = Math.random() * 5000;
        db.data[key].PF = Math.random();
        db.data[key].Wh = Math.random() * 50000;
        db.data[key].h = Math.random() * 50000;
        db.data[key].status = Math.random() > 0.5;
    }

    await db.write();

    return;

    const addresses = [40101, 40117, 40125, 40141, 40149, 40157, 40159, 40217];
    const slaves = [1, 2, 3, 4, 5, 6];

    const addressToUnit =
    {
        40101: 'W',
        40117: 'PF',
        40125: 'VA',
        40141: 'V',
        40149: 'A',
        40157: 'Hz',
        40159: 'Wh',
        40217: 'h'
    };

    const requests = [];

    slaves.forEach((slaveID) =>
    {
        addresses.forEach((address) =>
        {
            requests.push([slaveID, address, 2]);
        });
    });

    const responseArray = await Modbus.getResponses(requests);

    const data = {};

    responseArray.forEach((packet) =>
    {
        const { slaveID, rawAddress } = packet.request.decode();

        if (data[slaveID] === undefined) data[slaveID] = {};

        data[slaveID][rawAddress] = packet.response === null ? null : packet.response.decode().value;

        if ((packet.comment !== undefined) && (db.data[`outlet${slaveID}`].status === true)) db.data[`outlet${slaveID}`].status = false;
    });

    for (const ID in data) for (const address in data[ID]) db.data[`outlet${ID}`][addressToUnit[address]] = data[ID][address];

    await db.write();
}

module.exports = { updateMeterData };