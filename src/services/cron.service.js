const cron = require('node-cron');
const prisma = require('../config/prisma');

const markOverdueTasks = async () => {
  try {
    const result = await prisma.task.updateMany({
      where: {
        dueDate: { lt: new Date() },
        status: { in: ['TODO', 'IN_PROGRESS'] },
      },
      data: { status: 'OVERDUE' },
    });
    if (result.count > 0) {
      console.log(`[Cron] Marked ${result.count} tasks as OVERDUE`);
    }
  } catch (err) {
    console.error('[Cron] Error marking overdue tasks:', err);
  }
};

const startCronJobs = () => {
  // Run every hour
  cron.schedule('0 * * * *', markOverdueTasks);
  console.log('[Cron] Overdue task checker started');
  // Run once on startup
  markOverdueTasks();
};

module.exports = { startCronJobs };
