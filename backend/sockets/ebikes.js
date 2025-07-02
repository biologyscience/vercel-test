function WantBikeStatus(socket, db)
{
    const status = ['red', 'yellow', 'green'];

    const data = {};

    data.ebike1 = db.data.status['E-Bike 1'].wifi ? 'red' : 'green';
    data.ebike2 = db.data.status['E-Bike 2'].wifi ? 'red' : 'green';
    data.ebike3 = db.data.status['E-Bike 3'].wifi ? 'red' : 'green';

    socket.emit('TakeBikeStatus', data);
};

function WantDailyUsage(socket)
{
    const barData =
    [
        { category: "E-Bike 1", value: Math.floor(Math.random() * 10) },
        { category: "E-Bike 2", value: Math.floor(Math.random() * 10) },
        { category: "E-Bike 3", value: Math.floor(Math.random() * 10) },
    ];
    
    socket.emit('TakeDailyUsage', barData);
};

function WantWeeklyUsage(socket)
{
    const barData =
    [
        { category: "E-Bike 1", value: Math.floor(Math.random() * 10) },
        { category: "E-Bike 2", value: Math.floor(Math.random() * 10) },
        { category: "E-Bike 3", value: Math.floor(Math.random() * 10) },
    ];
    
    socket.emit('TakeWeeklyUsage', barData);
};

function WantPastBookings(socket, db)
{
    const data = [];

    for (const sessionID in db.data.sessions)
    {
        const session = db.data.sessions[sessionID];

        data.push(
            {
                id: sessionID,
                date: session.bookingDate,
                bike: session.ebike,
                user: session.user,
                distance: session.distance,
                duration: session.time.elapsed
            }
        );
    };

    data.reverse();

    socket.emit('TakePastBookings', data);
};

module.exports = { WantBikeStatus, WantDailyUsage, WantWeeklyUsage, WantPastBookings };