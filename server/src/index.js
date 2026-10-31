import app from './app.js';
import { config } from './config/env.js';
import { initBillingCron } from './services/cronService.js';

const server = app.listen(config.port, () => {
  console.log(`Brightloop Server running on port ${config.port} (${config.nodeEnv})`);
  console.log(`Base API: http://localhost:${config.port}/api/v1`);

  // Initialize automated background billing jobs
  initBillingCron();
});

process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server terminated.');
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  server.close(() => {
    console.log('Server terminated.');
  });
});
