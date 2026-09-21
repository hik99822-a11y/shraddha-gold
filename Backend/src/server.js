import dotenv from 'dotenv';
dotenv.config();

import app from './app.js';
import connectDB from './config/db.js';
import { startScheduler } from './services/schedulerService.js';
import SystemConfig from './models/SystemConfig.js';

const PORT = process.env.PORT || 5000;

// Connect to MongoDB Database
connectDB().then(async () => {
  // Load dynamic configs into environment
  try {
    const config = await SystemConfig.findOne({ key: 'DESKTOP_SERVER_URL' });
    if (config && config.value) {
      process.env.DESKTOP_SERVER_URL = config.value;
      console.log(`[Config] 🌐 Loaded DESKTOP_SERVER_URL from DB: ${config.value}`);
    }
  } catch (err) {
    console.error('[Config Error]: Failed to load system configs from DB:', err.message);
  }

  // Start server-side scheduled sharing worker
  startScheduler();
});

const server = app.listen(PORT, () => {
  console.log(`✨ [Shraddha Gold Backend Running] http://localhost:${PORT}`);
  console.log(`🏛️ [Role]: B2B Jewellery Manufacturer REST API`);
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error(`Unhandled Rejection Error: ${err.message}`);
  // Keep server alive or exit cleanly
});
