import CategoryGroup from '../models/CategoryGroup.js';
import Category from '../models/Category.js';

/**
 * @desc    Get all Category Groups
 * @route   GET /api/admin/category-groups
 * @access  Private (Admin)
 */
export const getCategoryGroups = async (req, res) => {
  try {
    const groups = await CategoryGroup.find()
      .populate('categories', 'name normalizedName itemCount')
      .sort({ name: 1 });

    res.status(200).json({
      success: true,
      categoryGroups: groups
    });
  } catch (error) {
    console.error('[getCategoryGroups Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch category groups', error: error.message });
  }
};

/**
 * @desc    Create Category Group
 * @route   POST /api/admin/category-groups
 * @access  Private (Admin)
 */
export const createCategoryGroup = async (req, res) => {
  try {
    const { name, categories = [], description = '' } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category Group name is required' });
    }

    const existing = await CategoryGroup.findOne({ name: name.trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: `Category Group '${name}' already exists` });
    }

    // Resolve category names snapshot without altering original Category data
    const categoryDocs = await Category.find({ _id: { $in: categories } });
    const categoryNames = categoryDocs.map((c) => c.name);

    const group = await CategoryGroup.create({
      name: name.trim(),
      categories,
      categoryNames,
      description
    });

    const populated = await CategoryGroup.findById(group._id).populate('categories', 'name normalizedName itemCount');

    res.status(201).json({
      success: true,
      message: 'Category Group created successfully',
      categoryGroup: populated
    });
  } catch (error) {
    console.error('[createCategoryGroup Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to create category group', error: error.message });
  }
};

/**
 * @desc    Update Category Group
 * @route   PUT /api/admin/category-groups/:id
 * @access  Private (Admin)
 */
export const updateCategoryGroup = async (req, res) => {
  try {
    const { name, categories, description, status } = req.body;
    const group = await CategoryGroup.findById(req.params.id);

    if (!group) {
      return res.status(404).json({ success: false, message: 'Category Group not found' });
    }

    if (name) group.name = name.trim();
    if (description !== undefined) group.description = description;
    if (status) group.status = status;

    if (categories && Array.isArray(categories)) {
      group.categories = categories;
      const categoryDocs = await Category.find({ _id: { $in: categories } });
      group.categoryNames = categoryDocs.map((c) => c.name);
    }

    // Strictly saves CategoryGroup without mutating Category master data
    await group.save();

    const updated = await CategoryGroup.findById(group._id).populate('categories', 'name normalizedName itemCount');

    res.status(200).json({
      success: true,
      message: 'Category Group updated successfully',
      categoryGroup: updated
    });
  } catch (error) {
    console.error('[updateCategoryGroup Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to update category group', error: error.message });
  }
};

/**
 * @desc    Delete Category Group
 * @route   DELETE /api/admin/category-groups/:id
 * @access  Private (Admin)
 */
export const deleteCategoryGroup = async (req, res) => {
  try {
    const group = await CategoryGroup.findById(req.params.id);
    if (!group) {
      return res.status(404).json({ success: false, message: 'Category Group not found' });
    }

    // Deleting category group never affects original category master records
    await CategoryGroup.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Category Group removed successfully'
    });
  } catch (error) {
    console.error('[deleteCategoryGroup Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to delete category group', error: error.message });
  }
};
