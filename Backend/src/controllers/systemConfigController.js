import SystemConfig from '../models/SystemConfig.js';

/**
 * @desc    Get all system configurations
 * @route   GET /api/admin/config
 * @access  Private (Admin)
 */
export const getSystemConfig = async (req, res) => {
  try {
    const configs = await SystemConfig.find({});
    // Convert to an object format: { DESKTOP_SERVER_URL: '...', ... }
    const configMap = {};
    configs.forEach((c) => {
      configMap[c.key] = c.value;
    });

    res.status(200).json({
      success: true,
      config: configMap,
    });
  } catch (error) {
    console.error('[getSystemConfig Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch system configurations' });
  }
};

/**
 * @desc    Update or create a system configuration
 * @route   POST /api/admin/config
 * @access  Private (Admin)
 */
export const updateSystemConfig = async (req, res) => {
  try {
    const { key, value } = req.body;

    if (!key || value === undefined) {
      return res.status(400).json({ success: false, message: 'Key and value are required' });
    }

    const config = await SystemConfig.findOneAndUpdate(
      { key },
      { value },
      { new: true, upsert: true }
    );

    // If updating the desktop server URL, update the running process environment variable
    if (key === 'DESKTOP_SERVER_URL') {
      const cleanUrl = typeof value === 'string' ? value.trim().replace(/\/+$/, '') : value;
      process.env.DESKTOP_SERVER_URL = cleanUrl;
      console.log(`[updateSystemConfig] 🌐 Updated live DESKTOP_SERVER_URL to: ${cleanUrl}`);
    }

    res.status(200).json({
      success: true,
      message: `${key} updated successfully`,
      config,
    });
  } catch (error) {
    console.error('[updateSystemConfig Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to update system configuration' });
  }
};
