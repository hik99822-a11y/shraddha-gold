import React, { useState, useEffect } from 'react';
import {
  Layers,
  FolderPlus,
  Plus,
  Search,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  X,
  Tag,
  Boxes,
  ChevronRight,
  ArrowRight,
  Star,
  Users
} from 'lucide-react';
import { adminApi } from '../../../services/api';
import { formatDateIST } from '../../../utils/dateUtils';
import AdminConfirmModal from '../components/AdminConfirmModal';
import CustomSelect from '../../../components/common/CustomSelect.jsx';

const CategoriesManagement = () => {
  const [activeTab, setActiveTab] = useState('categories'); // 'categories' | 'groups'
  const [categories, setCategories] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');

  // Category Modal
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [isEditingCategory, setIsEditingCategory] = useState(false);
  const [currentCategoryId, setCurrentCategoryId] = useState(null);
  const [categoryForm, setCategoryForm] = useState({ name: '', status: 'Active', groupIds: [] });

  // Category Group Modal (Strictly Independent Entity!)
  const [groupModalOpen, setGroupModalOpen] = useState(false);
  const [isEditingGroup, setIsEditingGroup] = useState(false);
  const [currentGroupId, setCurrentGroupId] = useState(null);
  const [groupCatSearch, setGroupCatSearch] = useState('');
  const [groupForm, setGroupForm] = useState({
    name: '',
    categories: [],
    description: ''
  });

  // Custom Delete Confirmation Modal State
  const [confirmDelete, setConfirmDelete] = useState({
    open: false,
    type: '', // 'category' | 'group'
    id: null,
    name: '',
    isLoading: false
  });

  const filteredModalCategories = React.useMemo(() => {
    if (!groupCatSearch.trim()) return categories;
    const q = groupCatSearch.toLowerCase();
    return categories.filter((c) => c.name?.toLowerCase().includes(q));
  }, [categories, groupCatSearch]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const params = {};
      if (search) params.search = search;
      if (selectedGroupFilter && selectedGroupFilter !== 'all') params.group = selectedGroupFilter;

      const [catRes, grpRes] = await Promise.all([
        adminApi.getCategories(params),
        adminApi.getCategoryGroups()
      ]);
      if (catRes.success) setCategories(catRes.categories);
      if (grpRes.success) setGroups(grpRes.categoryGroups);
    } catch (err) {
      console.error('Failed to load category data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [search, selectedGroupFilter]);

  // Category Handlers
  const handleSaveCategory = async (e) => {
    e.preventDefault();
    try {
      if (isEditingCategory) {
        await adminApi.updateCategory(currentCategoryId, categoryForm);
      } else {
        await adminApi.createCategory(categoryForm);
      }
      setCategoryModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to save category');
    }
  };

  const requestDeleteCategory = (cat) => {
    setConfirmDelete({
      open: true,
      type: 'category',
      id: cat._id,
      name: cat.name,
      isLoading: false
    });
  };

  // Category Group Handlers (Verified: Does NOT mutate Category master data)
  const handleSaveGroup = async (e) => {
    e.preventDefault();
    try {
      if (isEditingGroup) {
        await adminApi.updateCategoryGroup(currentGroupId, groupForm);
      } else {
        await adminApi.createCategoryGroup(groupForm);
      }
      setGroupModalOpen(false);
      fetchData();
    } catch (err) {
      alert(err.message || 'Failed to save category group');
    }
  };

  const requestDeleteGroup = (group) => {
    setConfirmDelete({
      open: true,
      type: 'group',
      id: group._id,
      name: group.name,
      isLoading: false
    });
  };

  const handleConfirmDelete = async () => {
    if (!confirmDelete.id) return;
    try {
      setConfirmDelete((prev) => ({ ...prev, isLoading: true }));
      if (confirmDelete.type === 'category') {
        await adminApi.deleteCategory(confirmDelete.id);
      } else if (confirmDelete.type === 'group') {
        await adminApi.deleteCategoryGroup(confirmDelete.id);
      }
      setConfirmDelete({ open: false, type: '', id: null, name: '', isLoading: false });
      fetchData();
    } catch (err) {
      setConfirmDelete((prev) => ({ ...prev, isLoading: false }));
      alert(err.message || `Failed to delete ${confirmDelete.type}`);
    }
  };

  return (
    <div>
      {/* Top Action Bar */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', gap: '10px', alignItems: 'center' }}>
        {activeTab === 'categories' ? (
          <button
            onClick={() => {
              setIsEditingCategory(false);
              setCurrentCategoryId(null);
              setCategoryForm({ name: '', status: 'Active', groupIds: [] });
              setCategoryModalOpen(true);
            }}
            className="btn-brand"
          >
            <Plus size={16} />
            <span>New Category</span>
          </button>
        ) : (
          <button
            onClick={() => {
              setIsEditingGroup(false);
              setCurrentGroupId(null);
              setGroupForm({ name: '', categories: [], description: '' });
              setGroupCatSearch('');
              setGroupModalOpen(true);
            }}
            className="btn-brand"
          >
            <FolderPlus size={16} />
            <span>New Category Group</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="admin-tabs overflow-x-auto whitespace-nowrap">
        <button
          className={`admin-tab ${activeTab === 'categories' ? 'active' : ''}`}
          onClick={() => setActiveTab('categories')}
        >
          <div className="flex items-center gap-2">
            <Layers size={16} />
            <span>Categories ({categories.length})</span>
          </div>
        </button>
        <button
          className={`admin-tab ${activeTab === 'groups' ? 'active' : ''}`}
          onClick={() => setActiveTab('groups')}
        >
          <div className="flex items-center gap-2">
            <Boxes size={16} />
            <span>Category Groups ({groups.length})</span>
          </div>
        </button>
      </div>

      {/* TAB 1: Categories Master Table */}
      {activeTab === 'categories' && (
        <>
          <div className="admin-action-bar">
            <div className="admin-search-box flex-1 w-full max-w-none sm:max-w-md">
              <Search size={16} className="text-text-muted flex-shrink-0" />
              <input
                type="text"
                placeholder="Search categories..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            {groups.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-text-muted uppercase flex-shrink-0">
                  Category Group:
                </span>
                <CustomSelect
                  className="admin-select py-2 text-xs w-full sm:w-48"
                  value={selectedGroupFilter}
                  onChange={(val) => setSelectedGroupFilter(val)}
                  options={[
                    { value: 'all', label: `All Category Groups (${groups.length})` },
                    ...groups.map((g) => ({
                      value: g._id,
                      label: `${g.name} (${g.categories?.length || 0})`
                    }))
                  ]}
                />
              </div>
            )}
          </div>

          <div className="admin-card p-0 overflow-hidden">
            <div className="admin-table-wrapper border-0">
              <table className="admin-table min-w-[760px]">
                <thead>
                  <tr>
                    <th>Category Group</th>
                    <th>Category Name</th>
                    <th>Normalized Key</th>
                    <th>Total Active Styles</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-text-muted">
                        Loading categories...
                      </td>
                    </tr>
                  ) : categories.length > 0 ? (
                    categories.map((cat) => (
                      <tr key={cat._id}>
                        {/* 1st Column: Category Group (Plain text, strictly no background color) */}
                        <td>
                          {cat.groups && cat.groups.length > 0 ? (
                            <span
                              onClick={() => setActiveTab('groups')}
                              className="text-xs font-semibold text-brand-dark hover:underline"
                              style={{
                                background: 'none',
                                backgroundColor: 'transparent',
                                border: 'none',
                                padding: 0,
                                margin: 0,
                                cursor: 'pointer',
                                display: 'inline-block'
                              }}
                              title="Click to view in Category Groups tab"
                            >
                              {cat.groups.map((g) => g.name).join(', ')}
                            </span>
                          ) : (
                            <span className="text-xs text-text-muted italic">—</span>
                          )}
                        </td>

                        {/* 2nd Column: Category Name (No background color) */}
                        <td>
                          <div className="flex items-center gap-2">
                            <Tag size={14} className="text-brand-primary flex-shrink-0" />
                            <strong className="text-text-primary text-sm font-semibold">{cat.name}</strong>
                          </div>
                        </td>

                        {/* 3rd Column: Normalized Key (No background color) */}
                        <td>
                          <span className="text-xs font-mono text-text-muted">
                            {cat.normalizedName}
                          </span>
                        </td>
                        <td>
                          <span className="font-semibold text-text-primary">{cat.itemCount || 0}</span>
                          <span className="text-xs text-text-muted"> Styles</span>
                        </td>
                        <td>
                          <span
                            className={`badge-status ${
                              cat.status === 'Active' ? 'badge-active' : 'badge-inactive'
                            }`}
                          >
                            {cat.status}
                          </span>
                        </td>
                        <td className="text-xs text-text-muted">
                          {formatDateIST(cat.createdAt)}
                        </td>
                        <td className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setIsEditingCategory(true);
                                setCurrentCategoryId(cat._id);
                                setCategoryForm({
                                  name: cat.name,
                                  status: cat.status || 'Active',
                                  groupIds: cat.groups ? cat.groups.map((g) => g._id) : []
                                });
                                setCategoryModalOpen(true);
                              }}
                              className="p-1.5 hover:bg-light-brand rounded text-text-secondary hover:text-brand-dark"
                              title="Edit Category"
                            >
                              <Edit2 size={15} />
                            </button>
                            <button
                              onClick={() => requestDeleteCategory(cat)}
                              className="p-1.5 hover:bg-red-50 rounded text-text-muted hover:text-red-600"
                              title="Delete Category"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-center py-10 text-text-muted">
                        No categories found. Upload an Excel file or click "New Category" to create one.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* TAB 2: Category Groups (Strictly Independent Entity!) */}
      {activeTab === 'groups' && (
        <div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {groups.map((group) => (
              <div key={group._id} className="admin-card mb-0 flex flex-col justify-between">
                <div>
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-serif text-lg font-semibold text-text-primary">
                      {group.name}
                    </h3>
                    <div className="flex gap-1">
                      <button
                        onClick={() => {
                          setIsEditingGroup(true);
                          setCurrentGroupId(group._id);
                          const catIds = group.categories?.map((c) => (typeof c === 'object' ? c._id : c)) || [];
                          setGroupForm({
                            name: group.name,
                            categories: catIds,
                            description: group.description || ''
                          });
                          setGroupModalOpen(true);
                        }}
                        className="p-1 hover:bg-light-brand rounded text-text-muted hover:text-brand-dark"
                      >
                        <Edit2 size={15} />
                      </button>
                      <button
                        onClick={() => requestDeleteGroup(group)}
                        className="p-1 hover:bg-red-50 rounded text-text-muted hover:text-red-600"
                        title="Delete Group"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  <p className="text-xs text-text-muted mb-4">
                    {group.description || 'No description provided'}
                  </p>

                  <div className="text-xs font-semibold text-text-secondary mb-2">
                    Categories ({group.categories?.length || 0}):
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {group.categories && group.categories.length > 0 ? (
                      group.categories.map((c) => (
                        <span
                          key={c._id || c}
                          className="text-[11px] px-2 py-0.5 bg-brand-subtle text-brand-dark border border-border-subtle rounded-full font-medium"
                        >
                          {c.name || c}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-text-muted italic">No categories assigned</span>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-border-divider text-[11px] text-text-muted flex justify-between">
                  <span>Created: {formatDateIST(group.createdAt)}</span>
                </div>
              </div>
            ))}
          </div>

          {groups.length === 0 && (
            <div className="admin-card text-center py-12 text-text-muted">
              <Boxes size={40} className="mx-auto mb-2 opacity-40 text-brand-primary" />
              <p className="text-sm font-medium">No Category Groups created yet.</p>
              <p className="text-xs text-text-muted mt-1 max-w-sm mx-auto">
                Group multiple master categories together (e.g. "Wedding Suite", "Heritage 22K") for commercial presentation.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Category Create/Edit Modal */}
      {categoryModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setCategoryModalOpen(false)}>
          <div
            className="admin-modal-card max-w-md w-full mx-3 sm:mx-auto"
            style={{ maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header" style={{ flexShrink: 0 }}>
              <h3 className="admin-modal-title">
                {isEditingCategory ? 'Edit Master Category' : 'Create Master Category'}
              </h3>
              <button onClick={() => setCategoryModalOpen(false)} className="text-text-muted hover:text-text-primary">
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={handleSaveCategory}
              style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
            >
              <div
                className="admin-modal-body space-y-4"
                style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
              >
                <div className="admin-form-group">
                  <label>Category Name *</label>
                  <input
                    type="text"
                    required
                    className="admin-input"
                    placeholder="e.g. Gold Bangles & Kada"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  />
                </div>
                <div className="admin-form-group">
                  <label>Status</label>
                  <CustomSelect
                    className="admin-select"
                    value={categoryForm.status}
                    onChange={(val) => setCategoryForm({ ...categoryForm, status: val })}
                    options={[
                      { value: 'Active', label: 'Active' },
                      { value: 'Inactive', label: 'Inactive' }
                    ]}
                  />
                </div>

                {/* <div className="admin-form-group">
                  <div className="flex items-center justify-between mb-1">
                    <label style={{ margin: 0 }}>Category Group (Optional)</label>
                    <span className="text-xs text-text-muted">
                      {(categoryForm.groupIds || []).length} selected
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mb-2">
                    Assign this master category to one or more independent Category Groups.
                  </p>
                  {groups.length > 0 ? (
                    <div
                      className="admin-checkbox-list-container"
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))',
                        gap: '6px',
                        maxHeight: '130px',
                        overflowY: 'auto',
                        padding: '8px'
                      }}
                    >
                      {groups.map((grp) => {
                        const isChecked = (categoryForm.groupIds || []).includes(grp._id);
                        return (
                          <label key={grp._id} className="admin-checkbox-item" title={grp.name}>
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                const current = categoryForm.groupIds || [];
                                if (e.target.checked) {
                                  setCategoryForm({
                                    ...categoryForm,
                                    groupIds: [...current, grp._id]
                                  });
                                } else {
                                  setCategoryForm({
                                    ...categoryForm,
                                    groupIds: current.filter((id) => id !== grp._id)
                                  });
                                }
                              }}
                            />
                            <span className="truncate">{grp.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-text-muted italic bg-light-brand p-2 rounded border border-border-subtle">
                      No Category Groups created yet. Create one in the "Independent Category Groups" tab.
                    </p>
                  )}
                </div> */}
              </div>
              <div className="admin-modal-footer" style={{ flexShrink: 0 }}>
                <button type="button" onClick={() => setCategoryModalOpen(false)} className="btn-outline-brand text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn-brand text-xs">
                  Save Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Category Group Modal */}
      {groupModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setGroupModalOpen(false)}>
          <div
            className="admin-modal-card max-w-lg w-full mx-3 sm:mx-auto"
            style={{ maxHeight: 'calc(100vh - 40px)', display: 'flex', flexDirection: 'column' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="admin-modal-header" style={{ flexShrink: 0 }}>
              <h3 className="admin-modal-title">
                {isEditingGroup ? 'Edit Category Group' : 'Create Category Group'}
              </h3>
              <button onClick={() => setGroupModalOpen(false)} className="text-text-muted hover:text-text-primary">
                <X size={20} />
              </button>
            </div>
            <form
              onSubmit={handleSaveGroup}
              style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
            >
              <div
                className="admin-modal-body space-y-4"
                style={{ flex: 1, minHeight: 0, overflowY: 'auto', WebkitOverflowScrolling: 'touch' }}
              >
                <div className="admin-form-group">
                  <label>Group Name *</label>
                  <input
                    type="text"
                    required
                    className="admin-input"
                    placeholder="e.g. Heritage Wedding Suite 2026"
                    value={groupForm.name}
                    onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  />
                </div>

                <div className="admin-form-group">
                  <div className="flex items-center justify-between mb-1.5 flex-wrap gap-2">
                    <label style={{ margin: 0 }}>Select Categories (Multi-select)</label>
                    <span className="text-xs text-text-muted font-medium">
                      {groupForm.categories.length} of {categories.length} selected
                    </span>
                  </div>

                  {/* Search and Select All / Clear Controls */}
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="text"
                      className="admin-input text-xs py-1.5 px-2.5 flex-1"
                      placeholder="Filter categories..."
                      value={groupCatSearch}
                      onChange={(e) => setGroupCatSearch(e.target.value)}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const allIds = categories.map((c) => c._id);
                        setGroupForm({ ...groupForm, categories: allIds });
                      }}
                      className="text-xs font-semibold text-brand-dark hover:underline px-1.5 py-1 whitespace-nowrap"
                    >
                      Select All
                    </button>
                    <span className="text-border-subtle">•</span>
                    <button
                      type="button"
                      onClick={() => {
                        setGroupForm({ ...groupForm, categories: [] });
                      }}
                      className="text-xs font-semibold text-text-muted hover:text-text-primary px-1.5 py-1 whitespace-nowrap"
                    >
                      Clear
                    </button>
                  </div>

                  {/* Scrollable Checkbox Grid */}
                  <div
                    className="admin-checkbox-list-container"
                    style={{
                      display: 'grid',
                      gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))',
                      gap: '8px',
                      maxHeight: '220px',
                      overflowY: 'auto',
                      WebkitOverflowScrolling: 'touch',
                      padding: '10px'
                    }}
                  >
                    {filteredModalCategories.length > 0 ? (
                      filteredModalCategories.map((cat) => {
                        const isChecked = groupForm.categories.includes(cat._id);
                        return (
                          <label
                            key={cat._id}
                            className="admin-checkbox-item"
                            title={cat.name}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setGroupForm({
                                    ...groupForm,
                                    categories: [...groupForm.categories, cat._id]
                                  });
                                } else {
                                  setGroupForm({
                                    ...groupForm,
                                    categories: groupForm.categories.filter((id) => id !== cat._id)
                                  });
                                }
                              }}
                            />
                            <span className="truncate">{cat.name}</span>
                          </label>
                        );
                      })
                    ) : (
                      <div className="col-span-full py-4 text-center text-xs text-text-muted">
                        No categories match "{groupCatSearch}"
                      </div>
                    )}
                  </div>
                </div>

                <div className="admin-form-group">
                  <label>Description / Commercial Notes</label>
                  <textarea
                    rows={2}
                    className="admin-textarea"
                    placeholder="Purpose of this group for B2B client presentations..."
                    value={groupForm.description}
                    onChange={(e) => setGroupForm({ ...groupForm, description: e.target.value })}
                  />
                </div>
              </div>
              <div className="admin-modal-footer" style={{ flexShrink: 0 }}>
                <button type="button" onClick={() => setGroupModalOpen(false)} className="btn-outline-brand text-xs">
                  Cancel
                </button>
                <button type="submit" className="btn-brand text-xs">
                  Save Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      <AdminConfirmModal
        isOpen={confirmDelete.open}
        onClose={() => {
          if (!confirmDelete.isLoading) {
            setConfirmDelete({ open: false, type: '', id: null, name: '', isLoading: false });
          }
        }}
        onConfirm={handleConfirmDelete}
        isLoading={confirmDelete.isLoading}
        title={confirmDelete.type === 'category' ? 'Delete Master Category' : 'Delete Category Group'}
        subtitle={confirmDelete.type === 'category' ? 'Taxonomy & Catalogue' : 'Grouping'}
        description={
          confirmDelete.type === 'category'
            ? 'Are you sure you want to remove this category from the master catalogue architecture?'
            : 'Are you sure you want to delete this category group classification?'
        }
        itemName={confirmDelete.name}
        warning={
          confirmDelete.type === 'category'
            ? 'This will permanently remove the category from the catalogue. Associated style tags may be affected.'
            : 'Note: Master Categories will remain completely untouched and will not be altered or deleted.'
        }
        confirmText={confirmDelete.type === 'category' ? 'Delete Category' : 'Delete Group'}
        cancelText="Cancel"
      />
    </div>
  );
};

export default CategoriesManagement;
