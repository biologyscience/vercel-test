const { execSync } = require('child_process');

function digitalWrite(pin, state)
{
    // takes 5.2ms to execute
    execSync(`gpioset gpiochip0 ${pin}=${state ? 1 : 0}`);
};

function digitalRead(pin)
{
    const buffer = execSync(`pinctrl get ${pin}`);

    const state = buffer.toString('utf-8').split('| ')[1].slice(0, 2) === 'hi';

    return state;
};

module.exports = { digitalWrite, digitalRead };