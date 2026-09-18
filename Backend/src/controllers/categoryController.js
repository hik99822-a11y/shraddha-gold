import Category from '../models/Category.js';
import CategoryGroup from '../models/CategoryGroup.js';
import Style from '../models/Style.js';

/**
 * @desc    Get all categories with search, style counts & assigned Category Groups
 * @route   GET /api/admin/categories
 * @access  Private (Admin)
 */
export const getCategories = async (req, res) => {
  try {
    const { search, status, group } = req.query;
    const query = {};

    if (status && status !== 'all') {
      query.status = status;
    }

    if (search) {
      query.name = new RegExp(search.trim(), 'i');
    }

    // Fetch all active category groups
    const categoryGroups = await CategoryGroup.find()
      .select('_id name categories categoryNames')
      .lean();

    const categoryToGroupsMap = new Map();
    for (const grp of categoryGroups) {
      if (Array.isArray(grp.categories)) {
        for (const catId of grp.categories) {
          const idStr = catId.toString();
          if (!categoryToGroupsMap.has(idStr)) {
            categoryToGroupsMap.set(idStr, []);
          }
          categoryToGroupsMap.get(idStr).push({
            _id: grp._id,
            name: grp.name
          });
        }
      }
    }

    // Optional filter by category group
    if (group && group !== 'all') {
      const targetGroup = categoryGroups.find((g) => g._id.toString() === group || g.name === group);
      if (targetGroup && Array.isArray(targetGroup.categories)) {
        query._id = { $in: targetGroup.categories };
      } else {
        query._id = { $in: [] };
      }
    }

    const categories = await Category.find(query).sort({ name: 1 }).lean();

    // Dynamically calculate live style counts per category
    const categoryCounts = await Style.aggregate([
      { $match: { status: { $in: ['Active', 'Removed from latest stock'] } } },
      {
        $group: {
          _id: { $toLower: '$categoryName' },
          total: { $sum: 1 },
          active: { $sum: { $cond: [{ $eq: ['$status', 'Active'] }, 1, 0] } }
        }
      }
    ]);

    const countMap = new Map(categoryCounts.map((c) => [c._id, c]));

    const enrichedCategories = categories.map((cat) => {
      const key = (cat.normalizedName || cat.name || '').toLowerCase();
      const stats = countMap.get(key);
      const catIdStr = cat._id.toString();
      const assignedGroups = categoryToGroupsMap.get(catIdStr) || [];

      return {
        ...cat,
        itemCount: stats ? stats.total : (cat.itemCount || 0),
        activeCount: stats ? stats.active : 0,
        groups: assignedGroups,
        groupNames: assignedGroups.map((g) => g.name)
      };
    });

    res.status(200).json({
      success: true,
      categories: enrichedCategories
    });
  } catch (error) {
    console.error('[getCategories Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch categories', error: error.message });
  }
};

/**
 * @desc    Create category manually
 * @route   POST /api/admin/categories
 * @access  Private (Admin)
 */
export const createCategory = async (req, res) => {
  try {
    const { name, description, groupIds = [] } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ success: false, message: 'Category name is required' });
    }

    const normalizedName = name.trim().toLowerCase();
    const existing = await Category.findOne({ normalizedName });

    if (existing) {
      return res.status(400).json({ success: false, message: `Category '${name}' already exists` });
    }

    const category = await Category.create({
      name: name.trim(),
      normalizedName,
      description: description || ''
    });

    // Assign to category groups if specified
    if (Array.isArray(groupIds) && groupIds.length > 0) {
      await CategoryGroup.updateMany(
        { _id: { $in: groupIds } },
        {
          $addToSet: { categories: category._id, categoryNames: category.name }
        }
      );
    }

    res.status(201).json({
      success: true,
      message: 'Category created successfully',
      category
    });
  } catch (error) {
    console.error('[createCategory Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to create category', error: error.message });
  }
};

/**
 * @desc    Update category
 * @route   PUT /api/admin/categories/:id
 * @access  Private (Admin)
 */
export const updateCategory = async (req, res) => {
  try {
    const { name, description, status, groupIds } = req.body;
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    const oldName = category.name;

    if (name && name.trim()) {
      category.name = name.trim();
      category.normalizedName = name.trim().toLowerCase();
    }
    if (description !== undefined) category.description = description;
    if (status) category.status = status;

    await category.save();

    // If category name changed, update categoryNames in any group containing it
    if (oldName !== category.name) {
      await CategoryGroup.updateMany(
        { categories: category._id },
        {
          $pull: { categoryNames: oldName }
        }
      );
      await CategoryGroup.updateMany(
        { categories: category._id },
        {
          $addToSet: { categoryNames: category.name }
        }
      );
    }

    // If groupIds was explicitly passed
    if (Array.isArray(groupIds)) {
      // Remove from groups not in groupIds
      await CategoryGroup.updateMany(
        { _id: { $nin: groupIds }, categories: category._id },
        {
          $pull: { categories: category._id, categoryNames: category.name }
        }
      );

      // Add to selected groups
      await CategoryGroup.updateMany(
        { _id: { $in: groupIds } },
        {
          $addToSet: { categories: category._id, categoryNames: category.name }
        }
      );
    }

    res.status(200).json({
      success: true,
      message: 'Category updated successfully',
      category
    });
  } catch (error) {
    console.error('[updateCategory Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to update category', error: error.message });
  }
};

/**
 * @desc    Delete category
 * @route   DELETE /api/admin/categories/:id
 * @access  Private (Admin)
 */
export const deleteCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }

    // Delete any CategoryGroup that contains or references this category
    await CategoryGroup.deleteMany({
      $or: [
        { categories: category._id },
        { categoryNames: category.name }
      ]
    });

    // Also clean up any lingering groups with empty or missing categories
    await CategoryGroup.deleteMany({
      $or: [
        { categories: { $size: 0 } },
        { categories: { $exists: false } },
        { categories: null }
      ]
    });

    await Category.findByIdAndDelete(req.params.id);

    res.status(200).json({
      success: true,
      message: 'Category and associated category groups removed successfully'
    });
  } catch (error) {
    console.error('[deleteCategory Error]:', error);
    res.status(500).json({ success: false, message: 'Failed to delete category', error: error.message });
  }
};
