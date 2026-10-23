require('dotenv').config();
const connectDB = require('./src/config/db');
const createApp = require('./src/app');
const { startCronJobs, stopCronJobs } = require('./src/jobs/overdueDosesJob');

const PORT = process.env.PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/medisync';

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB(MONGODB_URI);

    // Initialize Express application
    const app = createApp(MONGODB_URI);

    // Start background adherence schedulers
    startCronJobs();

    // Start HTTP server
    const server = app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(` MediSync Server is running on: http://localhost:${PORT}`);
      console.log(` Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(` Health Check: http://localhost:${PORT}/api/health`);
      console.log(` Patient Dashboard: http://localhost:${PORT}/patient-dashboard.html`);
      console.log(` Doctor Dashboard: http://localhost:${PORT}/doctor-dashboard.html`);
      console.log(` Caregiver Dashboard: http://localhost:${PORT}/caregiver-dashboard.html`);
      console.log(` Pharmacy Dashboard: http://localhost:${PORT}/pharmacy-dashboard.html`);
      console.log(`====================================================`);
    });

    // Graceful shutdown handling
    const shutdown = () => {
      console.log('\nGracefully shutting down MediSync server...');
      stopCronJobs();
      server.close(() => {
        console.log('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (error) {
    console.error('Fatal error starting MediSync server:', error);
    process.exit(1);
  }
};

startServer();
