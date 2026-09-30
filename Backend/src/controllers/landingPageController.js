import LandingPage from '../models/LandingPage.js';

// @desc    Get landing page settings
// @route   GET /api/landing-page
// @access  Public
export const getLandingPageSettings = async (req, res, next) => {
  try {
    let settings = await LandingPage.findOne();
    if (!settings) {
      settings = await LandingPage.create({});
    }
    res.json(settings);
  } catch (error) {
    next(error);
  }
};

// @desc    Update landing page settings
// @route   PUT /api/landing-page
// @access  Private/Admin
export const updateLandingPageSettings = async (req, res, next) => {
  try {
    let settings = await LandingPage.findOne();
    if (!settings) {
      settings = new LandingPage();
    }
    
    // Merge updates
    const updates = req.body;
    if (updates.general) settings.general = { ...settings.general, ...updates.general };
    if (updates.hero) settings.hero = updates.hero;
    if (updates.companyOverview) settings.companyOverview = { ...settings.companyOverview, ...updates.companyOverview };
    if (updates.ourValues) settings.ourValues = { ...settings.ourValues, ...updates.ourValues };
    if (updates.usps) settings.usps = updates.usps;
    if (updates.manufacturing) settings.manufacturing = updates.manufacturing;
    if (updates.exhibitions) settings.exhibitions = updates.exhibitions;
    if (updates.featuredCategories) settings.featuredCategories = updates.featuredCategories;
    if (updates.strengths) settings.strengths = updates.strengths;
    if (updates.faqs) settings.faqs = updates.faqs;

    const updatedSettings = await settings.save();
    res.json(updatedSettings);
  } catch (error) {
    next(error);
  }
};
