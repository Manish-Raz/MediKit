const cron = require('node-cron');
const { processOverdueDoses } = require('../services/adherenceService');

let overdueTask = null;

const startCronJobs = () => {
  // Run every 5 minutes: '*/5 * * * *'
  overdueTask = cron.schedule('*/5 * * * *', async () => {
    try {
      const result = await processOverdueDoses(60);
      if (result.processedCount > 0) {
        console.log(`[Adherence Scheduler] Processed ${result.processedCount} overdue doses to missed status.`);
      }
    } catch (err) {
      console.error('[Adherence Scheduler Error]', err);
    }
  });

  console.log('[Scheduler] Background cron jobs scheduled (Overdue dose monitor active).');
};

const stopCronJobs = () => {
  if (overdueTask) {
    overdueTask.stop();
  }
};

module.exports = {
  startCronJobs,
  stopCronJobs,
};
