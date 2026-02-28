require('dotenv').config();
const mongoose = require('mongoose');
const Athlete = require('./models/Athlete');
const Race = require('./models/Race');

(async () => {
    await mongoose.connect(process.env.MONGO_URI);
    const a = await Athlete.create({ name: "Alistair Brownlee", gender: "M", country: "UK", age: 36 });
    const r = await Race.create({ name: "Ironman World Championship", date: new Date('2026-10-12'), location: "Kailua-Kona, Hawaii", series: "Ironman Pro Series", gender: "M", lockTime: new Date(2026, 9, 11, 12, 0, 0) });
    console.log('Created Athlete:', a);
    console.log('Created Race:', r);
    await mongoose.disconnect();
    process.exit(0);
})();