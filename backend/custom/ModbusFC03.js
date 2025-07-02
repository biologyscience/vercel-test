const { SerialPort } = require('serialport');

const { crc16modbus } = require('crc');

class Modbus
{
    #requests = [];
    #responses = [];
    #recieved = false;
    #requestToSend = undefined;
    #lineBusy = false;

    //
    // POWER VALUE FOR SLAVE ID 12
    // WILL BREAK THE CODE
    //

    // FC 03 ONLY - READ HOLDING REGISTERS
    #setRequest(slaveID, rawAddress, quantity)
    {
        const buffs =
        {
            slave: Buffer.from([slaveID], 'HEX'),
            fc: Buffer.from([3], 'HEX'),
            address: Buffer.from((rawAddress - 40001).toString(16).padStart(4, '0'), 'HEX'),
            quantity: Buffer.from((quantity).toString(16).padStart(4, '0'), 'HEX')
        };
    
        const info = Buffer.concat([buffs.slave, buffs.fc, buffs.address, buffs.quantity]);
    
        const crc = Buffer.from(crc16modbus(info).toString(16).padStart(4, '0'), 'HEX').reverse();
    
        const request = Buffer.concat([info, crc]);

        this.#requests.push(request);

        return this;
    };

    #decodeRequest(request)
    {
        const
            slaveID = request.subarray(0, 1).readUInt8(),
            fc = request.subarray(1, 2).readUInt8(),
            rawAddress = request.subarray(2, 4).readUInt16BE() + 40001,
            quantity = request.subarray(4, 6).readUInt16BE(),
            crc = request.subarray(6, 8).readUInt16LE();

        return { slaveID, fc, rawAddress, quantity, crc };
    };    

    #decodeResponse(response)
    {
        const
            slaveID = response.subarray(0, 1).readUInt8(),
            fc = response.subarray(1, 2).readUInt8(),
            totalDataBytes = response.subarray(2, 3).readUInt8();
    
        let i = 3 + totalDataBytes;

        const reorder = [];

        while (i > 3)
        {
            reorder.push(response.subarray(i - 2, i));

            i -= 2;
        }

        let data = Buffer.from([]);

        reorder.forEach(x => data = Buffer.concat([data, x]));

        const value = data.readFloatBE();

        const
            crcOffset = 3 + totalDataBytes,
            crc = response.subarray(crcOffset, crcOffset + 2).readUInt16LE(),
            crcCalculated = crc16modbus(response.subarray(0, -2));

        return { slaveID, fc, totalDataBytes, value, crc, crcCalculated }; 
    };

    #portOpened()
    {
        return new Promise((resolve) =>
        {
            let int = setInterval(() =>
            {
                if (this.serialPort.isOpen)
                {
                    resolve(true);

                    clearInterval(int);
                }
            });
        });
    };

    #lineFree()
    {
        return new Promise((resolve) =>
        {
            let int = setInterval(() =>
            {
                if (!this.#lineBusy)
                {
                    resolve(true);

                    clearInterval(int);
                }
            });
        });
    };

    #cleanup()
    {
        this.#requests = [];
        this.#responses = [];
        this.#recieved = false;
        this.#requestToSend = undefined;
        this.#lineBusy = false;
    };

    constructor(path, baudRate, timeout)
    {
        const self = this;

        this.serialPort = new SerialPort({ path, baudRate, autoOpen: false });
        this.timeout = timeout;

        this.serialPort.on('close', () => this.#cleanup());

        this.serialPort.on('data', (responseBuffer) =>
        {
            console.log(responseBuffer);

            try
            {
                if (this.#requestToSend.equals(responseBuffer)) return;
            
                this.#recieved = true;
        
                const toPush =
                {
                    request: { raw: this.#requestToSend, decode() { return self.#decodeRequest(this.raw); } },
                    response: { raw: responseBuffer, decode() { return self.#decodeResponse(this.raw); } }
                };

                const response = this.#decodeResponse(responseBuffer);
    
                if (response.crc !== response.crcCalculated) toPush.comment = 'CRC Error';
    
                this.#responses.push(toPush);

            } catch (error) { return console.error(error); }
        });
    };

    /**
     * @param {Array<[slaveID, rawAddress, quantity]>} array 
     * quantity defaults to 2, if given undefined
     * @returns 
     */
    async getResponses(array)
    {
        const self = this;
        
        if (array === undefined || array.length === 0) throw new Error('No requests are provided');

        if (this.#lineBusy) await this.#lineFree();

        this.#lineBusy = true;

        array.forEach(x => this.#setRequest(x[0], x[1], x[2] || 2)); // 2 = No.of registers default

        this.serialPort.open();

        await this.#portOpened();
        
        while (this.#requests.length !== 0)
        {
            this.#requestToSend = this.#requests.shift();

            this.serialPort.write(this.#requestToSend, 'HEX');

            await wait(this.timeout); // keep 20ms

            try
            {
                if (this.#recieved) this.#recieved = false;
                
                else
                {
                    this.#responses.push
                    ({
                        request: { raw: this.#requestToSend, decode() { return self.#decodeRequest(this.raw); } },
                        response: null,
                        comment: 'Device did not reply'
                    });
                }
                
            } catch (error) { return console.error(error); }
        };
        
        const copyResponses = [...this.#responses];
        
        this.serialPort.close();

        return copyResponses;
    };
};

function wait(ms) { return new Promise((resolve) => setTimeout(resolve, ms)); }

let modbusClient;

if (modbusClient === undefined) modbusClient = new Modbus('/dev/ttyAMA0', 9600, 20);

module.exports = { Modbus: modbusClient, wait };