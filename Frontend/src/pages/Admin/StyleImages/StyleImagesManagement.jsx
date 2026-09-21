import React, { useState, useEffect, useRef } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  Image,
  Upload,
  FolderUp,
  Folder,
  Search,
  Filter,
  FileDown,
  Trash2,
  Eye,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  X,
  Plus,
  Share2,
  FileSpreadsheet,
  Layers,
  ChevronRight,
  ExternalLink,
  Check,
  CheckSquare,
  Copy,
  MessageCircle,
  Clock,
  Calendar,
  LayoutGrid,
  Table as TableIcon,
  ChevronDown,
  ChevronUp,
  Sparkles,
  ImagePlus,
  Lock,
  SlidersHorizontal,
  Camera,
  FileText,
  Settings
} from 'lucide-react';
import { adminApi } from '../../../services/api';
import AdminConfirmModal from '../components/AdminConfirmModal';
import '../AdminCommon.css';
import { formatKtLabel, extractUniqueKtsFromStyles, getStylePurity, extractKtFromItem, getPendingKtsForStyle, hasPhotosForKt, isKtPendingForStyle } from '../../../utils/ktUtils.js';
import CustomSelect from '../../../components/common/CustomSelect.jsx';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

// Helper methods to calculate filled image counts
const getImagesForKt = (style, kt) => {
  if (!style || !style.images) return [];
  const normalizedKt = extractKtFromItem(kt);
  const exactMatches = style.images[kt] || [];
  const normalizedMatches = normalizedKt && normalizedKt !== kt ? (style.images[normalizedKt] || []) : [];
  
  const map = new Map();
  normalizedMatches.forEach(img => map.set(img.slot, img));
  exactMatches.forEach(img => map.set(img.slot, img));
  return Array.from(map.values());
};

const getKtImageCount = (style, kt) => {
  return getImagesForKt(style, kt).filter((img) => img && img.url).length;
};

const getTotalImagesCount = (style, availableKts = []) => {
  const list = availableKts.length > 0 ? availableKts : Object.keys(style?.images || {});
  return list.reduce((acc, k) => acc + getKtImageCount(style, k), 0);
};

const StyleImagesManagement = () => {
  const [searchParams] = useSearchParams();
  const [styles, setStyles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoryGroups, setCategoryGroups] = useState([]);
  const [selectedCategoryGroup, setSelectedCategoryGroup] = useState('all');
  const [selectedCategory, setSelectedCategory] = useState(searchParams.get('category') || 'all');
  const [selectedKt, setSelectedKt] = useState('all');
  const [availableKts, setAvailableKts] = useState([]);
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });
  
  const [currentTab, setCurrentTab] = useState('all');

  // Sync with searchParams if navigated with new query
  useEffect(() => {
    const cat = searchParams.get('category');
    const q = searchParams.get('search');
    if (cat !== null && cat !== selectedCategory) setSelectedCategory(cat);
    if (q !== null && q !== search) setSearch(q);
  }, [searchParams]);

  // Preview Lightbox
  const [previewImage, setPreviewImage] = useState(null);

  // Delete Confirmation Modal State
  const [deleteConfirmModalOpen, setDeleteConfirmModalOpen] = useState(false);
  const [slotToDelete, setSlotToDelete] = useState(null); // { styleId, kt, slot }

  // Direct Single Slot Uploading State (keyed by `${styleId}_${kt}_${slot}`)
  const [uploadingSlotKey, setUploadingSlotKey] = useState(null);

  // Bulk Folder Import State (Architecture for 100,000+ files)
  const [bulkStats, setBulkStats] = useState({
    totalFound: 0,
    processed: 0,
    matched: 0,
    unmatched: 0,
    failed: 0,
    isImporting: false,
    completed: false,
    showBanner: false
  });

  // Local Desktop/server Sync State
  const [syncingServer, setSyncingServer] = useState(false);
  const [syncToast, setSyncToast] = useState(null);

  // Unmatched Images Report Modal
  const [unmatchedModalOpen, setUnmatchedModalOpen] = useState(false);
  const [unmatchedList, setUnmatchedList] = useState([]);
  const [unmatchedLoading, setUnmatchedLoading] = useState(false);

  // PDF Generation State (Multi-Category Scope with Independent Category & Group KT management)
  const [pdfModalOpen, setPdfModalOpen] = useState(false);
  const [pdfSelectionMode, setPdfSelectionMode] = useState('groups'); // 'groups' | 'categories'
  const [pdfSelectedGroupIds, setPdfSelectedGroupIds] = useState([]);
  const [pdfSelectedCategoryIds, setPdfSelectedCategoryIds] = useState([]);
  const [pdfSelectedGroup, setPdfSelectedGroup] = useState('all');
  const [pdfCategoryKtMap, setPdfCategoryKtMap] = useState({});
  const [pdfGroupKtMap, setPdfGroupKtMap] = useState({});
  const [pdfCategorySearch, setPdfCategorySearch] = useState('');
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfJobResult, setPdfJobResult] = useState(null);
  const [pdfQuality, setPdfQuality] = useState('original');

  // Remote Server Config State
  const [configModalOpen, setConfigModalOpen] = useState(false);
  const [configDesktopUrl, setConfigDesktopUrl] = useState('');
  const [configSaving, setConfigSaving] = useState(false);

  // Reliable cross-origin blob download helper
  const downloadFileFromUrl = async (url, fileName) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || 'Shraddha_Gold_Catalog.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      console.error('Blob download failed, fallback to link:', err);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'Shraddha_Gold_Catalog.pdf';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // Category Share Link Modal State (Unified with Category Group & Category selection structure)
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [shareSelectionMode, setShareSelectionMode] = useState('groups'); // 'groups' | 'categories'
  const [shareSelectedGroupIds, setShareSelectedGroupIds] = useState([]); // default unselected
  const [shareSelectedCategoryIds, setShareSelectedCategoryIds] = useState([]); // default unselected
  const [shareSelectedGroup, setShareSelectedGroup] = useState('all');
  const [shareCategoryKtMap, setShareCategoryKtMap] = useState({}); // default unselected
  const [shareGroupKtMap, setShareGroupKtMap] = useState({}); // default unselected
  const [shareModalLink, setShareModalLink] = useState('');
  const [shareModalLoading, setShareModalLoading] = useState(false);
  const [shareModalCopied, setShareModalCopied] = useState(false);
  const [shareModalCategorySearch, setShareModalCategorySearch] = useState('');
  const [existingShareLinks, setExistingShareLinks] = useState([]);
  const [loadingShareLinks, setLoadingShareLinks] = useState(false);

  // Default Master Link (All Categories) State
  const [defaultShareLink, setDefaultShareLink] = useState(null);
  const [copiedDefaultLink, setCopiedDefaultLink] = useState(false);

  const fetchCategoryShareLinks = async () => {
    try {
      setLoadingShareLinks(true);
      const res = await adminApi.getCategoryShareLinks();
      if (res.success) {
        setExistingShareLinks(res.links || []);
        if (res.defaultLink) {
          setDefaultShareLink(res.defaultLink);
        }
      }
    } catch (err) {
      console.error('Failed to load category share links:', err);
    } finally {
      setLoadingShareLinks(false);
    }
  };

  const handleCopyDefaultLink = async () => {
    let link = defaultShareLink;
    if (!link?.url) {
      try {
        const res = await adminApi.getDefaultMasterShareLink();
        if (res.success && res.defaultLink) {
          setDefaultShareLink(res.defaultLink);
          link = res.defaultLink;
        }
      } catch (err) {
        console.error('Failed to get default master share link:', err);
      }
    }
    if (!link?.url) return;
    try {
      await navigator.clipboard.writeText(link.url);
      setCopiedDefaultLink(true);
      setTimeout(() => setCopiedDefaultLink(false), 2500);
    } catch (err) {
      const input = document.createElement('input');
      input.value = link.url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setCopiedDefaultLink(true);
      setTimeout(() => setCopiedDefaultLink(false), 2500);
    }
  };

  const fetchStyles = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: 15
      };
      if (search) params.search = search;
      if (selectedCategory && selectedCategory !== 'all') params.category = selectedCategory;
      if (selectedCategoryGroup && selectedCategoryGroup !== 'all') params.categoryGroup = selectedCategoryGroup;
      if (selectedKt && selectedKt !== 'all') params.kt = selectedKt;
      if (currentTab === 'new') params.filter = 'new';

      const res = await adminApi.getStyleImages(params);
      if (res.success) {
        setStyles(res.styles);
        setPagination(res.pagination);
        if (Array.isArray(res.availableKts) && res.availableKts.length > 0) {
          setAvailableKts(res.availableKts);
        } else if (res.styles?.length > 0) {
          setAvailableKts(extractUniqueKtsFromStyles(res.styles));
        }
      }
    } catch (err) {
      console.error('Failed to load styles:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const [catRes, grpRes] = await Promise.all([
        adminApi.getCategories(),
        adminApi.getCategoryGroups({ status: 'Active' })
      ]);
      if (catRes?.success) setCategories(catRes.categories || []);
      if (grpRes?.success) setCategoryGroups(grpRes.groups || grpRes.categoryGroups || []);
    } catch (err) {
      console.error('Failed to load categories/groups:', err);
    }
  };

  useEffect(() => {
    fetchStyles();
  }, [selectedCategory, selectedCategoryGroup, selectedKt, search, pagination.page, currentTab]);

  useEffect(() => {
    fetchCategories();
    fetchCategoryShareLinks();
    adminApi.getDetectedKts()
      .then((res) => {
        if (res?.success && Array.isArray(res.kts) && res.kts.length > 0) {
          setAvailableKts(res.kts);
        }
      })
      .catch((err) => console.warn('Could not fetch detected KTs:', err.message));
  }, []);

  // ==========================================
  // Remote Server Config Handlers
  // ==========================================
  const fetchSystemConfig = async () => {
    try {
      const res = await adminApi.getSystemConfig();
      if (res.success && res.config) {
        setConfigDesktopUrl(res.config.DESKTOP_SERVER_URL || '');
      }
    } catch (err) {
      console.error('Failed to load system config:', err);
    }
  };

  const handleOpenConfigModal = () => {
    setConfigModalOpen(true);
    fetchSystemConfig();
  };

  const handleSaveConfig = async () => {
    try {
      setConfigSaving(true);
      const res = await adminApi.updateSystemConfig('DESKTOP_SERVER_URL', configDesktopUrl);
      if (res.success) {
        setSyncToast({
          type: 'success',
          message: 'Remote Server URL saved successfully!'
        });
        setConfigModalOpen(false);
      }
    } catch (err) {
      console.error('Failed to save config:', err);
      alert(err.message || 'Failed to save config');
    } finally {
      setConfigSaving(false);
      setTimeout(() => setSyncToast(null), 3000);
    }
  };

  // Direct Slot Upload Handler (Manual upload applies ONLY to the selected KT)
  const handleDirectSlotUpload = async (styleId, kt, slot, file) => {
    if (!file) return;

    // Validate image format
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, WEBP).');
      return;
    }

    // Validate size (15MB)
    if (file.size > 15 * 1024 * 1024) {
      alert('Image size exceeds maximum limit of 15MB.');
      return;
    }

    const slotKey = `${styleId}_${kt}_${slot}`;
    try {
      setUploadingSlotKey(slotKey);
      const formData = new FormData();
      formData.append('image', file);
      formData.append('kt', kt);
      formData.append('slot', slot);
      formData.append('applyToAllKt', 'false'); // Manual upload is specific to this KT

      const res = await adminApi.uploadSlotImage(styleId, formData);
      if (res.success) {
        fetchStyles();
      }
    } catch (err) {
      console.error('Failed to upload slot image:', err);
      alert(err.message || 'Failed to upload image');
    } finally {
      setUploadingSlotKey(null);
    }
  };

  // Direct 1-Click Copy Slot to All KTs
  const handleCopySlotToAllKt = async (styleId, kt, slot) => {
    const slotKey = `${styleId}_${kt}_${slot}`;
    try {
      setUploadingSlotKey(slotKey);
      const res = await adminApi.copySlotToAllKt(styleId, { sourceKt: kt, slot });
      if (res.success) {
        fetchStyles();
      }
    } catch (err) {
      console.error('Failed to copy slot to all KTs:', err);
      alert(err.message || 'Failed to copy image to all KTs');
    } finally {
      setUploadingSlotKey(null);
    }
  };

  // Delete image from a specific slot (Slot 1 is protected from deletion)
  const handleDeleteSlot = async (styleId, kt, slot) => {
    if (slot === 1) {
      alert('Slot 1 is protected and cannot be deleted. You can use Replace to change the image.');
      return;
    }
    setSlotToDelete({ styleId, kt, slot });
    setDeleteConfirmModalOpen(true);
  };

  const confirmDeleteSlot = async () => {
    if (!slotToDelete) return;
    const { styleId, kt, slot } = slotToDelete;
    const slotKey = `${styleId}_${kt}_${slot}`;
    try {
      setDeleteConfirmModalOpen(false);
      setUploadingSlotKey(slotKey);

      // Optimistic UI state update: clear the slot immediately so user gets instant visual feedback
      setStyles((prevStyles) =>
        prevStyles.map((s) => {
          if (s._id !== styleId) return s;
          const updatedImages = { ...s.images };
          if (updatedImages[kt]) {
            updatedImages[kt] = updatedImages[kt].filter((img) => Number(img.slot) !== Number(slot));
          }
          return { ...s, images: updatedImages };
        })
      );

      await adminApi.deleteSlotImage(styleId, kt, slot, false);
      await fetchStyles();
    } catch (err) {
      console.error('Failed to delete slot image:', err);
      alert(err.message || 'Failed to delete slot image');
      await fetchStyles(); // Rollback on error
    } finally {
      setUploadingSlotKey(null);
      setSlotToDelete(null);
    }
  };

  // 100,000+ Bulk Image Import with Client-Side Chunking
  const handleFolderSelect = async (e) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) return;

    const filesArray = Array.from(fileList);
    setBulkStats({
      totalFound: filesArray.length,
      processed: 0,
      matched: 0,
      unmatched: 0,
      failed: 0,
      isImporting: true,
      completed: false,
      showBanner: true
    });

    const CHUNK_SIZE = 30; // Stream in batches of 30 files to preserve browser & network memory
    const batchId = `import_${Date.now()}`;

    let totalProcessed = 0;
    let totalMatched = 0;
    let totalUnmatched = 0;
    let totalFailed = 0;

    for (let i = 0; i < filesArray.length; i += CHUNK_SIZE) {
      const chunk = filesArray.slice(i, i + CHUNK_SIZE);
      const formData = new FormData();
      formData.append('batchId', batchId);

      chunk.forEach((file) => {
        formData.append('files', file);
        formData.append('relativePaths', file.webkitRelativePath || file.name);
      });

      try {
        const res = await adminApi.uploadBulkChunk(formData);
        if (res.success) {
          totalProcessed += res.processed;
          totalMatched += res.matchedCount;
          totalUnmatched += res.unmatchedCount;
          totalFailed += res.failedCount;

          setBulkStats((prev) => ({
            ...prev,
            processed: totalProcessed,
            matched: totalMatched,
            unmatched: totalUnmatched,
            failed: totalFailed
          }));
        }
      } catch (err) {
        console.error('Error processing bulk chunk:', err);
        totalFailed += chunk.length;
        setBulkStats((prev) => ({
          ...prev,
          processed: prev.processed + chunk.length,
          failed: totalFailed
        }));
      }
    }

    setBulkStats((prev) => ({ ...prev, isImporting: false, completed: true }));
    fetchStyles();
  };

  // Direct 1-Click Sync from Local Desktop/server Folder (Auto-scans all subfolders and sets Slot 1 stylecode-wise)
  const handleSyncDesktopServer = async () => {
    try {
      setSyncingServer(true);
      const res = await adminApi.syncDesktopServerFolder();
      if (res.success) {
        setSyncToast({
          type: 'success',
          message: `✨ Desktop/server Synced! ${res.totalScanned} files scanned across all subfolders ➔ ${res.matchedCount} styles matched and updated!`
        });
        fetchStyles();
      } else {
        setSyncToast({
          type: 'error',
          message: res.message || 'Sync failed'
        });
      }
    } catch (err) {
      console.error('Desktop server sync failed:', err);
      setSyncToast({
        type: 'error',
        message: err.message || 'Failed to sync Desktop/server folder'
      });
    } finally {
      setSyncingServer(false);
      setTimeout(() => setSyncToast(null), 6000);
    }
  };

  // Unmatched Images Viewer
  const openUnmatchedModal = async () => {
    setUnmatchedModalOpen(true);
    setUnmatchedLoading(true);
    try {
      const res = await adminApi.getUnmatchedImages();
      if (res.success) {
        setUnmatchedList(res.unmatched);
      }
    } catch (err) {
      console.error('Failed to load unmatched images:', err);
    } finally {
      setUnmatchedLoading(false);
    }
  };

  // Multi-Category & Category Group PDF Generation Handlers
  const handleOpenPdfModal = async (initialCatName = null) => {
    setPdfCategorySearch('');
    setPdfJobResult(null);
    setPdfModalOpen(true);

    const targetCat = initialCatName || (selectedCategory !== 'all' ? selectedCategory : null);

    // By default, ALL Category, Category Group, and KT options remain UNSELECTED
    if (targetCat) {
      setPdfSelectionMode('categories');
      if (categories.length > 0) {
        const found = categories.find((c) => c.name === targetCat);
        setPdfSelectedCategoryIds(found ? [found._id] : []);
      }
    } else {
      setPdfSelectionMode('groups');
      setPdfSelectedGroupIds([]);
      setPdfSelectedCategoryIds([]);
    }
    setPdfCategoryKtMap({});
    setPdfGroupKtMap({});

    try {
      const [catRes, grpRes] = await Promise.all([
        adminApi.getCategories(),
        adminApi.getCategoryGroups({ status: 'Active' })
      ]);
      if (catRes?.success && Array.isArray(catRes.categories)) {
        setCategories(catRes.categories);
        if (targetCat) {
          const found = catRes.categories.find((c) => c.name === targetCat);
          setPdfSelectedCategoryIds(found ? [found._id] : []);
        }
      }
      if (grpRes?.success) {
        const grps = grpRes.groups || grpRes.categoryGroups || [];
        setCategoryGroups(grps);
      }
    } catch (err) {
      console.error('Failed to load categories/groups for PDF modal:', err);
    }
  };

  const DEFAULT_CAT_KTS = [];

  const getCategoryKts = (catId) => {
    return pdfCategoryKtMap[catId] || [];
  };

  const getGroupKts = (groupId) => {
    return pdfGroupKtMap[String(groupId)] || [];
  };

  const getCategoriesForGroup = (groupId) => {
    if (groupId === 'all') return categories;
    const grp = categoryGroups.find((g) => String(g._id) === String(groupId));
    if (!grp) return [];
    return categories.filter((c) => {
      const matchId = (grp.categories || []).some((gc) =>
        typeof gc === 'object' ? String(gc._id) === String(c._id) : String(gc) === String(c._id)
      );
      const matchName = (grp.categoryNames || []).includes(c.name);
      return matchId || matchName;
    });
  };

  const handleToggleCategoryKt = (catId, kt, e) => {
    if (e) e.stopPropagation();
    setPdfCategoryKtMap((prev) => {
      const current = prev[catId] || [];
      let next;
      if (kt === 'All') {
        next = current.length === availableKts.length ? [] : [...availableKts];
      } else {
        next = current.includes(kt) ? current.filter((k) => k !== kt) : [...current, kt];
      }
      return { ...prev, [catId]: next };
    });
  };

  const handleToggleGroupKtDirect = (groupId, kt, e) => {
    if (e) e.stopPropagation();
    const gId = String(groupId);
    setPdfGroupKtMap((prev) => {
      const current = prev[gId] || [];
      let next;
      if (kt === 'All') {
        next = current.length === availableKts.length ? [] : [...availableKts];
      } else {
        next = current.includes(kt) ? current.filter((k) => k !== kt) : [...current, kt];
      }
      return { ...prev, [gId]: next };
    });
  };

  const handleToggleGroupSelection = (groupId) => {
    const gId = String(groupId);
    setPdfSelectedGroupIds((prev) =>
      prev.includes(gId) ? prev.filter((id) => id !== gId) : [...prev, gId]
    );
  };

  const handleSelectAllGroups = () => {
    setPdfSelectedGroupIds(categoryGroups.map((g) => String(g._id)));
  };

  const handleClearAllGroups = () => {
    setPdfSelectedGroupIds([]);
  };

  const getSelectedCategoriesCountInGroups = () => {
    const catIdSet = new Set();
    categoryGroups
      .filter((g) => pdfSelectedGroupIds.includes(String(g._id)))
      .forEach((g) => {
        getCategoriesForGroup(g._id).forEach((c) => catIdSet.add(c._id));
      });
    return catIdSet.size;
  };

  const handleToggleCategory = (catId) => {
    setPdfSelectedCategoryIds((prev) =>
      prev.includes(catId) ? prev.filter((id) => id !== catId) : [...prev, catId]
    );
  };

  const handleSelectAllCategories = () => {
    const allIds = categories.map((c) => c._id);
    setPdfSelectedCategoryIds(allIds);
  };

  const handleClearAllCategories = () => {
    setPdfSelectedCategoryIds([]);
  };

  const filteredCategories = categories.filter((cat) => {
    const matches = (cat.name || '').toLowerCase().includes(pdfCategorySearch.toLowerCase().trim());
    if (!matches) return false;
    if (pdfSelectedGroup === 'all') return true;
    const grp = categoryGroups.find((g) => String(g._id) === String(pdfSelectedGroup));
    if (!grp) return true;
    return (
      (grp.categories || []).some((gc) => (typeof gc === 'object' ? gc._id === cat._id : gc === cat._id)) ||
      (grp.categoryNames || []).includes(cat.name)
    );
  });

  const handleGeneratePdf = async () => {
    if (pdfSelectionMode === 'groups' && pdfSelectedGroupIds.length === 0) {
      alert('Please select at least one category group to generate the catalog PDF.');
      return;
    }
    if (pdfSelectionMode === 'categories' && pdfSelectedCategoryIds.length === 0) {
      alert('Please select at least one category to generate the catalog PDF.');
      return;
    }

    try {
      setPdfLoading(true);
      let isAll = false;
      let targetCategoryIds = [];
      let targetCategoryNames = [];
      let targetCategoryGroups = [];
      let targetTitleName = 'All';
      const categoryKtsPayload = {};
      const allDistinctKts = new Set();

      if (pdfSelectionMode === 'groups') {
        isAll = pdfSelectedGroupIds.length === categoryGroups.length;
        targetCategoryGroups = pdfSelectedGroupIds;
        const selectedGroupDocs = categoryGroups.filter((g) => pdfSelectedGroupIds.includes(String(g._id)));
        targetTitleName = isAll ? 'All' : selectedGroupDocs.map((g) => g.name).join(', ');

        const catIdSet = new Set();
        selectedGroupDocs.forEach((grp) => {
          const grpKts = getGroupKts(grp._id);
          grpKts.forEach((k) => allDistinctKts.add(k));

          const catsInGrp = getCategoriesForGroup(grp._id);
          catsInGrp.forEach((cat) => {
            catIdSet.add(cat._id);
            if (!targetCategoryNames.includes(cat.name)) {
              targetCategoryNames.push(cat.name);
            }
            categoryKtsPayload[cat._id] = grpKts;
            categoryKtsPayload[cat.name] = grpKts;
          });
        });
        targetCategoryIds = Array.from(catIdSet);
      } else {
        isAll = pdfSelectedCategoryIds.length === categories.length && pdfSelectedGroup === 'all';
        targetCategoryIds = pdfSelectedCategoryIds;
        const selectedCatDocs = categories.filter((c) => pdfSelectedCategoryIds.includes(c._id));
        targetCategoryNames = selectedCatDocs.map((c) => c.name);
        targetTitleName = isAll ? 'All' : (targetCategoryNames.length > 0 ? targetCategoryNames.join(', ') : 'Selected');

        selectedCatDocs.forEach((c) => {
          const kts = getCategoryKts(c._id);
          categoryKtsPayload[c._id] = kts;
          categoryKtsPayload[c.name] = kts;
          kts.forEach((k) => allDistinctKts.add(k));
        });
      }

      const selectedKtsList = Array.from(allDistinctKts);
      if (selectedKtsList.length === 0) {
        alert(`Please select at least one KT purity (${availableKts.map(formatKtLabel).join(', ')}) for your selected items.`);
        setPdfLoading(false);
        return;
      }

      const res = await adminApi.generateCatalogPdf({
        type: isAll ? 'AllCategories' : 'Category',
        categoryIds: isAll ? [] : targetCategoryIds,
        categories: isAll ? [] : targetCategoryNames,
        categoryName: targetTitleName,
        categoryGroups: targetCategoryGroups,
        categoryKts: categoryKtsPayload,
        allowedKts: Array.from(allDistinctKts),
        quality: pdfQuality
      });

      if (res.success && res.job) {
        setPdfJobResult(res.job);
        // Automatically trigger browser download of the PDF!
        await downloadFileFromUrl(`${API_BASE}${res.job.fileUrl}`, res.job.fileName);
      }
    } catch (err) {
      console.error('Failed to generate catalog PDF:', err);
      alert(err.message || 'Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  // ==========================================
  // Generate & Manage Links Handlers
  // ==========================================
  const getShareCategoryKts = (catId) => {
    return shareCategoryKtMap[catId] || [];
  };

  const getShareGroupKts = (groupId) => {
    return shareGroupKtMap[String(groupId)] || [];
  };

  const getShareSelectedCategoriesCountInGroups = () => {
    const catIdSet = new Set();
    categoryGroups
      .filter((g) => shareSelectedGroupIds.includes(String(g._id)))
      .forEach((g) => {
        getCategoriesForGroup(g._id).forEach((c) => catIdSet.add(c._id));
      });
    return catIdSet.size;
  };

  const generateLinkForCurrentShare = async (
    mode = shareSelectionMode,
    groupIds = shareSelectedGroupIds,
    catIds = shareSelectedCategoryIds,
    grpKtMap = shareGroupKtMap,
    catKtMap = shareCategoryKtMap
  ) => {
    let targetCatNames = [];
    let targetCatIds = [];
    let targetGroupIds = [];
    let targetGroupNames = [];
    const allDistinctKts = new Set();

    if (mode === 'groups') {
      if (groupIds.length === 0) {
        setShareModalLink('');
        return;
      }
      targetGroupIds = groupIds;
      const selectedGroups = categoryGroups.filter((g) => groupIds.includes(String(g._id)));
      targetGroupNames = selectedGroups.map((g) => g.name);

      const catIdSet = new Set();
      selectedGroups.forEach((grp) => {
        const grpKts = grpKtMap[String(grp._id)] || [];
        grpKts.forEach((k) => allDistinctKts.add(k));

        const catsInGrp = getCategoriesForGroup(grp._id);
        catsInGrp.forEach((cat) => {
          catIdSet.add(cat._id);
          if (!targetCatNames.includes(cat.name)) {
            targetCatNames.push(cat.name);
          }
        });
      });
      targetCatIds = Array.from(catIdSet);
    } else {
      if (catIds.length === 0) {
        setShareModalLink('');
        return;
      }
      targetCatIds = catIds;
      const selectedDocs = categories.filter((c) => catIds.includes(c._id));
      targetCatNames = selectedDocs.map((c) => c.name);

      selectedDocs.forEach((c) => {
        const kts = catKtMap[c._id] || [];
        kts.forEach((k) => allDistinctKts.add(k));
      });
    }

    const distinctKtsList = Array.from(allDistinctKts);

    try {
      setShareModalLoading(true);
      const res = await adminApi.createCategoryShareLink({
        title:
          targetCatNames.length > 0
            ? (targetCatNames.length <= 2 ? `${targetCatNames.join(' & ')} Collection` : `${targetCatNames.length} Categories Collection`)
            : (targetGroupNames.length > 0 ? `${targetGroupNames.join(' & ')} Collection` : 'Jewellery Collection'),
        categoryNames: targetCatNames,
        categoryIds: targetCatIds,
        categoryGroups: targetGroupIds,
        categoryGroupNames: targetGroupNames,
        kts: distinctKtsList.length > 0 ? distinctKtsList : availableKts,
        scope: 'Category',
        accessType: 'Without Login',
        durationDays: 0
      });

      if (res.success && res.shareLink) {
        setShareModalLink(res.shareLink.url);
      }
    } catch (err) {
      console.error('Failed to generate category share link:', err);
    } finally {
      setShareModalLoading(false);
    }
  };

  const handleOpenShareModal = async (initialCatName = null) => {
    setShareModalOpen(true);
    setShareModalCopied(false);
    setShareModalCategorySearch('');

    const targetCat = initialCatName || (selectedCategory !== 'all' ? selectedCategory : null);

    // By default, all Category, Category Group, and KT options remain UNSELECTED
    if (targetCat) {
      setShareSelectionMode('categories');
      const found = categories.find((c) => c.name === targetCat || c._id === targetCat);
      if (found) {
        setShareSelectedCategoryIds([found._id]);
        setShareCategoryKtMap({});
        generateLinkForCurrentShare('categories', [], [found._id], {}, {});
      } else {
        setShareSelectedCategoryIds([]);
        setShareModalLink('');
      }
    } else {
      setShareSelectionMode('groups');
      setShareSelectedGroupIds([]);
      setShareSelectedCategoryIds([]);
      setShareGroupKtMap({});
      setShareCategoryKtMap({});
      setShareModalLink('');
    }
  };

  const handleToggleShareCategoryKt = (catId, kt, e) => {
    if (e) e.stopPropagation();
    setShareCategoryKtMap((prev) => {
      const current = prev[catId] || [];
      let next;
      if (kt === 'All') {
        next = current.length === availableKts.length ? [] : [...availableKts];
      } else {
        next = current.includes(kt) ? current.filter((k) => k !== kt) : [...current, kt];
      }
      const updated = { ...prev, [catId]: next };
      generateLinkForCurrentShare(shareSelectionMode, shareSelectedGroupIds, shareSelectedCategoryIds, shareGroupKtMap, updated);
      return updated;
    });
  };

  const handleToggleShareGroupKtDirect = (groupId, kt, e) => {
    if (e) e.stopPropagation();
    const gId = String(groupId);
    setShareGroupKtMap((prev) => {
      const current = prev[gId] || [];
      let next;
      if (kt === 'All') {
        next = current.length === availableKts.length ? [] : [...availableKts];
      } else {
        next = current.includes(kt) ? current.filter((k) => k !== kt) : [...current, kt];
      }
      const updated = { ...prev, [gId]: next };
      generateLinkForCurrentShare(shareSelectionMode, shareSelectedGroupIds, shareSelectedCategoryIds, updated, shareCategoryKtMap);
      return updated;
    });
  };

  const handleToggleShareGroupSelection = (groupId) => {
    const gId = String(groupId);
    const nextGroupIds = shareSelectedGroupIds.includes(gId)
      ? shareSelectedGroupIds.filter((id) => id !== gId)
      : [...shareSelectedGroupIds, gId];
    setShareSelectedGroupIds(nextGroupIds);
    generateLinkForCurrentShare(shareSelectionMode, nextGroupIds, shareSelectedCategoryIds, shareGroupKtMap, shareCategoryKtMap);
  };

  const handleToggleShareCategorySelection = (catId) => {
    const nextCatIds = shareSelectedCategoryIds.includes(catId)
      ? shareSelectedCategoryIds.filter((id) => id !== catId)
      : [...shareSelectedCategoryIds, catId];
    setShareSelectedCategoryIds(nextCatIds);
    generateLinkForCurrentShare(shareSelectionMode, shareSelectedGroupIds, nextCatIds, shareGroupKtMap, shareCategoryKtMap);
  };

  const handleSelectAllShareGroups = () => {
    const allIds = categoryGroups.map((g) => String(g._id));
    setShareSelectedGroupIds(allIds);
    generateLinkForCurrentShare(shareSelectionMode, allIds, shareSelectedCategoryIds, shareGroupKtMap, shareCategoryKtMap);
  };

  const handleClearAllShareGroups = () => {
    setShareSelectedGroupIds([]);
    setShareModalLink('');
  };

  const handleSelectAllShareCategories = () => {
    const allIds = categories.map((c) => c._id);
    setShareSelectedCategoryIds(allIds);
    generateLinkForCurrentShare(shareSelectionMode, shareSelectedGroupIds, allIds, shareGroupKtMap, shareCategoryKtMap);
  };

  const handleClearAllShareCategories = () => {
    setShareSelectedCategoryIds([]);
    setShareModalLink('');
  };

  const filteredShareCategories = categories.filter((cat) => {
    const matches = (cat.name || '').toLowerCase().includes(shareModalCategorySearch.toLowerCase().trim());
    if (!matches) return false;
    if (shareSelectedGroup === 'all') return true;
    const grp = categoryGroups.find((g) => String(g._id) === String(shareSelectedGroup));
    if (!grp) return true;
    return (
      (grp.categories || []).some((gc) => (typeof gc === 'object' ? gc._id === cat._id : gc === cat._id)) ||
      (grp.categoryNames || []).includes(cat.name)
    );
  });

  const handleCopyShareLink = async (url) => {
    if (!url) return;
    try {
      await navigator.clipboard.writeText(url);
      setShareModalCopied(true);
      setTimeout(() => setShareModalCopied(false), 2500);
    } catch (err) {
      const input = document.createElement('input');
      input.value = url;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      setShareModalCopied(true);
      setTimeout(() => setShareModalCopied(false), 2500);
    }
  };

  const handleShareOnWhatsApp = (linkOrUrl) => {
    const url = typeof linkOrUrl === 'object' && linkOrUrl !== null ? linkOrUrl.url : linkOrUrl;
    if (!url) return;
    const selectedDocs = categories.filter((c) => shareSelectedCategoryIds.includes(c._id));
    const titleText =
      selectedDocs.length === 0 || selectedDocs.length === categories.length
        ? 'Fine Jewellery Master Collection'
        : `${selectedDocs.map((c) => c.name).join(' & ')} Collection`;
    const message = `✨ *SHRADDHA GOLD INDIA PVT. LTD.*\nFine Jewellery Manufacturer & B2B Casting House\n\nExclusive Portfolio: *${titleText}*\nView Catalog: ${url}\n\nExplore our latest BIS hallmarked designs and place your B2B orders online.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  // Helper to render 4 image slots for a specific KT with crisp proper borders and hover overlay
  const renderKtSlots = (style, kt) => {
    const slots = [1, 2, 3, 4];
    const imageMap = new Map(getImagesForKt(style, kt).map((img) => [img.slot, img]));

    return (
      <div className="style-slots-grid">
        {slots.map((slotNum) => {
          const img = imageMap.get(slotNum);
          const fullImgUrl = img?.url ? `${API_BASE}${img.url}` : null;
          const slotKey = `${style._id}_${kt}_${slotNum}`;
          const isUploading = uploadingSlotKey === slotKey;

          if (isUploading) {
            return (
              <div
                key={slotNum}
                className="style-slot-box style-slot-uploading"
                title={`${kt} Slot ${slotNum} uploading...`}
              >
                <RefreshCw className="animate-spin text-brand-primary" size={16} />
                <span className="style-slot-empty-label" style={{ color: 'var(--brand-dark)' }}>
                  Saving...
                </span>
              </div>
            );
          }

          if (img) {
            return (
              <div
                key={slotNum}
                className={`style-slot-box style-slot-filled ${slotNum === 1 ? 'style-slot-master' : ''}`}
                title={`${kt} Slot ${slotNum} ${slotNum === 1 ? '(Master Image)' : ''}`}
              >
                {/* Scaled Image */}
                <img
                  src={fullImgUrl}
                  alt={`${style.styleCode} ${kt} Slot ${slotNum}`}
                  className="style-slot-img"
                  loading="lazy"
                  onClick={() => setPreviewImage({ url: fullImgUrl, title: `${style.styleCode} • ${kt} Slot ${slotNum}` })}
                />

                {/* Slot Number Badge */}
                <span className={`style-slot-badge ${slotNum === 1 ? 'style-slot-badge-master' : ''}`}>
                  {slotNum === 1 ? 'S1' : `S${slotNum}`}
                </span>

                {/* {(img.isRealImage || img.source === 'manual_upload') && (
                  <span
                    className="absolute bottom-1 left-1 z-10 style-real-photo-badge !text-[8px] !py-0.5 !px-1.5 leading-none shadow-sm"
                    title="Protected Real Photo (CAD desktop sync will not overwrite)"
                  >
                    <Camera size={8} strokeWidth={2.5} />
                    <span>Real</span>
                  </span>
                )} */}

                {/* Hover Actions Overlay: strictly visible on hover via CSS .style-slot-box:hover .style-slot-overlay */}
                <div className="style-slot-overlay">
                  {/* Eye preview button */}
                  <button
                    type="button"
                    onClick={() => setPreviewImage({ url: fullImgUrl, title: `${style.styleCode} • ${kt} Slot ${slotNum}` })}
                    className="style-slot-btn"
                    title="Preview Full Image"
                  >
                    <Eye size={14} />
                  </button>

                  {/* Replace image button */}
                  <label
                    className="style-slot-btn"
                    title={`Replace Image (${kt} Slot ${slotNum})`}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: 'none' }}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleDirectSlotUpload(style._id, kt, slotNum, file);
                        e.target.value = '';
                      }}
                    />
                    <RefreshCw size={14} />
                  </label>

                  {/* Slot 1 Delete Option is Intentionally Excluded */}
                  {slotNum !== 1 && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSlot(style._id, kt, slotNum);
                      }}
                      className="style-slot-btn style-slot-btn-delete"
                      title={`Delete Image from ${kt} Slot ${slotNum}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
            );
          }

          // Empty Slot: Crisp 1:1 dashed box with proper border
          return (
            <label
              key={slotNum}
              className={`style-slot-box style-slot-empty ${slotNum === 1 ? 'style-slot-empty-master' : ''}`}
              title={`Click to manually upload image for ${kt} Slot ${slotNum}`}
            >
              <input
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleDirectSlotUpload(style._id, kt, slotNum, file);
                  e.target.value = '';
                }}
              />
              <Plus size={18} className="style-slot-empty-icon" />
              <span className="style-slot-empty-label">Slot {slotNum}</span>
              <span className="style-slot-empty-sub">+ Upload</span>
            </label>
          );
        })}
      </div>
    );
  };

  // Dynamic columns for the matrix table:
  // In 'New Stylecodes' tab, only show columns for KTs that actually have pending uploads among the styles currently displayed.
  // Whichever KTs are already uploaded across all displayed styles are omitted from the table columns.
  const allKnownKts = availableKts.length > 0 ? availableKts : ['G18 ROSE', 'G18KT YELLOW', 'G22KT'];
  const pendingKtsInView = allKnownKts.filter((kt) =>
    styles.some((s) => isKtPendingForStyle(s, kt))
  );
  const displayedKts = (currentTab === 'new' && styles.length > 0 && pendingKtsInView.length > 0)
    ? pendingKtsInView
    : allKnownKts;

  return (
    <div>

      {/* Top Action Bar */}
      <div style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', justifyContent: 'flex-start', gap: '8px', flexWrap: 'wrap' }}>
        <button onClick={() => handleOpenPdfModal()} className="catalog-btn-primary py-2 px-3 text-[12px] shadow-sm h-[38px]" title="Generate & Download Catalog PDF">
          <FileText size={14} />
          <span>Catalog PDF</span>
        </button>
        <button onClick={() => handleOpenShareModal()} className="btn-outline-brand" title="Generate & Manage Category Share Links">
          <Share2 size={14} />
          <span>Manage Links</span>
        </button>
        <button
          type="button"
          onClick={handleCopyDefaultLink}
          className="btn-outline-brand"
          title="Quick copy default catalog link for All Categories"
        >
          {copiedDefaultLink ? <Check size={14} className="text-emerald-700" /> : <Copy size={14} />}
          <span>{copiedDefaultLink ? 'Copied!' : 'Copy Master Link'}</span>
        </button>
        <button
          type="button"
          onClick={handleOpenConfigModal}
          className="btn-outline-brand"
          title="Configure Cloudflare Tunnel URL for Remote Image Server"
        >
          <Settings size={14} />
          <span>Remote Server Config</span>
        </button>
        <button
          type="button"
          onClick={handleSyncDesktopServer}
          disabled={syncingServer}
          className="btn-brand"
          title="Automatically scan all files & subfolders in Desktop/server and link style images directly without manual uploading"
        >
          <RefreshCw size={14} className={syncingServer ? 'animate-spin' : ''} />
          <span>{syncingServer ? 'Syncing...' : 'Sync Desktop/Server'}</span>
        </button>
      </div>

      {/* Local Server Sync Feedback Toast Banner */}
      {syncToast && (
        <div
          className={`p-3 rounded-lg mb-6 text-xs flex items-center justify-between border shadow-sm transition-all ${
            syncToast.type === 'success'
              ? 'bg-emerald-50 text-emerald-900 border-emerald-300'
              : 'bg-red-50 text-red-900 border-red-300'
          }`}
        >
          <div className="flex items-center gap-2">
            {syncToast.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-700 flex-shrink-0" />
            ) : (
              <AlertTriangle size={16} className="text-red-700 flex-shrink-0" />
            )}
            <span className="font-semibold">{syncToast.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setSyncToast(null)}
            className="p-1 hover:opacity-75 text-text-muted hover:text-text-primary ml-2"
            title="Dismiss"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Real-Time Bulk Folder Import Progress Banner (Inline, No Modal) */}
      {bulkStats.showBanner && (
        <div className="admin-card mb-6 p-4 border border-border-brand bg-light-brand/70">
          <div className="flex items-center justify-between pb-2.5 border-b border-border-subtle mb-3">
            <div className="flex items-center gap-2">
              {bulkStats.isImporting ? (
                <RefreshCw size={16} className="text-brand-dark animate-spin" />
              ) : (
                <CheckCircle2 size={16} className="text-emerald-700" />
              )}
              <h4 className="text-xs font-bold text-text-primary">
                {bulkStats.isImporting
                  ? 'Streaming Bulk Images In Memory-Optimized Chunks...'
                  : 'Bulk Folder Import Completed'}
              </h4>
            </div>
            {!bulkStats.isImporting && (
              <button
                type="button"
                onClick={() => setBulkStats((prev) => ({ ...prev, showBanner: false }))}
                className="text-text-muted hover:text-text-primary p-1 rounded transition-colors"
                title="Dismiss"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <div className="space-y-3">
            <div className="flex justify-between text-xs font-semibold text-text-secondary">
              <span>Processing Progress:</span>
              <span>
                {bulkStats.processed} / {bulkStats.totalFound} (
                {bulkStats.totalFound > 0
                  ? Math.round((bulkStats.processed / bulkStats.totalFound) * 100)
                  : 0}
                %)
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-border-subtle h-2.5 rounded-full overflow-hidden">
              <div
                className="bg-brand-primary h-full transition-all duration-300"
                style={{
                  width: `${
                    bulkStats.totalFound > 0
                      ? Math.round((bulkStats.processed / bulkStats.totalFound) * 100)
                      : 0
                  }%`
                }}
              />
            </div>

            {/* Metric Counters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-center text-xs">
              <div className="p-2 bg-white rounded border border-border-brand">
                <div className="text-text-muted text-[10px]">Found</div>
                <div className="font-semibold text-text-primary">{bulkStats.totalFound}</div>
              </div>
              <div className="p-2 bg-emerald-50 text-emerald-800 rounded border border-emerald-200">
                <div className="text-[10px]">Matched</div>
                <div className="font-semibold">{bulkStats.matched}</div>
              </div>
              <div className="p-2 bg-amber-50 text-amber-800 rounded border border-amber-200">
                <div className="text-[10px]">Unmatched</div>
                <div className="font-semibold">{bulkStats.unmatched}</div>
              </div>
              <div className="p-2 bg-red-50 text-red-800 rounded border border-red-200">
                <div className="text-[10px]">Failed</div>
                <div className="font-semibold">{bulkStats.failed}</div>
              </div>
            </div>

            {bulkStats.completed && (
              <div className="p-2.5 bg-emerald-50 text-emerald-800 rounded border border-emerald-200 text-xs flex items-center justify-between mt-2">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={16} className="text-emerald-700 flex-shrink-0" />
                  <span>Bulk import finished successfully! Matched slots have been updated.</span>
                </div>
                <button
                  type="button"
                  onClick={() => setBulkStats((prev) => ({ ...prev, showBanner: false }))}
                  className="text-emerald-800 hover:text-emerald-950 font-semibold underline text-[11px] ml-2"
                >
                  Dismiss
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="admin-action-bar">
        <div className="admin-search-box flex-1 w-full max-w-none sm:max-w-md">
          <Search size={16} className="text-text-muted flex-shrink-0" />
          <input
            type="text"
            placeholder="Search by StyleCode (e.g. RNG-1001)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex items-center justify-between sm:justify-start gap-2 w-full sm:w-auto flex-wrap">

          {/* Category Filter */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <span className="text-xs font-semibold text-text-muted uppercase">Category:</span>
            <CustomSelect
              className="admin-select py-1.5 text-xs w-44 h-[38px] bg-white font-medium"
              value={selectedCategory}
              onChange={(val) => setSelectedCategory(val)}
              options={[
                { value: 'all', label: 'All Categories' },
                ...(selectedCategoryGroup === 'all'
                  ? categories
                  : categories.filter((c) => {
                      const grp = categoryGroups.find((g) => String(g._id) === String(selectedCategoryGroup));
                      if (!grp) return true;
                      return (
                        (grp.categories || []).some((gc) => (typeof gc === 'object' ? gc._id === c._id : gc === c._id)) ||
                        (grp.categoryNames || []).includes(c.name)
                      );
                    })
                ).map((c) => ({
                  value: c.name,
                  label: c.name
                }))
              ]}
              style={{ padding: '0 10px' }}
            />
          </div>

          {selectedCategory !== 'all' && (
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => handleOpenPdfModal(selectedCategory)}
                className="btn-outline-brand text-xs h-[38px] px-3 flex items-center gap-1.5"
                title={`Generate PDF for ${selectedCategory}`}
              >
                <FileDown size={13} />
                <span>PDF</span>
              </button>
              <button
                type="button"
                onClick={() => handleOpenShareModal(selectedCategory)}
                className="btn-outline-brand text-xs h-[38px] px-3 flex items-center gap-1.5"
                title={`Generate Share Link for ${selectedCategory}`}
              >
                <Share2 size={13} />
                <span>Link</span>
              </button>
            </div>
          )}

          </div>
      </div>

      {/* Tabs */}
      <div className="admin-tabs overflow-x-auto whitespace-nowrap mb-4">
        <button
          className={`admin-tab ${currentTab === 'all' ? 'active' : ''}`}
          onClick={() => {
            setPagination((prev) => ({ ...prev, page: 1 }));
            setCurrentTab('all');
          }}
        >
          <div className="flex items-center gap-2">
            <span>All Stylecodes</span>
          </div>
        </button>
        <button
          className={`admin-tab ${currentTab === 'new' ? 'active' : ''}`}
          onClick={() => {
            setPagination((prev) => ({ ...prev, page: 1 }));
            setCurrentTab('new');
          }}
        >
          <div className="flex items-center gap-2">
            <span>New Stylecodes</span>
            <span className="bg-stone-200 text-stone-600 text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wider">Pending</span>
          </div>
        </button>
      </div>

      {/* Direct Multi-Purity Slots Studio Table */}
      
        <div className="admin-card p-0 overflow-hidden shadow-sm">
          <div className="admin-table-wrapper border-0">
            <table className="admin-table min-w-[1550px]">
              <thead>
                <tr>
                  <th className="text-left" style={{ width: '180px', minWidth: '180px' }}>Style & Stock</th>
                  <th className="text-left" style={{ width: '160px', minWidth: '160px' }}>Category</th>
                  {displayedKts.map((kt) => (
                    <th key={kt} className="text-left" style={{ minWidth: '385px' }}>
                      <div className="flex items-center gap-1.5 font-bold text-stone-800">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-600 inline-block" />
                        <span>{formatKtLabel(kt)}</span>
                        <span className="text-[11px] font-normal text-text-muted">(4 Slots)</span>
                      </div>
                    </th>
                  ))}
                  <th className="text-center" style={{ width: '100px', minWidth: '100px' }}>Completion</th>
                </tr>
              </thead>
              <tbody>
                {loading && styles.length === 0 ? (
                  <tr>
                    <td colSpan={3 + (displayedKts.length || 1)} className="text-center py-14 text-text-muted">
                      Loading style image slots...
                    </td>
                  </tr>
                ) : styles.length > 0 ? (
                  styles.map((style) => {
                    const totalImages = getTotalImagesCount(style, availableKts);

                    return (
                      <tr key={style._id} className="hover:bg-stone-50/50 transition-colors border-b border-border-divider">
                        {/* Col 1: Style Code & Metadata */}
                        <td className="align-middle py-3.5 px-3">
                          <div className="style-meta-wrapper">
                            <div className="style-meta-title-row">
                              <div className="flex items-center gap-1.5">
                                <span className="style-meta-dot" />
                                <strong className="style-meta-code" title={style.displayCode || style.styleCode}>
                                  {style.displayCode || style.styleCode}
                                </strong>
                                {totalImages === 0 && (
                                  <span className="ml-1 bg-amber-100 text-amber-800 text-[9px] font-bold px-1.5 py-0.5 rounded-sm uppercase tracking-wider flex items-center gap-1 shrink-0">
                                    <Sparkles size={10} /> New
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Col 2: Category */}
                        <td className="style-category-cell py-3.5 px-3">
                          <Link
                            to={`/admin/categories?search=${encodeURIComponent(style.categoryName)}`}
                            className="style-category-badge"
                            title="View Category Master"
                          >
                            {style.categoryName}
                          </Link>
                        </td>

                        {/* Dynamic KT Slots */}
                        {displayedKts.map((kt) => {
                          const isPending = currentTab !== 'new' || isKtPendingForStyle(style, kt);
                          return (
                            <td key={kt} className="align-middle py-3.5 px-3">
                              {isPending ? (
                                renderKtSlots(style, kt)
                              ) : (
                                <div className="flex items-center gap-1.5 text-xs text-stone-400 font-medium px-3 py-2 bg-stone-50 rounded-lg border border-stone-200/60 w-fit">
                                  <Check size={14} className="text-emerald-500 stroke-[2.5]" />
                                  <span>Uploaded</span>
                                </div>
                              )}
                            </td>
                          );
                        })}

                        {/* Completion Status */}
                        <td className="align-middle py-3.5 px-3 text-center">
                          <div className="style-completion-wrapper">
                            <span className="style-completion-count">
                              {totalImages}/{(availableKts.length || 1) * 4}
                            </span>
                            <span className="style-completion-label">Slots</span>
                            <div className="style-completion-bar-bg">
                              <div
                                className="style-completion-bar-fill"
                                style={{ width: `${Math.min(100, Math.round((totalImages / ((availableKts.length || 1) * 4)) * 100))}%` }}
                              />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={3 + (displayedKts.length || 1)} className="text-center py-14 text-text-muted">
                      No styles found. Upload Excel stock first to populate StyleCodes.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      


      {/* Responsive Compact Pagination */}
      <div className="admin-pagination-bar mt-4">
        <span className="text-xs text-text-muted">
          Showing {pagination.total > 0 ? (pagination.page - 1) * 15 + 1 : 0} - {Math.min(pagination.page * 15, pagination.total)} of {pagination.total} styles
        </span>
        <div className="flex items-center gap-2">
          <button
            disabled={pagination.page <= 1}
            onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
            className="admin-pagination-btn"
          >
            ← Previous
          </button>
          <span className="text-xs font-semibold text-text-primary px-2">
            {pagination.page} / {pagination.pages || 1}
          </span>
          <button
            disabled={pagination.page >= pagination.pages}
            onClick={() => setPagination({ ...pagination, page: pagination.page + 1 })}
            className="admin-pagination-btn"
          >
            Next →
          </button>
        </div>
      </div>

      {/* Lightbox Modal */}
      {previewImage && (
        <div className="admin-modal-backdrop" onClick={() => setPreviewImage(null)}>
          <div className="max-w-xl max-h-[85vh] p-2 bg-white rounded-lg shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 bg-black/60 text-white rounded-full p-1.5 hover:bg-black"
            >
              <X size={18} />
            </button>
            <img src={previewImage.url} alt={previewImage.title} className="max-h-[75vh] w-auto mx-auto rounded object-contain" />
            <div className="text-center text-xs font-semibold text-text-primary pt-3 pb-1">
              {previewImage.title}
            </div>
          </div>
        </div>
      )}

      {/* Unmatched Images Report Modal */}
      {unmatchedModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setUnmatchedModalOpen(false)}>
          <div className="admin-modal-card max-w-3xl w-full mx-3 sm:mx-auto" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <div>
                <h3 className="admin-modal-title">Unmatched Images Report</h3>
                <p className="text-xs text-text-muted">
                  Images that could not be mapped to an existing StyleCode during import
                </p>
              </div>
              <button onClick={() => setUnmatchedModalOpen(false)} className="text-text-muted hover:text-text-primary">
                <X size={20} />
              </button>
            </div>

            <div className="admin-modal-body p-0">
              <div className="admin-table-wrapper border-0 max-h-96 overflow-y-auto">
                <table className="admin-table min-w-[560px]">
                  <thead>
                    <tr>
                      <th>Filename</th>
                      <th>Relative Folder Path</th>
                      <th>Extracted Candidate</th>
                      <th>Reason</th>
                    </tr>
                  </thead>
                  <tbody>
                    {unmatchedLoading ? (
                      <tr>
                        <td colSpan={4} className="text-center py-10 text-text-muted">
                          Loading unmatched logs...
                        </td>
                      </tr>
                    ) : unmatchedList.length > 0 ? (
                      unmatchedList.map((item) => (
                        <tr key={item._id}>
                          <td className="text-xs font-mono text-text-primary font-medium">
                            {item.originalFileName}
                          </td>
                          <td className="text-xs text-text-muted max-w-xs truncate" title={item.folderPath}>
                            {item.folderPath || 'Root Folder'}
                          </td>
                          <td className="text-xs font-mono text-amber-700">
                            {item.styleCode || 'N/A'}
                          </td>
                          <td className="text-xs text-red-600">
                            {item.errorReason}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className="text-center py-10 text-text-muted">
                          No unmatched images on record. 100% of imported files were successfully assigned.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="admin-modal-footer">
              <button onClick={() => setUnmatchedModalOpen(false)} className="btn-brand text-xs">
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Catalog Modal - Luxury Executive 2-Column Studio */}
      {pdfModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setPdfModalOpen(false)}>
          <div className="catalog-modal-card mx-3 sm:mx-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="catalog-modal-header">
              <div className="flex items-center gap-4">
                <div className="catalog-modal-header-icon">
                  <FileText size={20} strokeWidth={2.5} />
                </div>
                <div>
                  <h3 className="catalog-modal-title">Style Catalogue Studio</h3>
                  <p className="catalog-modal-subtitle">B2B High-Precision PDF Catalogue Generator • BIS Hallmarked Collections</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPdfModalOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-stone-100 transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body: 2-Column Grid */}
            <div className="catalog-modal-body">
              <div className="catalog-studio-grid">
                {/* LEFT COLUMN: Categories & Scope */}
                <div className="flex flex-col gap-4">
                  {/* Mode Selector Tabs */}
                  <div className="catalog-mode-tabs">
                    <button
                      type="button"
                      onClick={() => setPdfSelectionMode('groups')}
                      className={`catalog-mode-tab ${pdfSelectionMode === 'groups' ? 'active' : ''}`}
                    >
                      <Folder size={15} />
                      <span>Category Groups</span>
                      <span className="catalog-mode-badge">{categoryGroups.length}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setPdfSelectionMode('categories')}
                      className={`catalog-mode-tab ${pdfSelectionMode === 'categories' ? 'active' : ''}`}
                    >
                      <Layers size={15} />
                      <span>Individual Categories</span>
                      <span className="catalog-mode-badge">{categories.length}</span>
                    </button>
                  </div>

                  {/* MODE 1: Category Groups Section (Individual Categories are NOT shown) */}
                  {pdfSelectionMode === 'groups' ? (
                    <div className="catalog-cat-section">
                      <div className="catalog-section-header">
                        <div className="catalog-section-title">
                          <span>Select Category Groups</span>
                          <span className="catalog-count-badge">
                            {pdfSelectedGroupIds.length === categoryGroups.length
                              ? `All Groups (${categoryGroups.length})`
                              : `${pdfSelectedGroupIds.length} of ${categoryGroups.length} Selected`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleSelectAllGroups}
                            className="btn-sub-action text-[11px] py-1 px-2.5"
                            title="Select all category groups"
                          >
                            Select All
                          </button>
                          {pdfSelectedGroupIds.length > 0 && (
                            <button
                              type="button"
                              onClick={handleClearAllGroups}
                              className="text-[11px] text-text-muted hover:text-red-500 font-semibold px-2 py-1 transition-colors"
                              title="Clear group selection"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Category Groups Cards Grid */}
                      <div className="catalog-group-grid">
                        {categoryGroups.length > 0 ? (
                          categoryGroups.map((grp) => {
                            const isGroupChecked = pdfSelectedGroupIds.includes(String(grp._id));
                            const catsInGroup = getCategoriesForGroup(grp._id);
                            const activeKts = getGroupKts(grp._id);

                            return (
                              <div
                                key={grp._id}
                                onClick={() => handleToggleGroupSelection(grp._id)}
                                className={`catalog-group-card ${isGroupChecked ? 'selected' : ''}`}
                              >
                                <div className="catalog-group-card-top">
                                  <div className="catalog-group-card-left">
                                    <span className="catalog-cat-checkbox">
                                      {isGroupChecked && <Check size={12} strokeWidth={3} />}
                                    </span>
                                    <span className="catalog-group-card-name">{grp.name}</span>
                                    <span className="catalog-group-count-tag">
                                      {catsInGroup.length} {catsInGroup.length === 1 ? 'Category' : 'Categories'}
                                    </span>
                                  </div>
                                </div>

                                {/* Available KT options directly for the selected Category Group */}
                                {isGroupChecked && (
                                  <div
                                    className="catalog-group-card-bottom"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <div className="flex items-center gap-2 w-full justify-between">
                                      <span className="text-[11px] font-semibold text-text-secondary flex items-center gap-1.5">
                                        <Sparkles size={12} className="text-amber-600" />
                                        Purity Standards:
                                      </span>
                                      <div className="catalog-item-kt-pills">
                                        {['All', ...availableKts].map((kt) => {
                                          const isAllKt = kt === 'All';
                                          const hasKt = isAllKt ? activeKts.length === availableKts.length : activeKts.includes(kt);
                                          return (
                                            <button
                                              type="button"
                                              key={kt}
                                              onClick={(e) => handleToggleGroupKtDirect(grp._id, kt, e)}
                                              className={`catalog-item-kt-chip ${hasKt ? 'active' : 'inactive'}`}
                                              title={isAllKt ? 'Toggle All Purities' : `Toggle ${formatKtLabel(kt)} for ${grp.name}`}
                                            >
                                              {formatKtLabel(kt)}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-8 text-xs text-text-muted">
                            No category groups found. Please configure groups or switch to Individual Categories tab.
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    /* MODE 2: Individual Categories Section */
                    <div className="catalog-cat-section">
                      <div className="catalog-section-header">
                        <div className="catalog-section-title">
                          <span>Select Categories</span>
                          <span className="catalog-count-badge">
                            {pdfSelectedCategoryIds.length === categories.length
                              ? `All Categories (${categories.length})`
                              : `${pdfSelectedCategoryIds.length} of ${categories.length} Selected`}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={handleSelectAllCategories}
                            className="btn-sub-action text-[11px] py-1 px-2.5"
                            title="Select all categories"
                          >
                            Select All
                          </button>
                          {pdfSelectedCategoryIds.length > 0 && (
                            <button
                              type="button"
                              onClick={handleClearAllCategories}
                              className="text-[11px] text-text-muted hover:text-red-500 font-semibold px-2 py-1 transition-colors"
                              title="Clear category selection"
                            >
                              Clear
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Category Group Filter Tabs */}
                      {categoryGroups.length > 0 && (
                        <div className="catalog-group-pills no-scrollbar mb-2">
                          <button
                            type="button"
                            onClick={() => setPdfSelectedGroup('all')}
                            className={`catalog-group-pill ${
                              pdfSelectedGroup === 'all' ? 'active' : 'inactive'
                            }`}
                          >
                            All Groups
                          </button>
                          {categoryGroups.map((grp) => (
                            <button
                              type="button"
                              key={grp._id}
                              onClick={() => setPdfSelectedGroup(String(grp._id))}
                              className={`catalog-group-pill ${
                                pdfSelectedGroup === String(grp._id) ? 'active' : 'inactive'
                              }`}
                            >
                              {grp.name}
                            </button>
                          ))}
                        </div>
                      )}

                      {/* Search & Category Items */}
                      <div className="catalog-cat-box">
                        {categories.length > 6 && (
                          <div className="catalog-search-bar">
                            <Search size={14} className="text-text-muted flex-shrink-0" />
                            <input
                              type="text"
                              value={pdfCategorySearch}
                              onChange={(e) => setPdfCategorySearch(e.target.value)}
                              placeholder="Search categories (e.g. Kada, Ring, Chain)..."
                              className="catalog-search-input"
                            />
                            {pdfCategorySearch && (
                              <button
                                type="button"
                                onClick={() => setPdfCategorySearch('')}
                                className="text-text-muted hover:text-text-primary p-0.5"
                                title="Clear search"
                              >
                                <X size={14} />
                              </button>
                            )}
                          </div>
                        )}

                        <div className="catalog-cat-grid">
                          {filteredCategories.length > 0 ? (
                            filteredCategories.map((cat) => {
                              const isChecked = pdfSelectedCategoryIds.includes(cat._id);
                              const activeKts = getCategoryKts(cat._id);
                              return (
                                <div
                                  key={cat._id}
                                  onClick={() => handleToggleCategory(cat._id)}
                                  className={`catalog-cat-card ${isChecked ? 'selected' : ''}`}
                                  title={cat.name}
                                >
                                  <div className="flex items-center gap-2.5 min-w-0 w-full">
                                    <span className="catalog-cat-checkbox">
                                      {isChecked && <Check size={12} strokeWidth={3} />}
                                    </span>
                                    <span className="catalog-cat-name">{cat.name}</span>
                                  </div>

                                  {/* Individual Category KT Options */}
                                  {isChecked && (
                                    <div
                                      className="catalog-item-kt-pills"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      {['All', ...availableKts].map((kt) => {
                                        const isAllKt = kt === 'All';
                                        const hasKt = isAllKt ? activeKts.length === availableKts.length : activeKts.includes(kt);
                                        return (
                                          <button
                                            type="button"
                                            key={kt}
                                            onClick={(e) => handleToggleCategoryKt(cat._id, kt, e)}
                                            className={`catalog-item-kt-chip ${hasKt ? 'active' : 'inactive'}`}
                                            title={isAllKt ? 'Toggle All Purities' : `Toggle ${formatKtLabel(kt)} for ${cat.name}`}
                                          >
                                            {formatKtLabel(kt)}
                                          </button>
                                        );
                                      })}
                                    </div>
                                  )}
                                </div>
                              );
                            })
                          ) : (
                            <div className="text-center py-10 text-xs text-text-muted col-span-full bg-stone-50 rounded-lg border border-dashed border-stone-200">
                              No categories found matching "{pdfCategorySearch}"
                              {pdfCategorySearch && (
                                <div className="mt-2">
                                  <button
                                    type="button"
                                    onClick={() => setPdfCategorySearch('')}
                                    className="text-brand-dark hover:underline font-semibold"
                                  >
                                    Reset Search
                                  </button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* RIGHT COLUMN: Quality & Resolution Settings */}
                <div className="catalog-quality-panel">
                  <div className="catalog-section-header mb-1">
                    <div className="catalog-section-title">
                      <SlidersHorizontal size={15} />
                      <span>Export Quality Profile</span>
                    </div>
                  </div>

                  <div className="catalog-quality-stack">
                    {/* 1. Original / Full Quality */}
                    <div
                      onClick={() => setPdfQuality('original')}
                      className={`catalog-opt-card ${pdfQuality === 'original' ? 'selected' : ''}`}
                    >
                      <div className="catalog-opt-header">
                        <div className="catalog-opt-left">
                          <div className="pdf-radio-ring">
                            <div className="pdf-radio-dot" />
                          </div>
                          <span className="catalog-opt-title">Original / Full Quality</span>
                        </div>
                      </div>
                    </div>

                    {/* 2. Print Quality (600 DPI) */}
                    <div
                      onClick={() => setPdfQuality('print')}
                      className={`catalog-opt-card ${pdfQuality === 'print' ? 'selected' : ''}`}
                    >
                      <div className="catalog-opt-header">
                        <div className="catalog-opt-left">
                          <div className="pdf-radio-ring">
                            <div className="pdf-radio-dot" />
                          </div>
                          <span className="catalog-opt-title">Print Quality (600 DPI)</span>
                        </div>
                      </div>
                    </div>

                    {/* 3. High (300 DPI) */}
                    <div
                      onClick={() => setPdfQuality('high')}
                      className={`catalog-opt-card ${pdfQuality === 'high' ? 'selected' : ''}`}
                    >
                      <div className="catalog-opt-header">
                        <div className="catalog-opt-left">
                          <div className="pdf-radio-ring">
                            <div className="pdf-radio-dot" />
                          </div>
                          <span className="catalog-opt-title">High Quality (300 DPI)</span>
                        </div>
                      </div>
                    </div>

                    {/* 4. Medium (150 DPI) */}
                    <div
                      onClick={() => setPdfQuality('medium')}
                      className={`catalog-opt-card ${pdfQuality === 'medium' ? 'selected' : ''}`}
                    >
                      <div className="catalog-opt-header">
                        <div className="catalog-opt-left">
                          <div className="pdf-radio-ring">
                            <div className="pdf-radio-dot" />
                          </div>
                          <span className="catalog-opt-title">Medium Quality (150 DPI)</span>
                        </div>
                      </div>
                    </div>

                    {/* 5. Low (72 DPI) */}
                    <div
                      onClick={() => setPdfQuality('low')}
                      className={`catalog-opt-card ${pdfQuality === 'low' ? 'selected' : ''}`}
                    >
                      <div className="catalog-opt-header">
                        <div className="catalog-opt-left">
                          <div className="pdf-radio-ring">
                            <div className="pdf-radio-dot" />
                          </div>
                          <span className="catalog-opt-title">Low Quality (72 DPI)</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="catalog-modal-footer">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setPdfModalOpen(false)}
                  className="btn-outline-brand py-2 px-5 font-bold"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    pdfLoading ||
                    (pdfSelectionMode === 'groups'
                      ? pdfSelectedGroupIds.length === 0
                      : pdfSelectedCategoryIds.length === 0)
                  }
                  onClick={handleGeneratePdf}
                  className="catalog-btn-primary"
                >
                  {pdfLoading ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" />
                      <span>
                        Rendering ({
                          pdfQuality === 'original' ? 'Lossless' :
                          pdfQuality === 'print' ? '600 DPI' :
                          pdfQuality === 'high' ? '300 DPI' :
                          pdfQuality === 'medium' ? '150 DPI' : '72 DPI'
                        })...
                      </span>
                    </>
                  ) : (
                    <>
                      <FileDown size={16} />
                      <span>
                        Generate &amp; Download PDF (
                        {pdfSelectionMode === 'groups'
                          ? (pdfSelectedGroupIds.length === 0
                              ? '0 Selected'
                              : (pdfSelectedGroupIds.length === categoryGroups.length
                                  ? `All Groups • ${getSelectedCategoriesCountInGroups()} Cats`
                                  : `${pdfSelectedGroupIds.length} Groups • ${getSelectedCategoriesCountInGroups()} Cats`))
                          : (pdfSelectedCategoryIds.length === 0
                              ? '0 Selected'
                              : (pdfSelectedCategoryIds.length === categories.length
                                  ? 'All Categories'
                                  : `${pdfSelectedCategoryIds.length} Categories`))}
                        )
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Share Links Modal - Unified Structure Matching Catalog Studio */}
      {shareModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setShareModalOpen(false)}>
          <div className="catalog-modal-card max-w-2xl w-full mx-3 sm:mx-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="catalog-modal-header pb-3 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Share2 size={20} className="text-brand-primary" />
                <h3 className="catalog-modal-title">Generate &amp; Manage Links</h3>
              </div>
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-stone-100 transition-colors"
                title="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="catalog-modal-body flex flex-col gap-3.5">
              {/* Field 1: Share Link Display Box */}
              <div className="admin-form-group mb-0">
                <label className="text-xs font-semibold text-text-primary mb-1.5 block">
                  Generated Share Link URL
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      readOnly
                      value={shareModalLink}
                      placeholder={
                        shareModalLoading
                          ? "Generating link..."
                          : "Select Category / Category Group & Purities below to generate link"
                      }
                      className="admin-input text-xs font-mono select-all w-full bg-white font-medium text-text-primary pr-8"
                      onClick={(e) => e.target.select()}
                    />
                    {shareModalLoading && (
                      <RefreshCw size={14} className="animate-spin text-brand-dark absolute right-2.5 top-1/2 -translate-y-1/2" />
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopyShareLink(shareModalLink)}
                    disabled={!shareModalLink || shareModalLoading}
                    className="btn-outline-brand text-xs py-2 px-3 flex items-center gap-1.5 bg-white whitespace-nowrap shadow-xs"
                    title="Copy link to clipboard"
                  >
                    {shareModalCopied ? <Check size={14} className="text-emerald-700" /> : <Copy size={14} />}
                    <span>{shareModalCopied ? 'Copied!' : 'Copy'}</span>
                  </button>
                  {shareModalLink && (
                    <>
                      <a
                        href={shareModalLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 border border-border-subtle rounded bg-white hover:bg-light-brand text-text-primary flex items-center justify-center transition-colors shadow-xs"
                        title="Open in new tab"
                      >
                        <ExternalLink size={15} />
                      </a>
                      <button
                        type="button"
                        onClick={() => handleShareOnWhatsApp(shareModalLink)}
                        className="p-2 border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded flex items-center justify-center transition-colors shadow-xs"
                        title="Share on WhatsApp"
                      >
                        <MessageCircle size={15} />
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Mode Selector Tabs */}
              <div className="catalog-mode-tabs">
                <button
                  type="button"
                  onClick={() => {
                    setShareSelectionMode('groups');
                    generateLinkForCurrentShare('groups', shareSelectedGroupIds, shareSelectedCategoryIds, shareGroupKtMap, shareCategoryKtMap);
                  }}
                  className={`catalog-mode-tab ${shareSelectionMode === 'groups' ? 'active' : ''}`}
                >
                  <Folder size={14} />
                  <span>Category Groups</span>
                  <span className="catalog-mode-badge">{categoryGroups.length}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShareSelectionMode('categories');
                    generateLinkForCurrentShare('categories', shareSelectedGroupIds, shareSelectedCategoryIds, shareGroupKtMap, shareCategoryKtMap);
                  }}
                  className={`catalog-mode-tab ${shareSelectionMode === 'categories' ? 'active' : ''}`}
                >
                  <Layers size={14} />
                  <span>Individual Categories</span>
                  <span className="catalog-mode-badge">{categories.length}</span>
                </button>
              </div>

              {/* MODE 1: Category Groups Section (Individual Categories NOT shown) */}
              {shareSelectionMode === 'groups' ? (
                <div className="catalog-cat-section">
                  <div className="catalog-section-header">
                    <div className="catalog-section-title">
                      <span>Select Category Groups</span>
                      <span className="catalog-count-badge">
                        {shareSelectedGroupIds.length === 0
                          ? 'None Selected'
                          : (shareSelectedGroupIds.length === categoryGroups.length
                              ? `All Groups (${categoryGroups.length})`
                              : `${shareSelectedGroupIds.length} of ${categoryGroups.length} Selected`)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleSelectAllShareGroups}
                        className="btn-sub-action text-[11px] py-1 px-2.5"
                        title="Select all category groups"
                      >
                        Select All
                      </button>
                      {shareSelectedGroupIds.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearAllShareGroups}
                          className="text-[11px] text-text-muted hover:text-red-500 font-semibold px-2 py-1 transition-colors"
                          title="Clear group selection"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Category Groups Cards Grid */}
                  <div className="catalog-group-grid" style={{ maxHeight: '250px' }}>
                    {categoryGroups.length > 0 ? (
                      categoryGroups.map((grp) => {
                        const isGroupChecked = shareSelectedGroupIds.includes(String(grp._id));
                        const catsInGroup = getCategoriesForGroup(grp._id);
                        const activeKts = getShareGroupKts(grp._id);

                        return (
                          <div
                            key={grp._id}
                            onClick={() => handleToggleShareGroupSelection(grp._id)}
                            className={`catalog-group-card ${isGroupChecked ? 'selected' : ''}`}
                          >
                            <div className="catalog-group-card-top">
                              <div className="catalog-group-card-left">
                                <span className="catalog-cat-checkbox">
                                  {isGroupChecked && <Check size={11} strokeWidth={3} />}
                                </span>
                                <span className="catalog-group-card-name">{grp.name}</span>
                                <span className="catalog-group-count-tag">
                                  {catsInGroup.length} {catsInGroup.length === 1 ? 'Category' : 'Categories'}
                                </span>
                              </div>
                            </div>

                            {/* Available KT options directly for the selected Category Group */}
                            {isGroupChecked && (
                              <div
                                className="catalog-group-card-bottom"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-[11px] font-semibold text-text-secondary flex items-center gap-1">
                                    <Sparkles size={12} className="text-amber-600" />
                                    Available KTs:
                                  </span>
                                  <div className="catalog-item-kt-pills">
                                    {['All', ...availableKts].map((kt) => {
                                      const isAllKt = kt === 'All';
                                      const hasKt = isAllKt ? activeKts.length === availableKts.length : activeKts.includes(kt);
                                      return (
                                        <button
                                          type="button"
                                          key={kt}
                                          onClick={(e) => handleToggleShareGroupKtDirect(grp._id, kt, e)}
                                          className={`catalog-item-kt-chip ${hasKt ? 'active' : 'inactive'}`}
                                          title={isAllKt ? 'Toggle All Purities' : `Toggle ${formatKtLabel(kt)} for ${grp.name}`}
                                        >
                                          {formatKtLabel(kt)}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8 text-xs text-text-muted">
                        No category groups found.
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                /* MODE 2: Individual Categories Section */
                <div className="catalog-cat-section">
                  <div className="catalog-section-header">
                    <div className="catalog-section-title">
                      <span>Select Categories</span>
                      <span className="catalog-count-badge">
                        {shareSelectedCategoryIds.length === 0
                          ? 'None Selected'
                          : (shareSelectedCategoryIds.length === categories.length
                              ? `All Categories (${categories.length})`
                              : `${shareSelectedCategoryIds.length} of ${categories.length} Selected`)}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={handleSelectAllShareCategories}
                        className="btn-sub-action text-[11px] py-1 px-2.5"
                        title="Select all categories"
                      >
                        Select All
                      </button>
                      {shareSelectedCategoryIds.length > 0 && (
                        <button
                          type="button"
                          onClick={handleClearAllShareCategories}
                          className="text-[11px] text-text-muted hover:text-red-500 font-semibold px-2 py-1 transition-colors"
                          title="Clear category selection"
                        >
                          Clear
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Category Group Filter Tabs */}
                  {categoryGroups.length > 0 && (
                    <div className="catalog-group-pills no-scrollbar mb-2">
                      <button
                        type="button"
                        onClick={() => setShareSelectedGroup('all')}
                        className={`catalog-group-pill ${
                          shareSelectedGroup === 'all' ? 'active' : 'inactive'
                        }`}
                      >
                        All Groups
                      </button>
                      {categoryGroups.map((grp) => (
                        <button
                          type="button"
                          key={grp._id}
                          onClick={() => setShareSelectedGroup(String(grp._id))}
                          className={`catalog-group-pill ${
                            shareSelectedGroup === String(grp._id) ? 'active' : 'inactive'
                          }`}
                        >
                          {grp.name}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Search & Category Items */}
                  <div className="catalog-cat-box">
                    {categories.length > 6 && (
                      <div className="catalog-search-bar">
                        <Search size={13} className="text-text-muted flex-shrink-0" />
                        <input
                          type="text"
                          value={shareModalCategorySearch}
                          onChange={(e) => setShareModalCategorySearch(e.target.value)}
                          placeholder="Search categories (e.g. Kada, Ring, Chain)..."
                          className="catalog-search-input"
                        />
                        {shareModalCategorySearch && (
                          <button
                            type="button"
                            onClick={() => setShareModalCategorySearch('')}
                            className="text-text-muted hover:text-text-primary p-0.5"
                            title="Clear search"
                          >
                            <X size={13} />
                          </button>
                        )}
                      </div>
                    )}

                    <div className="catalog-cat-grid" style={{ maxHeight: '240px' }}>
                      {filteredShareCategories.length > 0 ? (
                        filteredShareCategories.map((cat) => {
                          const isChecked = shareSelectedCategoryIds.includes(cat._id);
                          const activeKts = getShareCategoryKts(cat._id);

                          return (
                            <div
                              key={cat._id}
                              onClick={() => handleToggleShareCategorySelection(cat._id)}
                              className={`catalog-cat-card ${isChecked ? 'selected' : ''}`}
                              title={cat.name}
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <span className="catalog-cat-checkbox">
                                  {isChecked && <Check size={11} strokeWidth={3} />}
                                </span>
                                <span className="catalog-cat-name">{cat.name}</span>
                              </div>

                              {/* Individual Category KT Options */}
                              {isChecked && (
                                <div
                                  className="catalog-item-kt-pills"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  {['All', ...availableKts].map((kt) => {
                                    const isAllKt = kt === 'All';
                                    const hasKt = isAllKt ? activeKts.length === availableKts.length : activeKts.includes(kt);
                                    return (
                                      <button
                                        type="button"
                                        key={kt}
                                        onClick={(e) => handleToggleShareCategoryKt(cat._id, kt, e)}
                                        className={`catalog-item-kt-chip ${hasKt ? 'active' : 'inactive'}`}
                                        title={isAllKt ? 'Toggle All Purities' : `Toggle ${formatKtLabel(kt)} for ${cat.name}`}
                                      >
                                        {formatKtLabel(kt)}
                                      </button>
                                    );
                                  })}
                                </div>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-6 text-xs text-text-muted col-span-full">
                          No categories found matching "{shareModalCategorySearch}"
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="catalog-modal-footer flex items-center justify-between">
              <div className="text-xs text-text-muted">
                {shareSelectionMode === 'groups'
                  ? (shareSelectedGroupIds.length === 0 ? 'No groups selected' : `${shareSelectedGroupIds.length} Groups selected`)
                  : (shareSelectedCategoryIds.length === 0 ? 'No categories selected' : `${shareSelectedCategoryIds.length} Categories selected`)}
              </div>
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="btn-outline-brand text-xs py-2 px-4"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remote Server Config Modal */}
      {configModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setConfigModalOpen(false)}>
          <div className="catalog-modal-card mx-3 sm:mx-auto max-w-lg w-full relative overflow-hidden" 
               style={{ backgroundColor: '#ffffff', borderRadius: '24px', boxShadow: '0 25px 60px -12px rgba(25, 36, 26, 0.35), 0 12px 24px -8px rgba(25, 36, 26, 0.18)' }} 
               onClick={(e) => e.stopPropagation()}>
            
            {/* Header */}
            <div className="flex justify-between items-start" style={{ padding: '24px 24px 16px 24px' }}>
              <div className="flex" style={{ gap: '16px' }}>
                <div className="flex items-center justify-center bg-white shadow-sm" 
                     style={{ width: '48px', height: '48px', borderRadius: '14px', border: '1px solid #dcebe3', color: '#71a188' }}>
                  <Settings size={24} strokeWidth={2} className="animate-spin" style={{ animationDuration: '8s' }} />
                </div>
                <div>
                  <h3 className="font-bold tracking-tight" style={{ fontSize: '19px', color: '#19241A', lineHeight: '1.2' }}>Remote Image Server</h3>
                  <p className="font-medium" style={{ fontSize: '13px', color: '#8b9fa4', marginTop: '2px' }}>Live Cloudflare Tunnel Configuration</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setConfigModalOpen(false)}
                className="transition-colors"
                style={{ padding: '4px', color: '#96a9b5', background: 'transparent', border: 'none', cursor: 'pointer' }}
                onMouseOver={(e) => e.currentTarget.style.color = '#19241A'}
                onMouseOut={(e) => e.currentTarget.style.color = '#96a9b5'}
                title="Close"
              >
                <X size={20} strokeWidth={2.5} />
              </button>
            </div>
            
            <div style={{ padding: '0 24px 24px 24px' }}>

              {/* Input Section */}
              <div style={{ marginBottom: '32px' }}>
                <label className="block font-bold" style={{ fontSize: '14px', color: '#111827', marginBottom: '8px' }}>
                  Active Tunnel URL
                </label>
                <div className="flex items-stretch overflow-hidden shadow-sm transition-all" 
                     style={{ borderRadius: '12px', border: '1px solid #d2dbd7' }}>
                  <div className="flex items-center justify-center" 
                       style={{ padding: '0 16px', backgroundColor: '#f2f7f4', borderRight: '1px solid #d2dbd7', color: '#71a188' }}>
                    <Lock size={18} strokeWidth={2.5} />
                  </div>
                  <input
                    type="text"
                    value={configDesktopUrl}
                    onChange={(e) => setConfigDesktopUrl(e.target.value)}
                    placeholder="https://your-tunnel.trycloudflare.com"
                    className="w-full focus:outline-none font-medium"
                    style={{ padding: '12px 16px', fontSize: '14px', color: '#374151', backgroundColor: '#ffffff', border: 'none' }}
                  />
                </div>
              </div>
              
              {/* Footer Buttons */}
              <div className="flex items-center justify-end" style={{ gap: '12px' }}>
                <button
                  type="button"
                  onClick={() => setConfigModalOpen(false)}
                  className="font-semibold transition-colors shadow-sm"
                  style={{ padding: '10px 24px', borderRadius: '12px', fontSize: '14px', border: '1px solid #d2dbd7', color: '#374151', backgroundColor: '#ffffff', cursor: 'pointer' }}
                  onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                  onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ffffff'}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveConfig}
                  disabled={configSaving}
                  className="font-semibold transition-colors flex items-center shadow-sm"
                  style={{ 
                    gap: '8px',
                    padding: '10px 24px', 
                    borderRadius: '12px', 
                    fontSize: '14px', 
                    backgroundColor: '#b6d6c6', 
                    color: '#1e3c2b', 
                    border: 'none',
                    cursor: configSaving ? 'not-allowed' : 'pointer',
                    opacity: configSaving ? 0.7 : 1 
                  }}
                  onMouseOver={(e) => !configSaving && (e.currentTarget.style.backgroundColor = '#a6ccb9')}
                  onMouseOut={(e) => !configSaving && (e.currentTarget.style.backgroundColor = '#b6d6c6')}
                >
                  {configSaving ? (
                    <>
                      <RefreshCw size={16} className="animate-spin" strokeWidth={2.5} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} strokeWidth={2.5} />
                      Save Configuration
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AdminConfirmModal
        isOpen={deleteConfirmModalOpen}
        onClose={() => setDeleteConfirmModalOpen(false)}
        onConfirm={confirmDeleteSlot}
        title="Delete Slot Image"
        subtitle="Style Images Studio"
        description={`Are you sure you want to clear the jewellery image from ${slotToDelete?.kt || ''} Slot ${slotToDelete?.slot || ''}?`}
        warning="This action cannot be undone. The uploaded photo render will be permanently detached from this slot."
        confirmText="Delete Image"
        cancelText="Cancel"
      />
    </div>
  );
};

export default StyleImagesManagement;
