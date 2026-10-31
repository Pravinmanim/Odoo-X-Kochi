import cron from 'node-cron';
import { runBillingEngine } from './billingService.js';

let isJobRunning = false;

/**
 * Initializes the automated daily billing and auto-close cron schedule
 */
export function initBillingCron() {
  // Run daily at midnight (00:00)
  const schedule = '0 0 * * *';

  cron.schedule(schedule, async () => {
    if (isJobRunning) {
      console.log('[Cron] Previous billing run still in progress. Skipping cycle.');
      return;
    }

    isJobRunning = true;
    console.log(`[Cron] [${new Date().toISOString()}] Starting automated subscription billing engine...`);

    try {
      const summary = await runBillingEngine();
      console.log(
        `[Cron] Billing engine completed. Invoices created: ${summary.created}, Skipped: ${summary.skipped}, Auto-closed: ${summary.autoClosedCount}, Failed: ${summary.failed}`
      );
    } catch (err) {
      console.error('[Cron] Unexpected error during automated billing run:', err);
    } finally {
      isJobRunning = false;
    }
  });

  console.log('[Cron] Automated billing cron job registered (0 0 * * *).');
}
