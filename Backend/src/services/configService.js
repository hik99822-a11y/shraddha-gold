import SystemConfig from '../models/SystemConfig.js';

class ConfigService {
  constructor() {
    this.cache = {};
  }

  async loadAll() {
    try {
      const configs = await SystemConfig.find({});
      configs.forEach(c => {
        // Clean URL if it's the desktop server URL
        if (c.key === 'DESKTOP_SERVER_URL' && typeof c.value === 'string') {
          this.cache[c.key] = c.value.trim().replace(/\/+$/, '');
        } else {
          this.cache[c.key] = c.value;
        }
      });
      console.log(`[ConfigService] 🌐 Loaded ${configs.length} system configs from DB into cache`);
    } catch (err) {
      console.error('[ConfigService Error]:', err.message);
    }
  }

  get(key, fallback = null) {
    return this.cache[key] !== undefined ? this.cache[key] : fallback;
  }

  set(key, value) {
    if (key === 'DESKTOP_SERVER_URL' && typeof value === 'string') {
      this.cache[key] = value.trim().replace(/\/+$/, '');
    } else {
      this.cache[key] = value;
    }
  }
}

export const configService = new ConfigService();
