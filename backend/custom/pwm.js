const { execSync } = require('child_process');
const { writeFileSync, existsSync } = require('fs');
const process = require('process');

class PWM
{
    // For PWM to work as output -> dtoverlay=pwm-2chan,pin=12,func=4,pin2=13,func2=4 <- to be placed in /boot/firmware/config.txt

    /**
     * PIN VALUES - GPIO VALUES - ALT
     * 0 - 12 - a0
     * 1 - 13 - a0
     * 2 - 18 - a3
     * 3 - 19 - a3
     */

    #PINGPIO = [12, 13, 18, 19];
    #PINALT = ['a0', 'a0', 'a3', 'a3'];
    #PWMPATH = '/sys/class/pwm/pwmchip0';

    constructor(pin, frequency, dutyCycle)
    {
        this.pin = pin;
        this.frequency = frequency;
        this.dutyCycle = dutyCycle;
        
        this.cleanup = this.cleanup.bind(this);
        process.on('SIGINT', this.cleanup);
        process.on('SIGTERM', this.cleanup);
    }

    start()
    {
        const
            GPIO = this.#PINGPIO[this.pin],
            ALT = this.#PINALT[this.pin];

        execSync(`pinctrl set ${GPIO} ${ALT}`);

        const
            timePeriodNS = Math.floor((10 ** 9) / this.frequency),
            dutyCycleNS = Math.floor((this.dutyCycle / 100) * timePeriodNS);

        if (!existsSync(`${this.#PWMPATH}/pwm${this.pin}`)) writeFileSync(`${this.#PWMPATH}/export`, this.pin.toString());

        setTimeout(() =>
        {
            writeFileSync(`${this.#PWMPATH}/pwm${this.pin}/period`, timePeriodNS.toString());
            writeFileSync(`${this.#PWMPATH}/pwm${this.pin}/duty_cycle`, dutyCycleNS.toString());
            writeFileSync(`${this.#PWMPATH}/pwm${this.pin}/enable`, '1');
        }, 10);
    }

    stop()
    {
        writeFileSync(`${this.#PWMPATH}/pwm${this.pin}/enable`, '0');
        writeFileSync(`${this.#PWMPATH}/unexport`, this.pin.toString());
    }

    cleanup()
    {
        this.stop();
        process.exit(0);
    }

    changeFrequency(frequency)
    {
        this.frequency = frequency;

        writeFileSync(`${this.#PWMPATH}/pwm${this.pin}/period`, Math.floor((10 ** 9) / this.frequency).toString());
    }

    changeDutyCycle(dutyCycle)
    {
        this.dutyCycle = dutyCycle;

        writeFileSync(`${this.#PWMPATH}/pwm${this.pin}/duty_cycle`, Math.floor((this.dutyCycle / 100) * ((10 ** 9) / this.frequency)).toString());
    }
}

module.exports = PWM;