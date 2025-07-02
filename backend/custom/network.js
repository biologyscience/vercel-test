const { networkInterfaces } = require('os');

const interalPort = 6850;
const externalPort = 80;
const localIP = 'localhost';
// const localIP = networkInterfaces()['wlan0'].filter(x => x.family === 'IPv4')[0].address;

module.exports = { interalPort, externalPort, localIP };