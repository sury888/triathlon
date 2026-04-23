const cron = require('node-cron');
const Race = require('../models/Race');

cron.schedule('*/15 * * * *', async () => {
  try {
    const now = new Date();
    console.log(`[Cron ${now.toISOString()}] Checking for races to close...`);

    const updated = await Race.updateMany(
      {
        status: { $in: ['Upcoming', 'Open'] },
        lockTime: { $lte: now }
      },
      { $set: { status: 'Closed' } }
    );

    if (updated.modifiedCount > 0) {
      console.log(`[Cron] Closed ${updated.modifiedCount} races that have started`);
    } else {
      console.log(`[Cron] No races needed closing`);
    }

  } catch (err) {
    console.error('[Cron] Error closing races:', err.message);
  }
});
