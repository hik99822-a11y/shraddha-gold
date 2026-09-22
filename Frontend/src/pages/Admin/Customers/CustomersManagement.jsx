import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  Users,
  User,
  Plus,
  Search,
  Filter,
  Share2,
  FileDown,
  Calendar,
  Clock,
  Phone,
  Mail,
  MapPin,
  Trash2,
  Edit2,
  ExternalLink,
  Copy,
  Check,
  Send,
  AlertCircle,
  X,
  Lock,
  Eye,
  EyeOff,
  CheckSquare,
  KeyRound,
  RefreshCw,
  CheckCircle2,
  Folder,
  Layers,
  MoreVertical,
  UserPlus,
  UserCog,
  Building2,
  Sparkles,
  ShieldCheck,
  MessageSquare,
  MessageCircle,
  Zap,
  Link2,
  ChevronDown,
  ChevronUp,
  LayoutTemplate
} from 'lucide-react';
import { adminApi, sharedApi } from '../../../services/api';
import { formatDateIST } from '../../../utils/dateUtils';
import { PhoneInput } from 'react-international-phone';
import AdminConfirmModal from '../components/AdminConfirmModal';
import 'react-international-phone/style.css';
import './CustomersManagement.css';
import { formatKtLabel } from '../../../utils/ktUtils.js';
import CustomSelect from '../../../components/common/CustomSelect.jsx';

const API_BASE = 'https://api.shraddhagold.com';

const formatTimeDisplay = (timeStr) => {
  if (!timeStr) return '10:00 AM';
  const parts = String(timeStr).trim().split(':');
  if (parts.length < 2) return timeStr;
  const h = parseInt(parts[0], 10);
  const m = parseInt(parts[1], 10);
  if (isNaN(h)) return timeStr;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour12 = h % 12 || 12;
  const minStr = isNaN(m) ? '00' : String(m).padStart(2, '0');
  return `${hour12}:${minStr} ${ampm}`;
};

/**
 * Computes the access expiration datetime string (YYYY-MM-DDTHH:mm) based on:
 * - accessStart (ISO string or datetime-local string)
 * - delayDays (number of days delay; 0 = Day 1 / 24 hours, N = N days)
 * - shareTime (optional "HH:mm" time string, e.g. "10:00")
 */
const formatToISTInput = (dateStr) => {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (isNaN(d)) return '';
  const istDate = new Date(d.getTime() + 5.5 * 60 * 60 * 1000);
  return istDate.toISOString().slice(0, 16);
};

const parseFromISTInput = (istStr) => {
  if (!istStr) return null;
  const d = new Date(`${istStr}:00+05:30`);
  return d.toISOString();
};

export const computeAccessEndFromDelay = (accessStartStr, delayDays = 0, shareTime = '') => {
  const baseDate = accessStartStr ? new Date(`${accessStartStr}:00+05:30`) : new Date();
  if (isNaN(baseDate.getTime())) return '';

  const days = Math.max(0, parseInt(delayDays, 10) || 0);
  const resultDate = new Date(baseDate.getTime());

  if (days === 0) {
    // 0 days delay: valid for 24 hours (Day 1 immediate)
    resultDate.setTime(baseDate.getTime() + 24 * 60 * 60 * 1000);
  } else {
    // N days delay: advance by N days
    resultDate.setDate(resultDate.getDate() + days);
    // If a shareTime (HH:mm) is specified, align expiration to that time on target day
    if (shareTime && typeof shareTime === 'string' && shareTime.includes(':')) {
      const [h, m] = shareTime.split(':').map((v) => parseInt(v, 10));
      if (!isNaN(h) && !isNaN(m)) {
        resultDate.setHours(h, m, 0, 0);
      }
    }
    // Ensure resultDate gives at least the full days window
    if (resultDate.getTime() <= baseDate.getTime()) {
      resultDate.setTime(baseDate.getTime() + days * 24 * 60 * 60 * 1000);
    }
  }

  // Format as YYYY-MM-DDTHH:mm for datetime-local input
  const pad = (n) => String(n).padStart(2, '0');
  const yyyy = resultDate.getFullYear();
  const MM = pad(resultDate.getMonth() + 1);
  const dd = pad(resultDate.getDate());
  const hh = pad(resultDate.getHours());
  const mm = pad(resultDate.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
};

export const getMaxDelayAndShareTime = (formObj) => {
  let maxDelay = Number(formObj?.linkShareAfterDays || 0);
  let resolvedShareTime = formObj?.linkShareTime || '10:00';

  if (Array.isArray(formObj?.categoryAccess) && formObj.categoryAccess.length > 0) {
    formObj.categoryAccess.forEach((ca) => {
      const d = Number(ca.shareAfterDays || 0);
      if (d >= maxDelay) {
        maxDelay = d;
        if (ca.shareTime) {
          resolvedShareTime = ca.shareTime;
        }
      }
    });
  }

  return { maxDelay, shareTime: resolvedShareTime };
};

const CustomersManagement = () => {
  const [customers, setCustomers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [pagination, setPagination] = useState({ page: 1, total: 0, pages: 1 });

  const [categoryGroups, setCategoryGroups] = useState([]);

  // Modals state
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentCustomerId, setCurrentCustomerId] = useState(null);
  const [showFormPassword, setShowFormPassword] = useState(false);

  const generateRandomPassword = () => {
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';
    let randomStr = '';
    for (let i = 0; i < 6; i++) {
      randomStr += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const newPass = `SG@${randomStr}`;
    setFormData((prev) => ({
      ...prev,
      password: newPass
    }));
  };

  // Customer Details View Modal state
  const [viewCustomerModalOpen, setViewCustomerModalOpen] = useState(false);
  const [viewingCustomer, setViewingCustomer] = useState(null);
  const [showViewPassword, setShowViewPassword] = useState(false);
  const [viewCopiedField, setViewCopiedField] = useState(null);
  const [viewCategorySearch, setViewCategorySearch] = useState('');
  const [showCredsInDirectMode, setShowCredsInDirectMode] = useState(false);

  // Row Action Dropdown state
  const [activeActionMenuId, setActiveActionMenuId] = useState(null);
  const [menuTargetCustomer, setMenuTargetCustomer] = useState(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 0 });
  const actionMenuRef = useRef(null);

  // Close floating action menu on outside click, window resize, or scroll
  useEffect(() => {
    if (!activeActionMenuId) return;

    const handleOutsideClick = (e) => {
      // Don't close if clicking inside the menu or on the trigger button
      if (actionMenuRef.current && actionMenuRef.current.contains(e.target)) {
        return;
      }
      if (e.target.closest && e.target.closest('.customer-action-dropdown-trigger')) {
        return;
      }
      setActiveActionMenuId(null);
      setMenuTargetCustomer(null);
    };

    const handleDismiss = () => {
      setActiveActionMenuId(null);
      setMenuTargetCustomer(null);
    };

    document.addEventListener('mousedown', handleOutsideClick);
    window.addEventListener('scroll', handleDismiss, true);
    window.addEventListener('resize', handleDismiss);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('scroll', handleDismiss, true);
      window.removeEventListener('resize', handleDismiss);
    };
  }, [activeActionMenuId]);

  const handleToggleActionMenu = (e, customer) => {
    e.stopPropagation();
    if (activeActionMenuId === customer._id) {
      setActiveActionMenuId(null);
      setMenuTargetCustomer(null);
      return;
    }

    const rect = e.currentTarget.getBoundingClientRect();
    const isNearBottom = rect.bottom + 260 > window.innerHeight;

    setMenuPosition({
      top: isNearBottom ? undefined : rect.bottom + 6,
      bottom: isNearBottom ? window.innerHeight - rect.top + 6 : undefined,
      right: Math.max(16, window.innerWidth - rect.right),
    });
    setMenuTargetCustomer(customer);
    setActiveActionMenuId(customer._id);
  };

  const openViewCustomerModal = (customer) => {
    setViewingCustomer(customer);
    setShowViewPassword(false);
    setViewCopiedField(null);
    setViewCategorySearch('');
    setShowCredsInDirectMode(false);
    setViewCustomerModalOpen(true);
  };

  const copyViewField = (text, fieldName) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setViewCopiedField(fieldName);
    setTimeout(() => setViewCopiedField(null), 2000);
  };

  // Form state
  const [formData, setFormData] = useState(() => {
    const defaultStartIST = formatToISTInput(new Date().toISOString());
    const defaultEndIST = formatToISTInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
    return {
      businessName: '',
      name: '',
      email: '',
      contacts: [{ name: '', phone: '' }],
      phones: [''],
      primaryPhone: '',
      city: '',
      status: 'Active',
      assignedCategories: [],
      categoryAccess: [],
      shareFormat: 'Link',
      accessStart: defaultStartIST,
      accessEnd: defaultEndIST,
      linkShareType: 'Without Login',
      linkShareTime: '10:00',
      linkShareAfterDays: 0,
      createLoginAccount: false,
      username: '',
      password: '',
      notes: '',
      panelTabAccess: ['ready', 'all']
    };
  });

  // Category filter search in modal
  const [categorySearch, setCategorySearch] = useState('');
  const [selectedGroupTab, setSelectedGroupTab] = useState('all');

  // Sharing Modal state
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedCustomerForShare, setSelectedCustomerForShare] = useState(null);
  const [shareAccessType, setShareAccessType] = useState('Without Login');
  const [shareSelectedCategories, setShareSelectedCategories] = useState([]);
  const [generatedLink, setGeneratedLink] = useState(null);
  const [categoryLinks, setCategoryLinks] = useState([]);
  const [copiedCatToken, setCopiedCatToken] = useState(null);
  const [metaSelectedToken, setMetaSelectedToken] = useState('master');
  const [copied, setCopied] = useState(false);

  // Meta API Scheduling state
  const [metaScheduleDate, setMetaScheduleDate] = useState(new Date().toISOString().slice(0, 10));
  const [metaScheduleTime, setMetaScheduleTime] = useState('10:00');
  const [metaTargetPhone, setMetaTargetPhone] = useState('');
  const [metaLoading, setMetaLoading] = useState(false);
  const [metaMessage, setMetaMessage] = useState({ text: '', type: '' });

  // Direct Row Action States
  const [copiedCustomerId, setCopiedCustomerId] = useState(null);
  const [downloadingPdfCustomerId, setDownloadingPdfCustomerId] = useState(null);
  const [generatingLinkCustomerId, setGeneratingLinkCustomerId] = useState(null);

  // Custom Delete Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    customer: null,
    isLoading: false
  });

  // Reliable cross-origin blob download helper
  const downloadFileFromUrl = async (url, fileName) => {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = fileName || 'Shraddha_Gold_Customer_Catalog.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      console.error('Blob download failed, fallback to link:', err);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName || 'Shraddha_Gold_Customer_Catalog.pdf';
      link.target = '_blank';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  // PDF generation state
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfResult, setPdfResult] = useState(null);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getCustomers({
        search,
        status: statusFilter,
        page: pagination.page,
        limit: 10
      });
      if (res.success) {
        setCustomers(res.customers);
        setPagination(res.pagination);
      }
    } catch (err) {
      console.error('Failed to load customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoriesAndGroups = async () => {
    try {
      const [catRes, grpRes] = await Promise.all([
        adminApi.getCategories({ status: 'Active' }),
        adminApi.getCategoryGroups({ status: 'Active' })
      ]);
      if (catRes?.success) setCategories(catRes.categories || []);
      if (grpRes?.success) setCategoryGroups(grpRes.groups || grpRes.categoryGroups || []);
    } catch (err) {
      console.error('Failed to load categories/groups:', err);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [search, statusFilter, pagination.page]);

  const [availableKts, setAvailableKts] = useState([]);

  useEffect(() => {
    fetchCategoriesAndGroups();
    adminApi.getDetectedKts()
      .then((res) => {
        if (res?.success && Array.isArray(res.kts) && res.kts.length > 0) {
          setAvailableKts(res.kts);
        }
      })
      .catch((err) => console.warn('Could not fetch detected KTs:', err.message));
  }, []);

  // Helper to ensure phone numbers have proper country code (+91 by default for 10-digit Indian numbers)
  const formatExistingPhone = (p) => {
    if (!p) return '';
    const str = String(p).trim();
    if (str.startsWith('+')) return str;
    const digits = str.replace(/\D/g, '');
    if (digits.length === 10) return `+91${digits}`;
    if (digits.length > 10) return `+${digits}`;
    return str ? `+91${str}` : '';
  };

  // Helper to find category group for a category
  const findGroupForCategory = (cat) => {
    if (!cat) return null;
    return categoryGroups.find((g) =>
      (g.categories || []).some((c) => (c && typeof c === 'object' ? c._id === cat._id : c === cat._id)) ||
      (g.categoryNames || []).includes(cat.name)
    );
  };

  // Handle multiple contacts
  const handleContactChange = (index, field, value) => {
    const updated = [...formData.contacts];
    updated[index] = { ...updated[index], [field]: value };
    const validPhones = updated.map((c) => c.phone).filter(Boolean);
    setFormData({
      ...formData,
      contacts: updated,
      phones: validPhones.length > 0 ? validPhones : [''],
      primaryPhone: validPhones[0] || formData.primaryPhone
    });
  };

  const addContactField = () => {
    setFormData({
      ...formData,
      contacts: [...formData.contacts, { name: '', phone: '' }]
    });
  };

  const removeContactField = (index) => {
    if (formData.contacts.length <= 1) return;
    const updated = formData.contacts.filter((_, idx) => idx !== index);
    const validPhones = updated.map((c) => c.phone).filter(Boolean);
    setFormData({
      ...formData,
      contacts: updated,
      phones: validPhones.length > 0 ? validPhones : [''],
      primaryPhone: validPhones[0] || ''
    });
  };

  const openCreateModal = () => {
    setIsEditing(false);
    setCurrentCustomerId(null);
    setShowFormPassword(false);
    const defaultStartIST = formatToISTInput(new Date().toISOString());
    const defaultEndIST = formatToISTInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());
    setFormData({
      businessName: '',
      name: '',
      email: '',
      contacts: [{ name: '', phone: '' }],
      phones: [''],
      primaryPhone: '',
      city: '',
      status: 'Active',
      assignedCategories: [],
      categoryAccess: [],
      shareFormat: 'Link',
      accessStart: defaultStartIST,
      accessEnd: defaultEndIST,
      linkShareType: 'Without Login',
      linkShareTime: '10:00',
      linkShareAfterDays: 0,
      createLoginAccount: false,
      username: '',
      password: '',
      notes: '',
      panelTabAccess: ['ready', 'all']
    });
    setCategorySearch('');
    setSelectedGroupTab('all');
    setCustomerModalOpen(true);
  };

  const openEditModal = (customer) => {
    setIsEditing(true);
    setCurrentCustomerId(customer._id);
    setShowFormPassword(false);
    const bName = customer.businessName || customer.name || '';
    const shareType = customer.linkShareType || customer.shareAccessType || 'Without Login';

    let loadedContacts = [];
    if (Array.isArray(customer.contacts) && customer.contacts.length > 0) {
      loadedContacts = customer.contacts.map((c) => ({
        name: c.name || bName,
        phone: formatExistingPhone(c.phone)
      }));
    } else if (Array.isArray(customer.phones) && customer.phones.length > 0) {
      loadedContacts = customer.phones.map((p) => ({
        name: bName,
        phone: formatExistingPhone(p)
      }));
    } else {
      loadedContacts = [{ name: bName, phone: '' }];
    }

    let loadedAccess = [];
    if (Array.isArray(customer.categoryAccess) && customer.categoryAccess.length > 0) {
      loadedAccess = customer.categoryAccess
        .filter((ca) => ca && (ca.category || ca.categoryName))
        .map((ca) => ({
          category: ca.category && typeof ca.category === 'object' ? ca.category._id : ca.category,
          categoryName: ca.categoryName || (ca.category && typeof ca.category === 'object' ? ca.category.name : ''),
          group: ca.group && typeof ca.group === 'object' ? ca.group._id : (ca.group || null),
          groupName: ca.groupName || (ca.group && typeof ca.group === 'object' ? ca.group.name : ''),
          kts: Array.isArray(ca.kts) && ca.kts.length > 0 ? ca.kts : (availableKts.length > 0 ? availableKts : []),
          shareFormat: ca.shareFormat || customer.shareFormat || 'Link',
          shareTime: ca.shareTime || customer.linkShareTime || '10:00',
          shareAfterDays: ca.shareAfterDays !== undefined ? ca.shareAfterDays : (customer.linkShareAfterDays || 0)
        }));
    } else if (Array.isArray(customer.assignedCategories) && customer.assignedCategories.length > 0) {
      loadedAccess = customer.assignedCategories
        .filter(Boolean)
        .map((c) => {
          const cId = c && typeof c === 'object' ? c._id : c;
          const cName = c && typeof c === 'object' ? c.name : '';
          return {
            category: cId,
            categoryName: cName,
            group: null,
            groupName: '',
            kts: (availableKts.length > 0 ? availableKts : []),
            shareFormat: customer.shareFormat || 'Link',
            shareTime: customer.linkShareTime || '10:00',
            shareAfterDays: customer.linkShareAfterDays || 0
          };
        });
    }

    const assignedCatIds = loadedAccess.map((a) => a.category).filter(Boolean);

    setFormData({
      businessName: bName,
      name: bName,
      email: customer.email || '',
      contacts: loadedContacts,
      phones: loadedContacts.map((c) => c.phone).filter(Boolean),
      primaryPhone: loadedContacts[0]?.phone || '',
      city: customer.city || '',
      status: customer.status || 'Active',
      assignedCategories: assignedCatIds,
      categoryAccess: loadedAccess,
      shareFormat: customer.shareFormat || 'Link',
      accessStart: customer.accessStart ? formatToISTInput(customer.accessStart) : '',
      accessEnd: customer.accessEnd ? formatToISTInput(customer.accessEnd) : '',
      linkShareType: shareType,
      linkShareTime: customer.linkShareTime || '10:00',
      linkShareAfterDays: customer.linkShareAfterDays !== undefined ? customer.linkShareAfterDays : 0,
      createLoginAccount: shareType === 'With Login' || !!customer.user || !!customer.plainPassword,
      username: customer.username || customer.user?.username || '',
      password: customer.plainPassword || customer.user?.plainPassword || '',
      notes: customer.notes || '',
      panelTabAccess: customer.panelTabAccess || ['ready', 'all']
    });
    setCategorySearch('');
    setSelectedGroupTab('all');
    setCustomerModalOpen(true);
  };

  // Category toggle & quick action handlers
  const handleToggleCategory = (cat) => {
    const catId = cat._id;
    const isAssigned = formData.categoryAccess.some((ca) => ca.category === catId);

    let updatedAccess;
    if (isAssigned) {
      updatedAccess = formData.categoryAccess.filter((ca) => ca.category !== catId);
    } else {
      const grp = findGroupForCategory(cat);
      const newEntry = {
        category: catId,
        categoryName: cat.name,
        group: grp?._id || null,
        groupName: grp?.name || '',
        kts: (availableKts.length > 0 ? [...availableKts] : []),
        shareFormat: formData.shareFormat || 'Link',
        shareTime: formData.linkShareTime || '10:00',
        shareAfterDays: formData.linkShareAfterDays || 0
      };
      updatedAccess = [...formData.categoryAccess, newEntry];
    }
    setFormData({
      ...formData,
      categoryAccess: updatedAccess,
      assignedCategories: updatedAccess.map((ca) => ca.category)
    });
  };

  const handleToggleKt = (catId, ktPurity) => {
    const updatedAccess = formData.categoryAccess.map((ca) => {
      if (ca.category === catId) {
        const currentKts = ca.kts || [];
        const nextKts = currentKts.includes(ktPurity)
          ? currentKts.filter((k) => k !== ktPurity)
          : [...currentKts, ktPurity];
        return { ...ca, kts: nextKts };
      }
      return ca;
    });
    setFormData({ ...formData, categoryAccess: updatedAccess });
  };

  const handleCategoryAccessPropChange = (catId, prop, value) => {
    const updatedAccess = formData.categoryAccess.map((ca) => {
      if (ca.category === catId) {
        return { ...ca, [prop]: value };
      }
      return ca;
    });

    setFormData({
      ...formData,
      categoryAccess: updatedAccess
    });
  };

  const handleSelectAllCategories = () => {
    const allAccess = categories.map((cat) => {
      const grp = findGroupForCategory(cat);
      return {
        category: cat._id,
        categoryName: cat.name,
        group: grp?._id || null,
        groupName: grp?.name || '',
        kts: (availableKts.length > 0 ? [...availableKts] : []),
        shareFormat: formData.shareFormat || 'Link',
        shareTime: formData.linkShareTime || '10:00',
        shareAfterDays: formData.linkShareAfterDays || 0
      };
    });
    setFormData({
      ...formData,
      categoryAccess: allAccess,
      assignedCategories: allAccess.map((a) => a.category)
    });
  };

  const handleClearAllCategories = () => {
    setFormData({
      ...formData,
      categoryAccess: [],
      assignedCategories: []
    });
  };

  const getCategoriesInGroup = (grp) => {
    if (!grp) return [];
    const grpCatNames = grp.categoryNames || [];
    return categories.filter((c) =>
      grpCatNames.includes(c.name) ||
      (grp.categories || []).some((gc) => (typeof gc === 'object' ? gc._id === c._id : gc === c._id))
    );
  };

  const getGroupSelectionState = (grp) => {
    const grpCats = getCategoriesInGroup(grp);
    if (grpCats.length === 0) return { selectedCount: 0, total: 0, isAll: false, isPartial: false };
    const selectedCount = grpCats.filter((c) => formData.categoryAccess.some((ca) => ca.category === c._id)).length;
    return {
      selectedCount,
      total: grpCats.length,
      isAll: selectedCount > 0 && selectedCount === grpCats.length,
      isPartial: selectedCount > 0 && selectedCount < grpCats.length
    };
  };

  const getGroupConfigValues = (grp) => {
    const grpCats = getCategoriesInGroup(grp);
    const grpCatIds = grpCats.map((c) => c._id);
    const assignedInGroup = formData.categoryAccess.filter((ca) => grpCatIds.includes(ca.category));

    if (assignedInGroup.length === 0) {
      return {
        shareFormat: formData.shareFormat || 'Link',
        shareTime: formData.linkShareTime || '10:00',
        shareAfterDays: formData.linkShareAfterDays || 0
      };
    }

    return {
      shareFormat: assignedInGroup[0].shareFormat || formData.shareFormat || 'Link',
      shareTime: assignedInGroup[0].shareTime || formData.linkShareTime || '10:00',
      shareAfterDays: assignedInGroup[0].shareAfterDays ?? (formData.linkShareAfterDays || 0)
    };
  };

  const handleGroupAccessPropChange = (grp, prop, value) => {
    const grpCats = getCategoriesInGroup(grp);
    const grpCatIds = grpCats.map((c) => c._id);
    const hasAnyAssigned = formData.categoryAccess.some((ca) => grpCatIds.includes(ca.category));

    let updated = [...formData.categoryAccess];
    if (!hasAnyAssigned) {
      grpCats.forEach((cat) => {
        updated.push({
          category: cat._id,
          categoryName: cat.name,
          group: grp._id,
          groupName: grp.name,
          kts: (availableKts.length > 0 ? [...availableKts] : []),
          shareFormat: prop === 'shareFormat' ? value : (formData.shareFormat || 'Link'),
          shareTime: prop === 'shareTime' ? value : (formData.linkShareTime || '10:00'),
          shareAfterDays: prop === 'shareAfterDays' ? value : (formData.linkShareAfterDays || 0),
          [prop]: value
        });
      });
    } else {
      updated = updated.map((ca) => {
        if (grpCatIds.includes(ca.category)) {
          return { ...ca, [prop]: value };
        }
        return ca;
      });
    }

    setFormData({
      ...formData,
      categoryAccess: updated,
      assignedCategories: updated.map((ca) => ca.category)
    });
  };

  const handleToggleGroup = (grp) => {
    const grpCats = getCategoriesInGroup(grp);
    const grpCatIds = grpCats.map((c) => c._id);
    const { isAll } = getGroupSelectionState(grp);

    let updated;
    if (isAll) {
      updated = formData.categoryAccess.filter((ca) => !grpCatIds.includes(ca.category));
    } else {
      const groupConfig = getGroupConfigValues(grp);
      const existingWithKts = formData.categoryAccess.find((ca) => grpCatIds.includes(ca.category) && ca.kts?.length > 0);
      const defaultKts = existingWithKts?.kts || (availableKts.length > 0 ? [...availableKts] : []);

      updated = [...formData.categoryAccess];
      grpCats.forEach((cat) => {
        if (!updated.some((ca) => ca.category === cat._id)) {
          updated.push({
            category: cat._id,
            categoryName: cat.name,
            group: grp._id,
            groupName: grp.name,
            kts: defaultKts,
            shareFormat: groupConfig.shareFormat || formData.shareFormat || 'Link',
            shareTime: groupConfig.shareTime || formData.linkShareTime || '10:00',
            shareAfterDays: groupConfig.shareAfterDays ?? (formData.linkShareAfterDays || 0)
          });
        }
      });
    }
    setFormData({
      ...formData,
      categoryAccess: updated,
      assignedCategories: updated.map((ca) => ca.category)
    });
  };

  const handleToggleGroupKt = (grp, ktPurity) => {
    const grpCats = getCategoriesInGroup(grp);
    const grpCatIds = grpCats.map((c) => c._id);
    const assignedInGroup = formData.categoryAccess.filter((ca) => grpCatIds.includes(ca.category));
    const allHaveKt = assignedInGroup.length === grpCats.length && assignedInGroup.every((ca) => (ca.kts || []).includes(ktPurity));
    const groupConfig = getGroupConfigValues(grp);

    let updated = [...formData.categoryAccess];
    grpCats.forEach((cat) => {
      const existingIdx = updated.findIndex((ca) => ca.category === cat._id);
      if (existingIdx === -1) {
        if (!allHaveKt) {
          updated.push({
            category: cat._id,
            categoryName: cat.name,
            group: grp._id,
            groupName: grp.name,
            kts: [ktPurity],
            shareFormat: groupConfig.shareFormat || formData.shareFormat || 'Link',
            shareTime: groupConfig.shareTime || formData.linkShareTime || '10:00',
            shareAfterDays: groupConfig.shareAfterDays ?? (formData.linkShareAfterDays || 0)
          });
        }
      } else {
        const currentKts = updated[existingIdx].kts || [];
        const nextKts = allHaveKt
          ? currentKts.filter((k) => k !== ktPurity)
          : currentKts.includes(ktPurity)
          ? currentKts
          : [...currentKts, ktPurity];
        updated[existingIdx] = {
          ...updated[existingIdx],
          kts: nextKts
        };
      }
    });

    setFormData({
      ...formData,
      categoryAccess: updated,
      assignedCategories: updated.map((ca) => ca.category)
    });
  };

  const isGroupKtActive = (grp, purity) => {
    const grpCats = getCategoriesInGroup(grp);
    if (grpCats.length === 0) return false;
    const assignedInGroup = formData.categoryAccess.filter((ca) => grpCats.some((c) => c._id === ca.category));
    return assignedInGroup.length > 0 && assignedInGroup.every((ca) => (ca.kts || []).includes(purity));
  };

  const handleSelectAllGroups = () => {
    const allGroupsAssigned = categoryGroups.length > 0 && categoryGroups.every((g) => getGroupSelectionState(g).isAll);
    if (allGroupsAssigned) {
      const groupCatIds = categories
        .filter((c) => findGroupForCategory(c))
        .map((c) => c._id);
      const updated = formData.categoryAccess.filter((ca) => !groupCatIds.includes(ca.category));
      setFormData({
        ...formData,
        categoryAccess: updated,
        assignedCategories: updated.map((ca) => ca.category)
      });
      return;
    }

    const allAccess = categories.map((cat) => {
      const existing = formData.categoryAccess.find((ca) => ca.category === cat._id);
      if (existing) return existing;
      const grp = findGroupForCategory(cat);
      return {
        category: cat._id,
        categoryName: cat.name,
        group: grp?._id || null,
        groupName: grp?.name || '',
        kts: (availableKts.length > 0 ? [...availableKts] : []),
        shareFormat: formData.shareFormat || 'Link',
        shareTime: formData.linkShareTime || '10:00',
        shareAfterDays: formData.linkShareAfterDays || 0
      };
    });
    setFormData({
      ...formData,
      categoryAccess: allAccess,
      assignedCategories: allAccess.map((a) => a.category)
    });
  };

  const unassignedCategories = categories.filter((c) => !findGroupForCategory(c));

  const filteredCategories = categories.filter((cat) => {
    const matchesSearch = (cat.name || '').toLowerCase().includes(categorySearch.toLowerCase().trim());
    if (!matchesSearch) return false;
    if (selectedGroupTab === 'all') return true;
    if (selectedGroupTab === 'unassigned') return !findGroupForCategory(cat);
    const grp = findGroupForCategory(cat);
    return grp && String(grp._id) === String(selectedGroupTab);
  });

  const handleSaveCustomer = async (e) => {
    e.preventDefault();
    try {
      const bName = (formData.businessName || formData.name || '').trim();
      if (!bName) {
        alert('Please enter a valid Business Name.');
        return;
      }

      // Validate and clean contacts
      const cleanedContacts = formData.contacts
        .filter((c) => c && (c.phone || c.name))
        .map((c) => ({
          name: (c.name || bName).trim(),
          phone: (c.phone || '').trim()
        }));

      const validPhones = cleanedContacts.map((c) => c.phone).filter((p) => p.replace(/\D/g, '').length >= 7);

      if (validPhones.length === 0) {
        alert('Please enter at least one valid mobile number with country code.');
        return;
      }

      // Ensure accessEnd is resolved if missing
      let finalAccessEnd = formData.accessEnd;
      if (!finalAccessEnd) {
        const start = formData.accessStart ? new Date(`${formData.accessStart}:00+05:30`) : new Date();
        finalAccessEnd = formatToISTInput(new Date(start.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString());
      }

      const payload = {
        ...formData,
        accessStart: parseFromISTInput(formData.accessStart),
        accessEnd: parseFromISTInput(finalAccessEnd),
        name: bName,
        businessName: bName,
        contacts: cleanedContacts,
        phones: validPhones,
        primaryPhone: validPhones[0],
        assignedCategories: formData.categoryAccess.map((ca) => ca.category).filter(Boolean),
        categoryAccess: formData.categoryAccess,
        shareFormat: formData.shareFormat === 'PDF' ? 'PDF' : 'Link',
        linkShareAfterDays: Number.isInteger(Number(formData.linkShareAfterDays))
          ? Math.max(0, parseInt(formData.linkShareAfterDays, 10))
          : 0,
        createLoginAccount: formData.createLoginAccount || formData.linkShareType === 'With Login'
      };

      if (isEditing) {
        await adminApi.updateCustomer(currentCustomerId, payload);
      } else {
        await adminApi.createCustomer(payload);
      }
      setCustomerModalOpen(false);
      fetchCustomers();
    } catch (err) {
      alert(err.message || 'Failed to save customer');
    }
  };

  const requestDeleteCustomer = (customer) => {
    setDeleteModal({
      open: true,
      customer,
      isLoading: false
    });
  };

  const handleConfirmDeleteCustomer = async () => {
    if (!deleteModal.customer?._id) return;
    try {
      setDeleteModal((prev) => ({ ...prev, isLoading: true }));
      await adminApi.deleteCustomer(deleteModal.customer._id);
      setDeleteModal({ open: false, customer: null, isLoading: false });
      fetchCustomers();
    } catch (err) {
      setDeleteModal((prev) => ({ ...prev, isLoading: false }));
      alert(err.message || 'Failed to delete customer');
    }
  };

  // Open Sharing Modal
  const openShareModal = (customer) => {
    setSelectedCustomerForShare(customer);
    const assignedNames = (customer.assignedCategories || [])
      .map((c) => (typeof c === 'object' ? c.name : c))
      .filter(Boolean);
    setShareSelectedCategories(assignedNames);
    setShareAccessType(customer.linkShareType || customer.shareAccessType || 'Without Login');
    const targetRaw = customer.phones?.[0] || '';
    setMetaTargetPhone(formatExistingPhone(targetRaw));
    if (customer.linkShareTime) {
      setMetaScheduleTime(customer.linkShareTime);
    }
    if (customer.linkShareAfterDays !== undefined && customer.linkShareAfterDays >= 0) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + Number(customer.linkShareAfterDays));
      setMetaScheduleDate(targetDate.toISOString().slice(0, 10));
    }

    // Pre-fill generated link if customer already has an active shareToken
    const clientUrl = window.location.origin;
    if (customer.shareToken) {
      setGeneratedLink({
        id: customer._id,
        token: customer.shareToken,
        url: `${clientUrl}/shared/${customer.shareToken}`,
        accessType: customer.linkShareType || 'Without Login',
        allowedCategories: assignedNames,
        shareLinkExpiresAt: customer.shareLinkExpiresAt
      });
    } else {
      setGeneratedLink(null);
    }

    // Pre-fill categoryLinks if customer already has categoryAccess with shareToken
    if (Array.isArray(customer.categoryAccess) && customer.categoryAccess.length > 0) {
      const existingCatLinks = customer.categoryAccess
        .filter((ca) => ca && ca.shareToken)
        .map((ca) => ({
          categoryId: ca.category && typeof ca.category === 'object' ? ca.category._id : ca.category,
          categoryName: ca.categoryName || (ca.category && typeof ca.category === 'object' ? ca.category.name : ''),
          token: ca.shareToken,
          url: `${clientUrl}/shared/${ca.shareToken}`,
          shareFormat: ca.shareFormat || 'Link',
          shareTime: ca.shareTime || '10:00',
          delayDays: ca.shareAfterDays || 0,
          shareLinkExpiresAt: ca.shareLinkExpiresAt,
          kts: ca.kts || []
        }));
      setCategoryLinks(existingCatLinks);
    } else {
      setCategoryLinks([]);
    }

    setPdfResult(null);
    setMetaMessage({ text: '', type: '' });
    setMetaSelectedToken('master');
    setShareModalOpen(true);
  };

  const handleMetaLinkSelect = (tokenVal) => {
    setMetaSelectedToken(tokenVal);
    if (tokenVal !== 'master') {
      const found = categoryLinks.find((cl) => cl.token === tokenVal);
      if (found) {
        if (found.shareTime) setMetaScheduleTime(found.shareTime);
        if (found.delayDays !== undefined && found.delayDays >= 0) {
          const d = new Date();
          d.setDate(d.getDate() + Number(found.delayDays));
          setMetaScheduleDate(d.toISOString().slice(0, 10));
        }
      }
    } else {
      if (selectedCustomerForShare?.linkShareTime) {
        setMetaScheduleTime(selectedCustomerForShare.linkShareTime);
      }
    }
  };

  const copyCategoryLink = (token, url) => {
    navigator.clipboard.writeText(url);
    setCopiedCatToken(token);
    setTimeout(() => setCopiedCatToken(null), 2000);
  };

  const handleGenerateLink = async () => {
    try {
      const res = await adminApi.generateCustomerLink(selectedCustomerForShare._id, {
        accessType: shareAccessType,
        selectedCategories: shareSelectedCategories
      });
      if (res.success && res.shareLink) {
        setGeneratedLink(res.shareLink);
        if (res.categoryLinks) {
          setCategoryLinks(res.categoryLinks);
        }
        // Update customer in list & selected customer
        const updatedCategoryAccess = (selectedCustomerForShare.categoryAccess || []).map((ca) => {
          const found = res.categoryLinks?.find(
            (cl) => cl.categoryName === ca.categoryName || (ca.category && (cl.categoryId === ca.category || cl.categoryId === ca.category?._id))
          );
          return found
            ? { ...ca, shareToken: found.token, shareLinkExpiresAt: found.shareLinkExpiresAt }
            : ca;
        });
        const updatedShareInfo = {
          shareToken: res.shareLink.token,
          linkShareType: shareAccessType,
          shareLinkExpiresAt: res.shareLink.shareLinkExpiresAt,
          shareLinkCreatedAt: res.shareLink.createdAt,
          categoryAccess: updatedCategoryAccess
        };
        setCustomers((prev) =>
          prev.map((c) =>
            c._id === selectedCustomerForShare._id
              ? { ...c, ...updatedShareInfo }
              : c
          )
        );
        setSelectedCustomerForShare((prev) =>
          prev ? { ...prev, ...updatedShareInfo } : prev
        );
      }
    } catch (err) {
      alert(err.message || 'Failed to generate link');
    }
  };

  // Direct 1-Click Copy or Generate Link from Customer Row
  const handleDirectCopyCustomerLink = async (customer) => {
    const clientUrl = window.location.origin;
    if (customer.shareToken) {
      const fullUrl = `${clientUrl}/shared/${customer.shareToken}`;
      try {
        await navigator.clipboard.writeText(fullUrl);
      } catch (e) {
        copyToClipboard(fullUrl);
      }
      setCopiedCustomerId(customer._id);
      setTimeout(() => setCopiedCustomerId(null), 2500);
      return;
    }

    // If no token exists yet, automatically generate it
    try {
      setGeneratingLinkCustomerId(customer._id);
      const assignedNames = (customer.assignedCategories || [])
        .map((c) => (typeof c === 'object' ? c.name : c))
        .filter(Boolean);

      const res = await adminApi.generateCustomerLink(customer._id, {
        accessType: customer.linkShareType || 'Without Login',
        selectedCategories: assignedNames
      });

      if (res.success && res.shareLink) {
        setCustomers((prev) =>
          prev.map((c) => (c._id === customer._id ? { ...c, shareToken: res.shareLink.token } : c))
        );
        try {
          await navigator.clipboard.writeText(res.shareLink.url);
        } catch (e) {
          copyToClipboard(res.shareLink.url);
        }
        setCopiedCustomerId(customer._id);
        setTimeout(() => setCopiedCustomerId(null), 2500);
      }
    } catch (err) {
      alert(err.message || 'Failed to generate link for customer');
    } finally {
      setGeneratingLinkCustomerId(null);
    }
  };

  // Customer Catalog PDF Download Modal state
  const [customerPdfModalOpen, setCustomerPdfModalOpen] = useState(false);
  const [customerPdfTarget, setCustomerPdfTarget] = useState(null);
  const [customerPdfQuality, setCustomerPdfQuality] = useState('original'); // 'original' full quality by default!
  const [customerPdfGenerating, setCustomerPdfGenerating] = useState(false);

  const openCustomerPdfModal = (customer) => {
    const assignedNames = (customer.assignedCategories || [])
      .map((c) => (typeof c === 'object' ? c.name : c))
      .filter(Boolean);

    if (assignedNames.length === 0) {
      alert(`Customer "${customer.businessName || customer.name}" does not have any assigned categories. Please edit customer profile to assign categories first.`);
      return;
    }

    setCustomerPdfTarget(customer);
    setCustomerPdfQuality('original'); // highest/full quality by default!
    setCustomerPdfModalOpen(true);
  };

  const handleExecuteCustomerPdfDownload = async () => {
    if (!customerPdfTarget) return;

    try {
      setCustomerPdfGenerating(true);
      setDownloadingPdfCustomerId(customerPdfTarget._id);
      const res = await adminApi.generateCustomerPdf(customerPdfTarget._id, {
        quality: customerPdfQuality
      });
      
      if (res.success && res.job) {
        const url = `${API_BASE}${res.job.fileUrl}`;
        let ready = false;
        let attempts = 0;
        
        // Poll until the backend finishes generating the PDF (indicated by 200 OK)
        while (!ready && attempts < 60) {
          try {
            const check = await fetch(url, { method: 'HEAD' });
            if (check.ok) ready = true;
          } catch (e) {}
          
          if (!ready) {
            await new Promise(r => setTimeout(r, 3000));
            attempts++;
          }
        }
        
        if (ready) {
          await downloadFileFromUrl(url, res.job.fileName);
          setCustomerPdfModalOpen(false);
        } else {
          alert('PDF generation timed out or failed. Please try again.');
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to generate customer PDF');
    } finally {
      setCustomerPdfGenerating(false);
      setDownloadingPdfCustomerId(null);
    }
  };

  const handleScheduleShare = async (sendImmediately = false) => {
    if (!generatedLink && (!categoryLinks || categoryLinks.length === 0)) {
      alert('Please generate the share link first before dispatching or scheduling.');
      return;
    }
    const tokenToSend = metaSelectedToken === 'master' ? (generatedLink?.token || null) : metaSelectedToken;
    try {
      setMetaLoading(true);
      setMetaMessage({ text: '', type: '' });
      const res = await adminApi.scheduleCustomerShare(selectedCustomerForShare._id, {
        shareLinkId: generatedLink?.id || selectedCustomerForShare._id,
        shareToken: tokenToSend,
        scheduledDate: metaScheduleDate,
        scheduledTime: metaScheduleTime,
        targetPhone: metaTargetPhone,
        sendImmediately
      });
      if (res.success) {
        setMetaMessage({
          text: sendImmediately
            ? 'Message dispatched successfully via Meta WhatsApp Cloud API!'
            : `Sharing scheduled successfully for ${metaScheduleDate} at ${metaScheduleTime}`,
          type: 'success'
        });
      }
    } catch (err) {
      setMetaMessage({ text: err.message || 'Failed to schedule share', type: 'error' });
    } finally {
      setMetaLoading(false);
    }
  };

  const handleGenerateCustomerPdf = async () => {
    try {
      setPdfLoading(true);
      const res = await adminApi.generateCustomerPdf(selectedCustomerForShare._id);
      if (res.success && res.job) {
        setPdfResult(res.job);
        
        const url = `${API_BASE}${res.job.fileUrl}`;
        let ready = false;
        let attempts = 0;
        
        // Poll until the backend finishes generating the PDF (indicated by 200 OK)
        while (!ready && attempts < 60) {
          try {
            const check = await fetch(url, { method: 'HEAD' });
            if (check.ok) ready = true;
          } catch (e) {}
          
          if (!ready) {
            await new Promise(r => setTimeout(r, 3000));
            attempts++;
          }
        }

        if (ready) {
          // Automatically download PDF to user's computer!
          await downloadFileFromUrl(url, res.job.fileName);
        } else {
          alert('PDF generation timed out or failed. Please try again.');
        }
      }
    } catch (err) {
      alert(err.message || 'Failed to generate PDF');
    } finally {
      setPdfLoading(false);
    }
  };

  const copyToClipboard = (text) => {
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      // Fallback for non-HTTPS environments (like local network IP)
      const textArea = document.createElement("textarea");
      textArea.value = text;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      textArea.style.top = "-999999px";
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      try {
        document.execCommand('copy');
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error('Fallback copy failed', err);
      }
      document.body.removeChild(textArea);
    }
  };

  return (
    <div style={{ maxWidth: '100%' }}>
      {/* Executive Page Banner & Actions */}
      <div className="admin-page-header-banner" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div className="admin-banner-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#19241A', background: '#EAF2F0', border: '1px solid #9CBDB7', padding: '3px 12px', borderRadius: '9999px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#19241A' }}></span>
              Client Directory
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif, serif)', fontSize: 'clamp(1.6rem, 2.4vw, 2.2rem)', fontWeight: 700, color: '#19241A', margin: 0, letterSpacing: '-0.01em' }}>
            Customer Accounts &amp; Access
          </h1>
          <p className="admin-banner-subtitle" style={{ color: 'rgba(25, 36, 26, 0.7)', fontSize: '0.86rem', marginTop: '4px', margin: '4px 0 0 0' }}>
            Manage retail partners, assigned jewellery catalogues, login credentials, and validity schedules.
          </p>
        </div>

        {/* Action Button */}
        <div>
          <button onClick={openCreateModal} className="btn-brand">
            <Plus size={17} />
            <span>New Customer</span>
          </button>
        </div>
      </div>

      {/* Action & Filter Bar */}
      <div className="admin-action-bar" style={{ marginBottom: '20px' }}>
        <div className="admin-search-box flex-1 w-full max-w-none sm:max-w-md relative" style={{ borderRadius: '12px', border: '1.5px solid #DCE7E4' }}>
          <Search size={16} style={{ color: '#19241A', opacity: 0.6, flexShrink: 0 }} />
          <input
            type="text"
            placeholder="Search by customer name, city, phone, or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ color: '#19241A', fontWeight: 500 }}
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 p-0.5"
              title="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '0.78rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#19241A', flexShrink: 0 }}>Status:</span>
          <CustomSelect
            className="admin-select"
            style={{ minHeight: '42px', padding: '6px 14px', fontSize: '0.84rem', width: '150px', borderRadius: '12px', border: '1.5px solid #DCE7E4', color: '#19241A', fontWeight: 700, background: '#ffffff' }}
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            options={[
              { value: 'all', label: 'All Statuses' },
              { value: 'Active', label: 'Active' },
              { value: 'Inactive', label: 'Inactive' }
            ]}
          />
        </div>
      </div>

      {/* Customers Table */}
      <div className="admin-card" style={{ padding: 0, overflow: 'hidden', borderRadius: '18px', border: '1.5px solid #DCE7E4' }}>
        <div className="admin-table-wrapper" style={{ border: 0, boxShadow: 'none' }}>
          <table className="admin-table customer-table" style={{ minWidth: '1020px' }}>
            <thead>
              <tr>
                <th style={{ minWidth: '280px' }}>Customer Details</th>
                <th style={{ minWidth: '190px' }}>Contact Person</th>
                <th style={{ minWidth: '190px' }}>Assigned Portfolio</th>
                <th style={{ minWidth: '190px' }}>Access Validity Window</th>
                <th style={{ minWidth: '90px' }}>Status</th>
                <th style={{ minWidth: '90px', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'rgba(25, 36, 26, 0.65)' }}>
                    Loading customer accounts...
                  </td>
                </tr>
              ) : customers.length > 0 ? (
                customers.map((c, index) => {
                  const now = new Date();
                  const isExpired = c.accessEnd && new Date(c.accessEnd) < now;
                  const isPendingStart = c.accessStart && new Date(c.accessStart) > now;
                  const displayBusinessName = c.businessName || c.name || 'Unnamed Business';
                  const initials = displayBusinessName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() || 'CU';

                  return (
                    <tr key={c._id} className="hover:bg-[#B1D1CB]/10 transition-colors">
                      {/* Col 1: Customer Details in strictly 1 line */}
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-2.5 whitespace-nowrap">
                          <div className="customer-avatar" title={displayBusinessName}>
                            {initials}
                          </div>
                          <div className="flex items-center gap-2 whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => openViewCustomerModal(c)}
                              className="customer-name-btn"
                              title="Click to view complete customer profile"
                            >
                              {displayBusinessName}
                            </button>
                            {c.city && (
                              <span className="customer-meta-chip" title={`City: ${c.city}`}>
                                <span style={{ color: '#DCE7E4' }}>•</span>
                                <MapPin size={12} style={{ color: '#19241A', opacity: 0.6 }} className="shrink-0" />
                                <span style={{ color: 'rgba(25, 36, 26, 0.75)', fontWeight: 500 }}>{c.city}</span>
                              </span>
                            )}
                            {c.email && (
                              <span className="customer-meta-chip truncate max-w-[170px]" title={`Email: ${c.email}`}>
                                <span style={{ color: '#DCE7E4' }}>•</span>
                                <Mail size={12} style={{ color: '#19241A', opacity: 0.6 }} className="shrink-0" />
                                <span style={{ color: 'rgba(25, 36, 26, 0.75)', fontWeight: 500 }}>{c.email}</span>
                              </span>
                            )}
                            {(c.user?.username || c.plainPassword) && (
                              <span
                                onClick={() => openViewCustomerModal(c)}
                                className="customer-badge-kt cursor-pointer whitespace-nowrap flex items-center gap-1 text-[10px]"
                                title="Login credentials configured - click to inspect"
                              >
                                <KeyRound size={10} />
                                <span>Login</span>
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Col 2: Contacts & Mobile Numbers in 1 line */}
                      <td className="whitespace-nowrap">
                        {Array.isArray(c.contacts) && c.contacts.length > 0 ? (
                          <div className="flex items-center gap-1.5 whitespace-nowrap text-xs">
                            <Phone size={12} style={{ color: '#19241A' }} className="shrink-0" />
                            <span style={{ color: '#19241A', fontWeight: 700 }} className="max-w-[120px] truncate" title={c.contacts[0].name || displayBusinessName}>
                              {c.contacts[0].name || displayBusinessName}
                            </span>
                            {c.contacts[0].phone && (
                              <>
                                <span style={{ color: '#DCE7E4' }}>•</span>
                                <span style={{ color: '#19241A', fontWeight: 600, fontFamily: 'monospace' }} className="text-[11px]">{c.contacts[0].phone}</span>
                              </>
                            )}
                            {c.contacts.length > 1 && (
                              <button
                                type="button"
                                onClick={() => openViewCustomerModal(c)}
                                style={{ background: '#EAF2F0', color: '#19241A', border: '1px solid #9CBDB7', fontWeight: 700 }}
                                className="text-[10px] px-1.5 py-0.5 rounded transition-colors whitespace-nowrap"
                                title={`+${c.contacts.length - 1} more contact(s)`}
                              >
                                +{c.contacts.length - 1}
                              </button>
                            )}
                          </div>
                        ) : c.phones && c.phones.length > 0 ? (
                          <div className="flex items-center gap-1.5 whitespace-nowrap text-xs">
                            <Phone size={12} style={{ color: '#19241A' }} className="shrink-0" />
                            <span style={{ color: '#19241A', fontWeight: 600, fontFamily: 'monospace' }} className="text-[11px]">{c.phones[0]}</span>
                            {c.phones.length > 1 && (
                              <button
                                type="button"
                                onClick={() => openViewCustomerModal(c)}
                                style={{ background: '#EAF2F0', color: '#19241A', border: '1px solid #9CBDB7', fontWeight: 700 }}
                                className="text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap"
                              >
                                +{c.phones.length - 1}
                              </button>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-text-muted italic">—</span>
                        )}
                      </td>

                      {/* Col 3: Category Sharing Schedule & KT in 1 line */}
                      <td className="whitespace-nowrap">
                        {(() => {
                          const totalCats = c.categoryAccess?.length || c.assignedCategories?.length || 0;
                          if (totalCats === 0) {
                            return <span className="text-xs text-text-muted italic">None assigned</span>;
                          }

                          const allKts = [];
                          (c.categoryAccess || []).forEach((ca) => {
                            (ca.kts || []).forEach((kt) => {
                              if (!allKts.includes(kt)) allKts.push(kt);
                            });
                          });
                          const ktsDisplay = allKts.length > 0
                            ? allKts.map(formatKtLabel).join(', ')
                            : (availableKts.length > 0 ? availableKts.map(formatKtLabel).join(', ') : 'All KT');

                          return (
                            <div className="flex items-center gap-2 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => openViewCustomerModal(c)}
                                className="customer-badge-cats"
                                title="Click to view assigned categories & detailed schedules"
                              >
                                <Folder size={12} />
                                <span>{totalCats} {totalCats === 1 ? 'Category' : 'Categories'}</span>
                              </button>
                              <span className="customer-badge-kt">
                                {ktsDisplay}
                              </span>
                            </div>
                          );
                        })()}
                      </td>

                      {/* Col 4: Access Validity Window in 1 line */}
                      <td className="whitespace-nowrap">
                        <div className="flex items-center gap-2 whitespace-nowrap text-xs">
                          <span style={{ color: '#19241A', fontWeight: 600 }} className="flex items-center gap-1.5">
                            <Calendar size={12} style={{ color: '#19241A' }} />
                            <span>
                              {formatDateIST(c.accessStart, { day: 'numeric', month: 'short' })} – {formatDateIST(c.accessEnd, { day: 'numeric', month: 'short', year: 'numeric' })}
                            </span>
                          </span>
                          {isExpired ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                              Expired
                            </span>
                          ) : isPendingStart ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                              Upcoming
                            </span>
                          ) : (
                            <span style={{ background: '#EAF2F0', color: '#19241A', border: '1px solid #DCE7E4', fontWeight: 600 }} className="text-[10px] px-2.5 py-0.5 rounded-full">
                              {c.linkShareType || 'Without Login'}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Col 5: Status in 1 line */}
                      <td className="whitespace-nowrap">
                        <span
                          className={`badge-status ${
                            c.status === 'Active' && !isExpired ? 'badge-active' : 'badge-inactive'
                          }`}
                        >
                          {c.status}
                        </span>
                      </td>

                      {/* Col 6: Three-dot Actions Menu */}
                      <td className="text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => handleToggleActionMenu(e, c)}
                          className={`customer-action-dropdown-trigger ${activeActionMenuId === c._id ? 'active' : ''}`}
                          title="Actions"
                          aria-label="Actions"
                        >
                          <MoreVertical size={16} className="pointer-events-none" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} style={{ textAlign: 'center', padding: '40px', color: 'rgba(25, 36, 26, 0.65)' }}>
                    No customers found matching your filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Responsive Compact Pagination */}
        <div className="admin-pagination-bar">
          <span style={{ color: '#19241A', fontWeight: 600, fontSize: '0.84rem' }}>
            Showing {pagination.total > 0 ? (pagination.page - 1) * 10 + 1 : 0} - {Math.min(pagination.page * 10, pagination.total)} of {pagination.total} accounts
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={pagination.page <= 1}
              onClick={() => setPagination({ ...pagination, page: pagination.page - 1 })}
              className="admin-pagination-btn"
            >
              ← Previous
            </button>
            <span style={{ color: '#19241A', fontWeight: 700 }} className="text-xs px-2">
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
      </div>

      {/* Customer Create / Edit Modal */}
      {customerModalOpen && (
        <div className="admin-modal-backdrop" onClick={() => setCustomerModalOpen(false)}>
          <div className="admin-modal-card admin-modal-glass max-w-5xl w-full mx-3 sm:mx-auto" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="admin-modal-header">
              <div className="flex items-center gap-3.5 min-w-0">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-brand-primary/20 via-brand-primary/10 to-amber-500/10 border border-brand-primary/30 flex items-center justify-center text-brand-dark shrink-0 shadow-sm">
                  {isEditing ? <UserCog size={20} /> : <UserPlus size={20} />}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h3 className="admin-modal-title">
                      {isEditing ? 'Edit Customer Profile' : 'Register New Customer'}
                    </h3>
                    {isEditing && (
                      <span className={`inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${
                        formData.status === 'Active'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-stone-100 text-stone-600 border-stone-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${formData.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-stone-400'}`} />
                        {formData.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-text-muted mt-0.5 truncate">
                    {isEditing
                      ? 'Update business profile, contact representatives, collection access & sharing schedules'
                      : 'Create a new customer profile, assign jewellery collections, and configure delivery schedule'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCustomerModalOpen(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center text-text-muted hover:text-text-primary hover:bg-stone-100 transition-colors border border-transparent hover:border-stone-200 shrink-0"
                title="Close modal"
              >
                <X size={19} />
              </button>
            </div>

            <form onSubmit={handleSaveCustomer}>
              <div className="admin-modal-body space-y-4">
                {/* SECTION 1: Customer Profile & Authorized Contacts */}
                <div className="admin-customer-section-card">
                  <div className="admin-customer-section-header">
                    <div className="admin-customer-section-title-group">
                      <span className="admin-customer-section-icon">
                        <Building2 size={16} />
                      </span>
                      <div>
                        <h4 className="admin-customer-section-title">Customer Profile &amp; Contact Persons</h4>
                        <p className="admin-customer-section-desc">
                          Business identity, authorized client contacts, phone numbers, and location
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="form-row mb-3">
                    <div className="admin-form-group mb-0">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                        <Building2 size={13} className="text-brand-primary" />
                        <span>Business Name *</span>
                      </label>
                      <input
                        type="text"
                        required
                        className="admin-input text-xs"
                        placeholder="e.g. Royal Jewels Consortium"
                        value={formData.businessName || formData.name}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            businessName: e.target.value,
                            name: e.target.value
                          })
                        }
                      />
                    </div>
                    <div className="admin-form-group mb-0">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                        <Mail size={13} className="text-brand-primary" />
                        <span>Email Address (Optional)</span>
                      </label>
                      <input
                        type="email"
                        className="admin-input text-xs"
                        placeholder="client@firm.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      />
                    </div>
                  </div>

                  {/* Multiple Contacts: Contact Name + Mobile Number */}
                  <div className="admin-form-group mt-2 mb-3">
                    <div className="flex items-center justify-between mb-2.5 flex-wrap gap-2">
                      <div className="flex items-start sm:items-center gap-2.5 flex-1 min-w-0">
                        <label className="mb-0 font-semibold text-text-primary text-xs flex items-start gap-1.5 leading-tight">
                          <Phone size={13} className="text-brand-primary shrink-0 mt-0.5 sm:mt-0" />
                          <span className="break-words">Authorized Customer Contacts (Name &amp; Mobile Number)*</span>
                        </label>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-brand-tint text-brand-dark border border-border-brand shrink-0 whitespace-nowrap mt-[-2px] sm:mt-0 shadow-sm">
                          {formData.contacts.length} {formData.contacts.length === 1 ? 'Contact' : 'Contacts'}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={addContactField}
                        className="btn-sub-action text-xs flex items-center gap-1.5 py-1 px-2.5"
                        title="Add another customer contact person"
                      >
                        <Plus size={13} strokeWidth={2.4} />
                        <span>Add Contact Person</span>
                      </button>
                    </div>

                    <div className="space-y-2">
                      {formData.contacts.map((contact, idx) => (
                        <div key={idx} className="admin-contact-row">
                          <span className="admin-contact-index" title={`Contact Person (${idx + 1})`}>
                            {idx + 1}
                          </span>
                          <div className="flex-1 min-w-[170px]">
                            <input
                              type="text"
                              placeholder="Contact Person Name"
                              value={contact.name}
                              onChange={(e) => handleContactChange(idx, 'name', e.target.value)}
                              className="admin-input text-xs py-2 bg-white"
                              style={{ minHeight: '38px', height: '38px' }}
                            />
                          </div>
                          <div className="flex-[1.3] min-w-[210px]">
                            <PhoneInput
                              defaultCountry="in"
                              preferredCountries={['in', 'ae', 'us', 'gb']}
                              value={contact.phone}
                              onChange={(val) => handleContactChange(idx, 'phone', val)}
                              placeholder="Mobile Number"
                              className="admin-phone-input-compact"
                              inputClassName="admin-phone-input-field"
                              countrySelectorStyleProps={{
                                buttonClassName: 'admin-phone-country-btn',
                                dropdownStyleProps: {
                                  className: 'admin-phone-dropdown'
                                }
                              }}
                            />
                          </div>
                          {formData.contacts.length > 1 ? (
                            <button
                              type="button"
                              onClick={() => removeContactField(idx)}
                              className="p-2 text-stone-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
                              title="Remove Contact"
                            >
                              <Trash2 size={16} />
                            </button>
                          ) : (
                            <div className="w-8 shrink-0" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="form-row mb-0">
                    <div className="admin-form-group mb-0">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                        <MapPin size={13} className="text-brand-primary" />
                        <span>City / Location</span>
                      </label>
                      <input
                        type="text"
                        className="admin-input text-xs"
                        placeholder="e.g. Mumbai / Ahmedabad / Surat"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      />
                    </div>
                    <div className="admin-form-group mb-0">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                        <ShieldCheck size={13} className="text-brand-primary" />
                        <span>Customer Account Status</span>
                      </label>
                      <CustomSelect
                        className="admin-select text-xs"
                        value={formData.status}
                        onChange={(val) => setFormData({ ...formData, status: val })}
                        options={[
                          { value: 'Active', label: 'Active (Permitted to view catalogs)' },
                          { value: 'Inactive', label: 'Inactive (Access suspended)' }
                        ]}
                      />
                    </div>
                  </div>

                  {/* Customer Portal Tab Access */}
                  <div className="form-row mb-0 mt-4">
                    <div className="admin-form-group mb-0 w-full">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-text-primary mb-2">
                        <LayoutTemplate size={13} className="text-brand-primary" />
                        <span>Customer Portal Tab Access</span>
                      </label>
                      <div className="flex items-center gap-6 p-3 rounded-lg border border-border-subtle bg-[#f9fbfb]">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(formData.panelTabAccess || []).includes('ready')}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const currentAccess = formData.panelTabAccess || [];
                              const newAccess = checked 
                                ? [...currentAccess, 'ready'] 
                                : currentAccess.filter(t => t !== 'ready');
                              setFormData({ ...formData, panelTabAccess: newAccess });
                            }}
                            className="admin-checkbox"
                          />
                          <span className="text-xs font-medium text-text-primary">Ready Stock</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={(formData.panelTabAccess || []).includes('all')}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const currentAccess = formData.panelTabAccess || [];
                              const newAccess = checked 
                                ? [...currentAccess, 'all'] 
                                : currentAccess.filter(t => t !== 'all');
                              setFormData({ ...formData, panelTabAccess: newAccess });
                            }}
                            className="admin-checkbox"
                          />
                          <span className="text-xs font-medium text-text-primary">Make to Stock (All Design)</span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 2: Category Groups Access (Bulk Assignment) */}
                {categoryGroups.length > 0 && (
                  <div className="admin-customer-section-card">
                    <div className="admin-customer-section-header">
                      <div className="admin-customer-section-title-group">
                        <span className="admin-customer-section-icon">
                          <Folder size={16} />
                        </span>
                        <div>
                          <h4 className="admin-customer-section-title">Category Groups Access</h4>
                          <p className="admin-customer-section-desc">
                            Bulk-assign entire jewellery collections and configure gold purity, delivery format &amp; schedule
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="category-count-badge">
                          {categoryGroups.filter((g) => getGroupSelectionState(g).isAll).length} of {categoryGroups.length} Groups Assigned
                        </span>
                        <button
                          type="button"
                          onClick={handleSelectAllGroups}
                          className="btn-sub-action text-[11px] py-1 px-2.5"
                          title="Assign or clear all category groups"
                        >
                          {categoryGroups.every((g) => getGroupSelectionState(g).isAll) ? 'Clear All Groups' : 'Assign All Groups'}
                        </button>
                      </div>
                    </div>

                    {/* Category Groups Cards Grid */}
                    <div className="admin-group-cards-grid">
                      {categoryGroups.map((grp) => {
                        const { selectedCount, total, isAll, isPartial } = getGroupSelectionState(grp);
                        const cardClass = isAll ? 'assigned' : isPartial ? 'partial' : '';
                        const groupConfig = getGroupConfigValues(grp);

                        return (
                          <div key={grp._id} className={`admin-group-card ${cardClass}`}>
                            <div className="admin-group-card-top">
                              <div
                                className="admin-group-card-header"
                                onClick={() => handleToggleGroup(grp)}
                                title={`Click to ${isAll ? 'deselect' : 'select'} all ${grp.name} categories`}
                              >
                                <span className={`admin-category-check ${isAll ? 'checked' : ''} ${isPartial ? 'bg-amber-100 border-amber-500' : ''}`}>
                                  {isAll && <Check size={11} strokeWidth={3} />}
                                  {isPartial && <div className="w-1.5 h-1.5 rounded-full bg-amber-600" />}
                                </span>
                                <span className="admin-group-card-name">{grp.name}</span>
                              </div>

                              {/* Status Badge */}
                              {isAll ? (
                                <span className="admin-group-badge-full">
                                  <Check size={10} strokeWidth={2.5} /> All {total} Selected
                                </span>
                              ) : isPartial ? (
                                <span className="admin-group-badge-partial">
                                  ● {selectedCount}/{total} Selected
                                </span>
                              ) : (
                                <span className="admin-group-badge-none">
                                  ○ 0/{total} Selected
                                </span>
                              )}
                            </div>

                            {/* Options and settings: available while group is assigned (same as category options) */}
                            {selectedCount > 0 && (
                              <div className="admin-cat-config-panel">
                                {/* Allowed KT Gold Chips */}
                                <div className="flex items-center justify-between flex-wrap gap-1.5">
                                  <span className="text-[11px] font-semibold text-text-secondary">
                                    Allowed KT:
                                  </span>
                                  <div className="admin-kt-pills-row">
                                    {availableKts.map((purity) => {
                                      const isActive = isGroupKtActive(grp, purity);
                                      return (
                                        <button
                                          type="button"
                                          key={purity}
                                          onClick={() => handleToggleGroupKt(grp, purity)}
                                          className={`admin-kt-pill ${isActive ? 'active' : 'inactive'}`}
                                          title={`Toggle ${formatKtLabel(purity)} for all ${grp.name} categories`}
                                        >
                                          {formatKtLabel(purity)}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>

                                {/* Category Group Delivery & Schedule Config */}
                                <div className="admin-cat-timing-group pt-1">
                                  <div className="admin-timing-field">
                                    <span className="admin-timing-label">
                                      <FileDown size={10} /> Format
                                    </span>
                                    <div className="admin-segmented-toggle">
                                      <button
                                        type="button"
                                        onClick={() => handleGroupAccessPropChange(grp, 'shareFormat', 'Link')}
                                        className={`admin-segmented-btn ${groupConfig.shareFormat !== 'PDF' ? 'active' : ''}`}
                                        title={`Customer accesses all ${grp.name} categories via web link`}
                                      >
                                        <Share2 size={10} />
                                        <span>Link</span>
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleGroupAccessPropChange(grp, 'shareFormat', 'PDF')}
                                        className={`admin-segmented-btn ${groupConfig.shareFormat === 'PDF' ? 'active' : ''}`}
                                        title={`Customer accesses all ${grp.name} categories as PDF catalog`}
                                      >
                                        <FileDown size={10} />
                                        <span>PDF</span>
                                      </button>
                                    </div>
                                  </div>

                                  <div className="admin-timing-field">
                                    <span className="admin-timing-label">
                                      <Clock size={10} /> Share Time
                                    </span>
                                    <input
                                      type="time"
                                      className="admin-timing-input"
                                      value={groupConfig.shareTime || '10:00'}
                                      onChange={(e) =>
                                        handleGroupAccessPropChange(grp, 'shareTime', e.target.value)
                                      }
                                    />
                                  </div>

                                  <div className="admin-timing-field">
                                    <span className="admin-timing-label">
                                      <Calendar size={10} /> Delay (Days)
                                    </span>
                                    <input
                                      type="number"
                                      min="0"
                                      className="admin-timing-input"
                                      placeholder="0"
                                      value={groupConfig.shareAfterDays ?? 0}
                                      onChange={(e) =>
                                        handleGroupAccessPropChange(
                                          grp,
                                          'shareAfterDays',
                                          e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0)
                                        )
                                      }
                                    />
                                  </div>
                                </div>

                                {/* Live Schedule Summary Pill */}
                                <div className="flex items-center gap-2 text-[11px] font-semibold text-[#13392e] bg-[#f7fcfb] px-3 py-2 rounded-lg border border-[#c2ded8] mt-3 shadow-sm w-full">
                                  <Clock size={12} className="text-[#4a756b] shrink-0" />
                                  <span>Scheduled: <strong>{formatTimeDisplay(groupConfig.shareTime || '10:00')}</strong></span>
                                  <span className="text-stone-300">•</span>
                                  <span>via <strong>{groupConfig.shareFormat || 'Link'}</strong></span>
                                  <span className="text-stone-300">•</span>
                                  <span>{(groupConfig.shareAfterDays || 0) === 0 ? 'Day 1 (Valid 24h)' : `Expires in ${groupConfig.shareAfterDays}d`}</span>
                                </div>
                              </div>
                            )}

                            {/* Group Card Bottom Row */}
                            <div className="admin-group-bottom-row">
                              {selectedCount > 0 ? (
                                <span className="text-[10px] text-stone-500 font-medium italic">
                                  Applies to all {grp.name} categories ({selectedCount}/{total})
                                </span>
                              ) : (
                                <div className="flex items-center gap-1.5">
                                  <span className="text-[11px] font-semibold text-text-secondary">Purities:</span>
                                  <div className="admin-kt-pills-row">
                                    {availableKts.map((purity) => {
                                      const isActive = isGroupKtActive(grp, purity);
                                      return (
                                        <button
                                          type="button"
                                          key={purity}
                                          onClick={() => handleToggleGroupKt(grp, purity)}
                                          className={`admin-kt-pill ${isActive ? 'active' : 'inactive'}`}
                                          title={`Set ${formatKtLabel(purity)} for all ${grp.name} categories`}
                                        >
                                          {formatKtLabel(purity)}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedGroupTab(String(grp._id));
                                  const el = document.getElementById('individual-categories-section');
                                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                                }}
                                className="text-[11px] font-semibold text-brand-dark hover:underline flex items-center gap-1 ml-auto"
                                title={`Filter individual category list below to ${grp.name}`}
                              >
                                <span>Filter below ↓</span>
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* SECTION 3: Individual Categories, KT Access & Sharing Schedule */}
                <div id="individual-categories-section" className="admin-customer-section-card">
                  <div className="admin-customer-section-header">
                    <div className="admin-customer-section-title-group">
                      <span className="admin-customer-section-icon">
                        <Layers size={16} />
                      </span>
                      <div>
                        <h4 className="admin-customer-section-title">Individual Categories &amp; Granular Schedule</h4>
                        <p className="admin-customer-section-desc">
                          Fine-tune purity, format, and timing schedule for individual categories
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="category-count-badge">
                        {formData.categoryAccess.length} Selected
                      </span>
                      <button
                        type="button"
                        onClick={handleSelectAllCategories}
                        className="btn-sub-action text-xs"
                      >
                        {formData.categoryAccess.length === categories.length ? 'Clear All' : 'Select All'}
                      </button>
                    </div>
                  </div>

                  {/* Filter & Search Bar */}
                  <div className="flex flex-col sm:flex-row items-center gap-3 mb-4">
                    {/* Search categories input */}
                    <div className="relative flex items-center flex-1 w-full max-w-md">
                      <Search size={15} className="absolute left-3.5 text-stone-400 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Search categories by name..."
                        value={categorySearch}
                        onChange={(e) => setCategorySearch(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 text-[13px] font-medium bg-white/70 backdrop-blur-md border border-stone-200/80 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#B1D1CB]/50 focus:border-[#B1D1CB]/70 transition-all placeholder:text-stone-400 text-stone-800"
                      />
                      {categorySearch && (
                        <button
                          type="button"
                          onClick={() => setCategorySearch('')}
                          className="absolute right-2.5 p-1 rounded-md text-stone-400 hover:text-stone-600 hover:bg-stone-100 transition-colors"
                        >
                          <X size={14} />
                        </button>
                      )}
                    </div>

                    {/* Filter by Category Group dropdown */}
                    {categoryGroups.length > 0 && (
                      <div className="relative w-full sm:w-auto">
                        <CustomSelect
                          value={selectedGroupTab}
                          onChange={(val) => setSelectedGroupTab(val)}
                          className="w-full sm:w-auto appearance-none pl-3.5 pr-8 py-2 text-[13px] font-medium bg-white/70 backdrop-blur-md border border-stone-200/80 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-[#B1D1CB]/50 focus:border-[#B1D1CB]/70 transition-all text-stone-700 cursor-pointer"
                          style={{ minWidth: '180px' }}
                          options={[
                            { value: 'all', label: 'Filter by Group (All)' },
                            ...categoryGroups.map((g) => {
                              const countInGroup = categories.filter((c) =>
                                c.group ? (c.group._id || c.group) === g._id : false
                              ).length;
                              return {
                                value: g._id,
                                label: `${g.name} (${countInGroup})`
                              };
                            }),
                            ...(unassignedCategories.length > 0 ? [{ value: 'unassigned', label: `Other / Unassigned (${unassignedCategories.length})` }] : [])
                          ]}
                        />
                      </div>
                    )}
                  </div>

                  <div className="admin-categories-box">
                    {/* Active Filter Pill indicator if filtered */}
                    {selectedGroupTab !== 'all' && (
                      <div className="flex items-center justify-between p-2 mb-2 bg-brand-tint/50 rounded-lg border border-border-brand text-xs">
                        <span className="font-semibold text-text-primary text-[11px]">
                          Filtered by Group:{' '}
                          <span className="text-brand-dark font-bold">
                            {selectedGroupTab === 'unassigned' ? 'Unassigned' : categoryGroups.find((g) => String(g._id) === selectedGroupTab)?.name || ''}
                          </span>{' '}
                          ({filteredCategories.length} categories)
                        </span>
                        <button
                          type="button"
                          onClick={() => setSelectedGroupTab('all')}
                          className="text-[11px] text-brand-dark font-semibold hover:underline"
                        >
                          Show All Groups ✕
                        </button>
                      </div>
                    )}

                    <div className="admin-cat-scroll-container">
                      <div className="admin-cat-scroll-grid">
                        {filteredCategories.length > 0 ? (
                          filteredCategories.map((cat) => {
                            const accessEntry = formData.categoryAccess.find(
                              (ca) => ca.category === cat._id
                            );
                            const isAssigned = !!accessEntry;
                            const assignedKts = accessEntry?.kts || [];
                            const grp = findGroupForCategory(cat);

                            return (
                              <div
                                key={cat._id}
                                className={`admin-cat-card ${isAssigned ? 'assigned' : ''}`}
                              >
                                <div
                                  onClick={() => handleToggleCategory(cat)}
                                  className="admin-cat-header-row"
                                >
                                  <div className="flex items-center gap-2.5">
                                    <span className={`admin-category-check ${isAssigned ? 'checked' : ''}`}>
                                      {isAssigned && <Check size={11} strokeWidth={3} />}
                                    </span>
                                    <span className="font-semibold text-xs text-text-primary">
                                      {cat.name}
                                    </span>
                                  </div>
                                  {grp && (
                                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 border border-stone-200/60">
                                      {grp.name}
                                    </span>
                                  )}
                                </div>

                                {/* Granular KT & Category Share Config Panel */}
                                {isAssigned && (
                                  <div className="admin-cat-config-panel">
                                    {/* KT Purity Gold Chips */}
                                    <div className="flex items-center justify-between flex-wrap gap-1.5">
                                      <span className="text-[11px] font-semibold text-text-secondary">
                                        Allowed KT:
                                      </span>
                                      <div className="admin-kt-pills-row">
                                        {availableKts.map((ktPurity) => {
                                          const hasKt = assignedKts.includes(ktPurity);
                                          return (
                                            <button
                                              type="button"
                                              key={ktPurity}
                                              onClick={() => handleToggleKt(cat._id, ktPurity)}
                                              className={`admin-kt-pill ${hasKt ? 'active' : 'inactive'}`}
                                              title={`Toggle ${formatKtLabel(ktPurity)} for ${cat.name}`}
                                            >
                                              {formatKtLabel(ktPurity)}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </div>

                                    {/* Category-Wise Delivery & Schedule Config */}
                                    <div className="admin-cat-timing-group pt-1">
                                      <div className="admin-timing-field">
                                        <span className="admin-timing-label">
                                          <FileDown size={10} /> Format
                                        </span>
                                        <div className="admin-segmented-toggle">
                                          <button
                                            type="button"
                                            onClick={() => handleCategoryAccessPropChange(cat._id, 'shareFormat', 'Link')}
                                            className={`admin-segmented-btn ${accessEntry.shareFormat !== 'PDF' ? 'active' : ''}`}
                                            title="Customer accesses category via web link"
                                          >
                                            <Share2 size={10} />
                                            <span>Link</span>
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => handleCategoryAccessPropChange(cat._id, 'shareFormat', 'PDF')}
                                            className={`admin-segmented-btn ${accessEntry.shareFormat === 'PDF' ? 'active' : ''}`}
                                            title="Customer accesses category as PDF catalog"
                                          >
                                            <FileDown size={10} />
                                            <span>PDF</span>
                                          </button>
                                        </div>
                                      </div>

                                      <div className="admin-timing-field">
                                        <span className="admin-timing-label">
                                          <Clock size={10} /> Share Time
                                        </span>
                                        <input
                                          type="time"
                                          className="admin-timing-input"
                                          value={accessEntry.shareTime || '10:00'}
                                          onChange={(e) =>
                                            handleCategoryAccessPropChange(cat._id, 'shareTime', e.target.value)
                                          }
                                        />
                                      </div>

                                      <div className="admin-timing-field">
                                        <span className="admin-timing-label">
                                          <Calendar size={10} /> Delay (Days)
                                        </span>
                                        <input
                                          type="number"
                                          min="0"
                                          className="admin-timing-input"
                                          placeholder="0"
                                          value={accessEntry.shareAfterDays ?? 0}
                                          onChange={(e) =>
                                            handleCategoryAccessPropChange(
                                              cat._id,
                                              'shareAfterDays',
                                              e.target.value === '' ? 0 : Math.max(0, parseInt(e.target.value, 10) || 0)
                                            )
                                          }
                                        />
                                      </div>
                                    </div>

                                    {/* Live Schedule Summary Pill */}
                                    <div className="flex items-center gap-2 text-[11px] font-semibold text-[#13392e] bg-[#f7fcfb] px-3 py-2 rounded-lg border border-[#c2ded8] mt-3 shadow-sm w-full">
                                      <Clock size={12} className="text-[#4a756b] shrink-0" />
                                      <span>Scheduled: <strong>{formatTimeDisplay(accessEntry.shareTime || '10:00')}</strong></span>
                                      <span className="text-stone-300">•</span>
                                      <span>via <strong>{accessEntry.shareFormat || 'Link'}</strong></span>
                                      <span className="text-stone-300">•</span>
                                      <span>{(accessEntry.shareAfterDays || 0) === 0 ? 'Day 1 (Valid 24h)' : `Expires in ${accessEntry.shareAfterDays}d`}</span>
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-center py-6 text-xs text-text-muted col-span-full">
                            No categories found matching "{categorySearch}"
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* SECTION 4: Access Delivery Mode & Security Window */}
                <div className="admin-customer-section-card">
                  <div className="admin-customer-section-header">
                    <div className="admin-customer-section-title-group">
                      <span className="admin-customer-section-icon">
                        <Lock size={16} />
                      </span>
                      <div>
                        <h4 className="admin-customer-section-title">Delivery Access Mode &amp; Security Window</h4>
                      </div>
                    </div>
                  </div>

                  {/* Interactive Delivery Mode Radio Cards */}
                  <div className="admin-access-mode-grid">
                    <div
                      className={`admin-access-mode-card ${formData.linkShareType === 'Without Login' ? 'selected' : ''}`}
                      onClick={() => setFormData({ ...formData, linkShareType: 'Without Login' })}
                    >
                      <div className="admin-access-mode-icon">
                        <ExternalLink size={18} />
                      </div>
                      <div className="admin-access-mode-content">
                        <div className="admin-access-mode-title">
                          <span>Without Login</span>
                          {formData.linkShareType === 'Without Login' && <Check size={15} className="text-brand-dark" strokeWidth={3} />}
                        </div>
                      </div>
                    </div>

                    <div
                      className={`admin-access-mode-card ${formData.linkShareType === 'With Login' ? 'selected' : ''}`}
                      onClick={() =>
                        setFormData({
                          ...formData,
                          linkShareType: 'With Login',
                          createLoginAccount: true
                        })
                      }
                    >
                      <div className="admin-access-mode-icon">
                        <KeyRound size={18} />
                      </div>
                      <div className="admin-access-mode-content">
                        <div className="admin-access-mode-title">
                          <span>With Login</span>
                          {formData.linkShareType === 'With Login' && <Check size={15} className="text-brand-dark" strokeWidth={3} />}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Access Validity Window */}
                  <div className="form-row mb-3">
                    <div className="admin-form-group mb-0">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                        <Calendar size={13} className="text-brand-primary" />
                        <span>Access Start Date &amp; Time *</span>
                      </label>
                      <input
                        type="datetime-local"
                        required
                        className="admin-input text-xs"
                        value={formData.accessStart}
                        onChange={(e) => setFormData({ ...formData, accessStart: e.target.value })}
                      />
                    </div>
                    <div className="admin-form-group mb-0">
                      <label className="flex items-center gap-1.5 text-xs font-semibold text-text-primary">
                        <Calendar size={13} className="text-brand-primary" />
                        <span>Access End Date &amp; Time *</span>
                      </label>
                      <input
                        type="datetime-local"
                        required
                        className="admin-input text-xs"
                        value={formData.accessEnd}
                        onChange={(e) => {
                          const newEnd = e.target.value;
                          const isPast = newEnd && new Date(newEnd) <= new Date();
                          setFormData({
                            ...formData,
                            accessEnd: newEnd,
                            status: isPast ? 'Inactive' : formData.status
                          });
                        }}
                      />
                    </div>
                  </div>

                  {/* Customer Portal Account Credentials Sub-Card */}
                  <div className="admin-credentials-subcard">
                    <div className="admin-credentials-header">
                      <label className="admin-credentials-toggle">
                        <input
                          type="checkbox"
                          checked={formData.createLoginAccount || formData.linkShareType === 'With Login'}
                          onChange={(e) =>
                            setFormData({ ...formData, createLoginAccount: e.target.checked })
                          }
                          style={{ accentColor: 'var(--brand-primary)', width: '16px', height: '16px', cursor: 'pointer' }}
                        />
                        <KeyRound size={15} style={{ color: '#b45309' }} />
                        <span>{isEditing ? 'Configure Customer Login Credentials' : 'Create Customer Portal Account'}</span>
                      </label>

                      {(formData.createLoginAccount || formData.linkShareType === 'With Login') && (
                        <button
                          type="button"
                          onClick={generateRandomPassword}
                          className="admin-generate-pwd-btn"
                          title="Auto-generate a secure random password"
                        >
                          <Sparkles size={12} style={{ color: '#b45309' }} />
                          <span>Generate Password</span>
                        </button>
                      )}
                    </div>

                    {(formData.createLoginAccount || formData.linkShareType === 'With Login') && (
                      <div className="form-row mb-0 pt-1">
                        <div className="admin-form-group mb-0">
                          <label className="text-xs font-medium text-text-secondary" style={{ display: 'block', marginBottom: '4px' }}>
                            Portal Username
                          </label>
                          <input
                            type="text"
                            className="admin-input text-xs"
                            placeholder="e.g. royal_jewels"
                            value={formData.username}
                            onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                            style={{ height: '38px' }}
                          />
                        </div>
                        <div className="admin-form-group mb-0">
                          <label className="text-xs font-medium text-text-secondary" style={{ display: 'block', marginBottom: '4px' }}>
                            Portal Password
                          </label>
                          <div className="admin-password-field-wrapper">
                            <input
                              type={showFormPassword ? 'text' : 'password'}
                              className="admin-input text-xs font-mono"
                              placeholder="e.g. SG@9824"
                              value={formData.password}
                              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                              style={{ height: '38px' }}
                            />
                            <button
                              type="button"
                              onClick={() => setShowFormPassword(!showFormPassword)}
                              className="admin-password-toggle-btn"
                              title={showFormPassword ? 'Hide password' : 'Show password'}
                              tabIndex={-1}
                              aria-label={showFormPassword ? 'Hide password' : 'Show password'}
                            >
                              {showFormPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                            </button>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Internal Admin Notes */}
                  {/* <div className="mt-3.5">
                    <label className="text-xs font-semibold text-text-secondary block mb-1">
                      Internal Admin Notes (Optional)
                    </label>
                    <textarea
                      rows={2}
                      className="admin-input text-xs resize-none"
                      placeholder="Private notes about this client (preferences, special gold rates, branch info)..."
                      value={formData.notes || ''}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    />
                  </div> */}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="admin-modal-footer flex items-center justify-between">
                <div className="text-[11px] text-text-muted flex flex-wrap items-center justify-center sm:justify-start gap-1.5 sm:gap-2.5 w-full sm:w-auto mt-1 sm:mt-0">
                  <span className="font-bold text-text-primary">
                    {formData.categoryAccess.length}
                  </span>
                  <span className="whitespace-nowrap">categories assigned</span>
                  <span className="text-stone-300 hidden sm:inline-block">•</span>
                  <span className="font-bold text-text-primary ml-1 sm:ml-0">
                    {formData.contacts.filter((c) => c && c.phone).length}
                  </span>
                  <span className="whitespace-nowrap">valid phone(s)</span>
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={() => setCustomerModalOpen(false)}
                    className="btn-outline-brand text-xs px-4 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn-brand text-xs px-5 py-2 flex items-center gap-1.5 shadow-sm"
                  >
                    <Check size={14} strokeWidth={2.5} />
                    <span>{isEditing ? 'Save Changes' : 'Register Customer'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Link & Meta API Scheduling Modal */}
      {shareModalOpen && selectedCustomerForShare && (
        <div className="admin-modal-backdrop" onClick={() => setShareModalOpen(false)}>
          <div className="admin-share-modal-dialog" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="admin-share-modal-header">
              <div className="admin-share-header-left">
                <div className="admin-share-icon-halo">
                  <Share2 size={22} strokeWidth={2.2} />
                </div>
                <div className="admin-share-header-title-box">
                  <h3 className="admin-share-header-title">Share Portfolio &amp; Meta WhatsApp</h3>
                  <span className="admin-share-header-subpill">
                    Client: <strong>{selectedCustomerForShare.name}</strong>
                    {selectedCustomerForShare.city ? ` • ${selectedCustomerForShare.city}` : ''}
                  </span>
                </div>
              </div>
              <div className="admin-share-header-actions">
                {/* Customer Catalog PDF Utility */}
                <button
                  type="button"
                  disabled={pdfLoading}
                  onClick={handleGenerateCustomerPdf}
                  className="admin-share-btn-pdf-util"
                  title="Generate & Download Customer Catalog PDF"
                >
                  {pdfLoading ? (
                    <>
                      <RefreshCw size={12} className="animate-spin" />
                      <span>Generating...</span>
                    </>
                  ) : (
                    <>
                      <FileDown size={13} />
                      <span>Catalog PDF</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShareModalOpen(false)}
                  className="admin-share-modal-close-btn"
                  title="Close modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="admin-share-modal-body">
              {/* Section 1: Portfolio Link & Access Controls */}
              <div className="admin-share-section">
                <div className="admin-share-section-head">
                  <h4 className="admin-share-section-title">
                    <KeyRound size={15} className="text-brand-dark" />
                    <span>1. Access Controls &amp; Categories</span>
                  </h4>
                  <span className="text-[11px] text-text-muted font-medium">
                    {shareAccessType === 'With Login' ? 'Requires Credentials' : 'Direct Token Access'}
                  </span>
                </div>

                {/* Access Mode Segmented Buttons */}
                <div className="admin-share-segmented">
                  <button
                    type="button"
                    onClick={() => setShareAccessType('Without Login')}
                    className={`admin-share-segment-btn ${shareAccessType === 'Without Login' ? 'active' : ''}`}
                  >
                    Direct Link (No Login)
                  </button>
                  <button
                    type="button"
                    onClick={() => setShareAccessType('With Login')}
                    className={`admin-share-segment-btn ${shareAccessType === 'With Login' ? 'active' : ''}`}
                  >
                    Protected (Requires Login)
                  </button>
                </div>

                {/* Credentials box if With Login */}
                {shareAccessType === 'With Login' && (
                  <div className="admin-share-credentials-box">
                    <div className="admin-share-credentials-item">
                      <span className="admin-share-credentials-label">Portal Username</span>
                      <span className="admin-share-credentials-val">
                        {selectedCustomerForShare.user?.username || 'No user created'}
                      </span>
                    </div>
                    <div className="admin-share-credentials-item">
                      <span className="admin-share-credentials-label">Portal Password</span>
                      <span className="admin-share-credentials-val">
                        {selectedCustomerForShare.plainPassword || selectedCustomerForShare.user?.plainPassword || 'Client@2026'}
                      </span>
                    </div>
                  </div>
                )}

                {/* Category Multi-Select */}
                <div className="admin-share-categories-box">
                  <div className="admin-share-categories-label-row">
                    <span>Included Assigned Categories:</span>
                    <span className="font-semibold text-text-primary">
                      {shareSelectedCategories.length} of {(selectedCustomerForShare.assignedCategories || []).length} Selected
                    </span>
                  </div>

                  <div className="admin-share-categories-pills">
                    {selectedCustomerForShare.assignedCategories && selectedCustomerForShare.assignedCategories.length > 0 ? (
                      selectedCustomerForShare.assignedCategories.filter(Boolean).map((cat) => {
                        const catName = typeof cat === 'object' && cat.name ? cat.name : (cat.name || cat);
                        const isSelected = shareSelectedCategories.includes(catName);
                        const accessEntry = (selectedCustomerForShare.categoryAccess || []).find((ca) => {
                          const n = ca.categoryName || (ca.category && ca.category.name);
                          return n === catName || (typeof cat === 'object' && String(ca.category) === String(cat._id));
                        });
                        const timeStr = accessEntry?.shareTime || selectedCustomerForShare.linkShareTime || '10:00';
                        const formatStr = accessEntry?.shareFormat || selectedCustomerForShare.shareFormat || 'Link';
                        const delayDays = accessEntry?.shareAfterDays ?? (selectedCustomerForShare.linkShareAfterDays || 0);

                        return (
                          <button
                            type="button"
                            key={catName}
                            onClick={() => {
                              if (isSelected) {
                                setShareSelectedCategories(shareSelectedCategories.filter((n) => n !== catName));
                              } else {
                                setShareSelectedCategories([...shareSelectedCategories, catName]);
                              }
                            }}
                            className={`admin-share-cat-chip ${isSelected ? 'selected' : ''}`}
                            title={`Will be shared via ${formatStr} at ${formatTimeDisplay(timeStr)}${delayDays > 0 ? ` (+${delayDays}d)` : ''}`}
                          >
                            {isSelected && <Check size={11} strokeWidth={3} />}
                            <span className="font-semibold">{catName}</span>
                            <span className="text-[10px] opacity-75 font-normal ml-0.5">
                              • {formatStr} @ {formatTimeDisplay(timeStr)}{delayDays > 0 ? ` (+${delayDays}d)` : ''}
                            </span>
                          </button>
                        );
                      })
                    ) : (
                      <span className="text-xs text-amber-800 bg-amber-50 p-2 rounded border border-amber-200">
                        No categories assigned to this customer.
                      </span>
                    )}
                  </div>
                </div>

                {/* Active Generated Link Card or Generate Action */}
                {generatedLink ? (
                  <div className="admin-share-link-card">
                    <div className="admin-share-link-top">
                      <span className="admin-share-link-pill-active">
                        <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--text-primary)', display: 'inline-block' }} />
                        Master Portfolio Link (All Categories)
                      </span>
                      <button
                        type="button"
                        onClick={handleGenerateLink}
                        className="text-[11px] text-brand-dark hover:underline font-semibold"
                      >
                        Update / Regenerate All Links
                      </button>
                    </div>
                    <div className="admin-share-link-input-row">
                      <input
                        type="text"
                        readOnly
                        className="admin-share-link-url-input"
                        value={generatedLink.url}
                      />
                      <button
                        type="button"
                        onClick={() => copyToClipboard(generatedLink.url)}
                        className="admin-share-btn-copy"
                        title="Copy Master Portfolio URL"
                      >
                        {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                        <span>{copied ? 'Copied!' : 'Copy'}</span>
                      </button>
                      <a
                        href={generatedLink.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="admin-share-btn-open"
                        title="Open Master Portfolio Preview"
                      >
                        <ExternalLink size={15} />
                      </a>
                    </div>
                    {(generatedLink?.shareLinkExpiresAt || selectedCustomerForShare?.shareLinkExpiresAt) && (
                      <div className="flex items-center gap-1.5 text-[11px] text-amber-800 bg-amber-50 px-2.5 py-1.5 rounded-md border border-amber-200/80 mt-2">
                        <Clock size={12} className="text-amber-600 shrink-0" />
                        <span>
                          Master Link validity: <strong>Until {new Date(generatedLink?.shareLinkExpiresAt || selectedCustomerForShare?.shareLinkExpiresAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleGenerateLink}
                    className="btn-brand text-xs w-full py-2.5 justify-center font-semibold"
                  >
                    <span>Generate Share Links</span>
                  </button>
                )}

                {/* Category-Wise Separate Share Links */}
                {categoryLinks && categoryLinks.length > 0 && (
                  <div className="mt-4 pt-3 border-t border-border/80">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <Layers size={14} className="text-brand-dark" />
                        <span className="text-xs font-bold text-text-primary uppercase tracking-wide">
                          Category-Wise Separate Share Links ({categoryLinks.length})
                        </span>
                      </div>
                      <span className="text-[10px] text-text-muted font-medium">
                        Independent URL &amp; Expiry per Category
                      </span>
                    </div>

                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {categoryLinks.map((cl, idx) => {
                        const isExpired = cl.shareLinkExpiresAt && new Date(cl.shareLinkExpiresAt) < new Date();
                        const isCopied = copiedCatToken === cl.token;

                        return (
                          <div
                            key={cl.token || idx}
                            className={`p-2.5 rounded-lg border text-xs transition-all ${
                              isExpired
                                ? 'bg-red-50/50 border-red-200'
                                : 'bg-slate-50/70 border-border hover:border-brand-primary/60 shadow-xs'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 mb-1.5 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-text-primary text-[12px]">
                                  {cl.categoryName}
                                </span>
                                {cl.kts && cl.kts.length > 0 && (
                                  <span className="text-[10px] bg-amber-100/70 text-amber-800 border border-amber-300/60 px-1.5 py-0.2 rounded font-medium">
                                    {cl.kts.join(', ')}
                                  </span>
                                )}
                              </div>

                              <div className="flex items-center gap-1.5 text-[10px]">
                                <span className="bg-white text-slate-700 px-2 py-0.5 rounded border border-slate-200 font-medium">
                                  {cl.delayDays === 0 ? 'Immediate (24h)' : `Day ${cl.delayDays}`} @ {cl.shareTime || '10:00'}
                                </span>

                                {cl.shareLinkExpiresAt ? (
                                  <span
                                    className={`px-2 py-0.5 rounded border font-semibold flex items-center gap-1 ${
                                      isExpired
                                        ? 'bg-red-100 text-red-700 border-red-300'
                                        : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    }`}
                                  >
                                    <Clock size={10} />
                                    {isExpired
                                      ? 'Expired'
                                      : `Valid until: ${new Date(cl.shareLinkExpiresAt).toLocaleString('en-IN', {
                                          day: 'numeric',
                                          month: 'short',
                                          hour: '2-digit',
                                          minute: '2-digit'
                                        })}`}
                                  </span>
                                ) : (
                                  <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded">
                                    Active
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="admin-share-link-input-row">
                              <input
                                type="text"
                                readOnly
                                className="admin-share-link-url-input !py-1 !text-[11px]"
                                value={cl.url}
                              />
                              <button
                                type="button"
                                onClick={() => copyCategoryLink(cl.token, cl.url)}
                                className="admin-share-btn-copy !py-1 !px-2.5 !text-[11px]"
                                title={`Copy ${cl.categoryName} Link`}
                              >
                                {isCopied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                                <span>{isCopied ? 'Copied!' : 'Copy'}</span>
                              </button>
                              <a
                                href={cl.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="admin-share-btn-open !p-1.5"
                                title={`Open ${cl.categoryName} Preview`}
                              >
                                <ExternalLink size={13} />
                              </a>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 2: Meta WhatsApp Automated Dispatch */}
              <div className="admin-share-section">
                <div className="admin-share-section-head">
                  <h4 className="admin-share-section-title">
                    <Send size={15} className="text-emerald-600" />
                    <span>2. Meta WhatsApp Dispatch</span>
                  </h4>
                  <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 font-semibold">
                    Official Meta API
                  </span>
                </div>

                {/* Link Selector for WhatsApp Dispatch */}
                {categoryLinks && categoryLinks.length > 0 && (
                  <div>
                    <label className="text-xs font-semibold text-text-primary mb-1.5 flex items-center justify-between">
                      <span>Select Link to Dispatch</span>
                      <span className="text-[10px] text-text-muted">
                        {metaSelectedToken === 'master'
                          ? 'Full Portfolio Link'
                          : `${categoryLinks.find((c) => c.token === metaSelectedToken)?.categoryName || 'Category'} Only`}
                      </span>
                    </label>
                    <CustomSelect
                      className="admin-input text-xs font-medium"
                      value={metaSelectedToken}
                      onChange={(val) => handleMetaLinkSelect(val)}
                      options={[
                        { value: 'master', label: '🌐 Master Portfolio Link (All Assigned Categories)' },
                        ...categoryLinks.map((cl) => ({
                          value: cl.token,
                          label: `📁 ${cl.categoryName} Only (${cl.kts?.join(', ') || 'All KTs'}) - Valid until: ${cl.shareLinkExpiresAt ? formatDateIST(cl.shareLinkExpiresAt, { day: 'numeric', month: 'short' }) : 'Active'}`
                        }))
                      ]}
                    />
                  </div>
                )}

                {/* Recipient Phone Selector */}
                <div>
                  <label className="text-xs font-semibold text-text-primary mb-1.5 block">
                    Recipient WhatsApp Number
                  </label>

                  {/* Phone quick-select pills */}
                  {selectedCustomerForShare?.phones && selectedCustomerForShare.phones.length > 0 && (
                    <div className="admin-share-phone-pills">
                      {selectedCustomerForShare.phones.map((p, idx) => {
                        const cleanP = (p || '').replace(/[^0-9]/g, '');
                        const cleanCurrent = (metaTargetPhone || '').replace(/[^0-9]/g, '');
                        const isSelected =
                          cleanCurrent.length >= 10 &&
                          cleanP.length >= 10 &&
                          cleanCurrent.slice(-10) === cleanP.slice(-10);

                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => setMetaTargetPhone(formatExistingPhone(p))}
                            className={`admin-share-phone-pill ${isSelected ? 'selected' : ''}`}
                          >
                            <Phone size={11} />
                            <span>{p}</span>
                            {isSelected && <Check size={11} strokeWidth={3} />}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  <PhoneInput
                    defaultCountry="in"
                    preferredCountries={['in', 'ae', 'us', 'gb']}
                    value={metaTargetPhone}
                    onChange={(val) => setMetaTargetPhone(val)}
                    placeholder="Recipient WhatsApp number"
                    className="admin-phone-input-root"
                    inputClassName="admin-phone-input-field text-xs"
                    countrySelectorStyleProps={{
                      buttonClassName: 'admin-phone-country-btn',
                      dropdownStyleProps: {
                        className: 'admin-phone-dropdown'
                      }
                    }}
                  />
                </div>

                {/* Scheduled Date & Time Controls */}
                <div className="admin-share-timing-grid">
                  <div>
                    <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                      Dispatch Date
                    </label>
                    <input
                      type="date"
                      className="admin-input text-xs"
                      value={metaScheduleDate}
                      onChange={(e) => setMetaScheduleDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-text-secondary block mb-1">
                      Dispatch Time
                    </label>
                    <input
                      type="time"
                      className="admin-input text-xs"
                      value={metaScheduleTime}
                      onChange={(e) => setMetaScheduleTime(e.target.value)}
                    />
                  </div>
                </div>

                {/* Dual Dispatch Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={metaLoading || !generatedLink}
                    onClick={() => handleScheduleShare(true)}
                    className="admin-share-btn-whatsapp-send"
                    title="Send instantly via Meta WhatsApp API"
                  >
                    {metaLoading ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Sending WhatsApp...</span>
                      </>
                    ) : (
                      <>
                        <Send size={14} />
                        <span>Send WhatsApp Now</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={metaLoading || !generatedLink}
                    onClick={() => handleScheduleShare(false)}
                    className="admin-share-btn-whatsapp-schedule"
                    title="Schedule dispatch for background worker"
                  >
                    <Clock size={14} />
                    <span>Schedule WhatsApp</span>
                  </button>
                </div>

                {/* Feedback Message */}
                {metaMessage.text && (
                  <div
                    className={`p-2.5 rounded-lg text-xs font-medium ${
                      metaMessage.type === 'success'
                        ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                        : 'bg-red-50 text-red-900 border border-red-200'
                    }`}
                  >
                    {metaMessage.text}
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="admin-share-modal-footer">
              <span className="text-[11px] text-text-muted">
                Portfolio links update dynamically based on assigned customer categories.
              </span>
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="btn-outline-brand text-xs py-1.5 px-4 rounded-lg font-semibold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Details View Modal */}
      {viewCustomerModalOpen && viewingCustomer && (
        <div className="admin-modal-backdrop" onClick={() => setViewCustomerModalOpen(false)}>
          <div
            className="customer-modal-card"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 1. Luxury Modal Header */}
            <div className="customer-modal-header">
              <div className="customer-modal-header-left">

                <div className="customer-modal-header-info">
                  <div className="customer-modal-title-row">
                    <h3 className="customer-modal-title">
                      {viewingCustomer.businessName || viewingCustomer.name}
                    </h3>
                    <button
                      type="button"
                      onClick={() => copyViewField(viewingCustomer.businessName || viewingCustomer.name, 'bname')}
                      className="customer-modal-copy-btn"
                      title="Copy Business Name"
                    >
                      {viewCopiedField === 'bname' ? <Check size={13} className="text-emerald-700" /> : <Copy size={13} />}
                    </button>
                  </div>

                  <div className="customer-modal-meta-row">
                    {viewingCustomer.city && (
                      <span className="customer-modal-meta-pill">
                        <MapPin size={11} className="text-emerald-800 flex-shrink-0" />
                        <span>{viewingCustomer.city}</span>
                      </span>
                    )}
                    {viewingCustomer.email && (
                      <span className="customer-modal-meta-pill">
                        <Mail size={11} className="text-emerald-800 flex-shrink-0" />
                        <span>{viewingCustomer.email}</span>
                      </span>
                    )}
                    <span className="customer-modal-meta-pill mono">
                      <KeyRound size={11} className="text-emerald-800 flex-shrink-0" />
                      <span>Mode: {viewingCustomer.linkShareType || 'Without Login'}</span>
                    </span>
                  </div>
                </div>
              </div>

              <div className="customer-modal-header-right">
                <div
                  className={`customer-modal-status-badge ${
                    viewingCustomer.status === 'Active' &&
                    !(viewingCustomer.accessEnd && new Date(viewingCustomer.accessEnd) < new Date())
                      ? 'active'
                      : 'inactive'
                  }`}
                >
                  <span className="customer-modal-status-dot" />
                  <span>
                    {viewingCustomer.status === 'Active' &&
                    !(viewingCustomer.accessEnd && new Date(viewingCustomer.accessEnd) < new Date())
                      ? 'Active'
                      : 'Inactive'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => setViewCustomerModalOpen(false)}
                  className="customer-modal-close-btn"
                  title="Close Modal"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* 2. Modal Body */}
            <div className="customer-modal-body">
              {/* Row 1: KPI Stats Grid */}
              <div className="customer-modal-kpi-grid">
                <div className="customer-modal-kpi-card">
                  <div className="customer-modal-kpi-top">
                    <span className="customer-modal-kpi-label">PORTFOLIO ACCESS</span>
                    <div className="customer-modal-kpi-icon-wrap">
                      <Folder size={13} />
                    </div>
                  </div>
                  <div className="customer-modal-kpi-val">
                    {viewingCustomer.categoryAccess?.length || viewingCustomer.assignedCategories?.length || 0} Categories
                  </div>
                  <div className="customer-modal-kpi-sub">
                    <Sparkles size={11} className="text-[#8D5B08]" />
                    <span>{viewingCustomer.shareFormat || 'Link'} Delivery</span>
                  </div>
                </div>

                <div className="customer-modal-kpi-card">
                  <div className="customer-modal-kpi-top">
                    <span className="customer-modal-kpi-label">AUTHENTICATION</span>
                    <div className="customer-modal-kpi-icon-wrap">
                      <ShieldCheck size={13} />
                    </div>
                  </div>
                  <div className="customer-modal-kpi-val">
                    {viewingCustomer.linkShareType || 'Without Login'}
                  </div>
                  <div className="customer-modal-kpi-sub">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 inline-block"></span>
                    <span>{viewingCustomer.user ? 'Account Linked' : 'Guest Token Mode'}</span>
                  </div>
                </div>

                <div className="customer-modal-kpi-card">
                  <div className="customer-modal-kpi-top">
                    <span className="customer-modal-kpi-label">ACCESS VALIDITY</span>
                    <div className="customer-modal-kpi-icon-wrap">
                      <Calendar size={13} />
                    </div>
                  </div>
                  <div className="customer-modal-kpi-val">
                    {(() => {
                      const now = new Date();
                      const isExp = viewingCustomer.accessEnd && new Date(viewingCustomer.accessEnd) < now;
                      const isPend = viewingCustomer.accessStart && new Date(viewingCustomer.accessStart) > now;
                      if (isExp) return <span className="text-rose-600">Expired</span>;
                      if (isPend) return <span className="text-amber-600">Pending Start</span>;
                      return <span className="text-emerald-700">Active Window</span>;
                    })()}
                  </div>
                  <div className="customer-modal-kpi-sub">
                    <span>
                      Till {formatDateIST(viewingCustomer.accessEnd, { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                </div>

                <div className="customer-modal-kpi-card">
                  <div className="customer-modal-kpi-top">
                    <span className="customer-modal-kpi-label">SHARING SCHEDULE</span>
                    <div className="customer-modal-kpi-icon-wrap">
                      <Clock size={13} />
                    </div>
                  </div>
                  <div className="customer-modal-kpi-val">
                    {formatTimeDisplay(viewingCustomer.linkShareTime || '10:00')}
                  </div>
                  <div className="customer-modal-kpi-sub">
                    <span>{viewingCustomer.linkShareAfterDays ? `+${viewingCustomer.linkShareAfterDays} days offset` : 'Day 1 immediate'}</span>
                  </div>
                </div>
              </div>

              {/* Row 2: Contacts & Account Credentials Grid */}
              <div className="customer-modal-split-grid">
                {/* Contact Persons Card */}
                <div className="customer-modal-section-card">
                  <div className="customer-modal-section-header">
                    <div className="customer-modal-section-title">
                      <div className="customer-modal-section-title-icon">
                        <Phone size={13} />
                      </div>
                      <span>Contact Persons &amp; Mobile</span>
                    </div>
                    <span className="customer-modal-section-badge">
                      {(viewingCustomer.contacts?.length || viewingCustomer.phones?.length || 0)} Total
                    </span>
                  </div>

                  <div className="customer-modal-section-body">
                    <div className="customer-contact-list">
                      {Array.isArray(viewingCustomer.contacts) && viewingCustomer.contacts.length > 0 ? (
                        viewingCustomer.contacts.map((ct, idx) => {
                          const cleanPhone = (ct.phone || '').replace(/\D/g, '');
                          const initials = (ct.name || viewingCustomer.businessName || 'CP')
                            .split(' ')
                            .filter(Boolean)
                            .slice(0, 2)
                            .map((w) => w[0].toUpperCase())
                            .join('') || 'CP';

                          return (
                            <div key={idx} className="customer-contact-card">
                              <div className="customer-contact-left">
                                <div className="customer-contact-avatar">
                                  {initials}
                                </div>
                                <div className="customer-contact-info">
                                  <div className="customer-contact-name" title={ct.name || viewingCustomer.businessName}>
                                    {ct.name || viewingCustomer.businessName || `Contact Person ${idx + 1}`}
                                  </div>
                                  <div className="customer-contact-phone-row">
                                    <span className="customer-contact-phone">
                                      {ct.phone || '—'}
                                    </span>
                                    {cleanPhone && (
                                      <button
                                        type="button"
                                        onClick={() => copyViewField(ct.phone, `phone_${idx}`)}
                                        className="customer-contact-copy-btn"
                                        title="Copy phone"
                                      >
                                        {viewCopiedField === `phone_${idx}` ? (
                                          <Check size={11} className="text-emerald-700" />
                                        ) : (
                                          <Copy size={11} />
                                        )}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : viewingCustomer.phones && viewingCustomer.phones.length > 0 ? (
                        viewingCustomer.phones.map((phone, idx) => {
                          return (
                            <div key={idx} className="customer-contact-card">
                              <div className="customer-contact-left">
                                <div className="customer-contact-avatar">
                                  #{idx + 1}
                                </div>
                                <div className="customer-contact-info">
                                  <div className="customer-contact-name">
                                    {viewingCustomer.businessName || `Contact ${idx + 1}`}
                                  </div>
                                  <div className="customer-contact-phone-row">
                                    <span className="customer-contact-phone">{phone}</span>
                                    <button
                                      type="button"
                                      onClick={() => copyViewField(phone, `phone_${idx}`)}
                                      className="customer-contact-copy-btn"
                                      title="Copy phone"
                                    >
                                      {viewCopiedField === `phone_${idx}` ? (
                                        <Check size={11} className="text-emerald-700" />
                                      ) : (
                                        <Copy size={11} />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-xs italic py-4 text-center text-stone-400">No contact persons recorded</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Portal Access & Security Credentials Card */}
                <div className="customer-modal-section-card">
                  <div className="customer-modal-section-header">
                    <div className="customer-modal-section-title">
                      <div className="customer-modal-section-title-icon">
                        <KeyRound size={13} />
                      </div>
                      <span>Portfolio Link &amp; Credentials</span>
                    </div>
                    <span className="customer-modal-section-badge">
                      {viewingCustomer.linkShareType || 'Without Login'}
                    </span>
                  </div>

                  <div className="customer-modal-section-body">
                    <div className="customer-link-container">
                      {/* Share Link Box */}
                      <div>
                        <div className="mb-1.5">
                          <span className="customer-link-label">
                            PORTFOLIO ACCESS LINK
                          </span>
                        </div>
                        <div className="customer-token-bar">
                          <div className="customer-token-icon-badge">
                            <Link2 size={13} />
                          </div>
                          <input
                            type="text"
                            readOnly
                            value={
                              viewingCustomer.shareToken
                                ? `${window.location.origin}/shared/${viewingCustomer.shareToken}`
                                : 'No link token generated yet'
                            }
                            className="customer-token-input"
                          />
                          {viewingCustomer.shareToken && (
                            <button
                              type="button"
                              onClick={() =>
                                copyViewField(
                                  `${window.location.origin}/shared/${viewingCustomer.shareToken}`,
                                  'tokenUrl'
                                )
                              }
                              className="customer-token-copy-btn"
                              title="Copy link"
                            >
                              {viewCopiedField === 'tokenUrl' ? (
                                <>
                                  <Check size={12} className="text-emerald-300" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy size={12} />
                                  <span>Copy Link</span>
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Direct Mode Banner vs Credentials */}
                      {viewingCustomer.linkShareType === 'Without Login' && !showCredsInDirectMode ? (
                        <div className="customer-direct-access-banner">
                          <div className="customer-direct-access-left">
                            <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-800 flex-shrink-0">
                              <Zap size={13} />
                            </div>
                            <div>
                              <span className="customer-direct-access-title">Instant Token Access Active</span>
                              <span className="customer-direct-access-desc">Customer enters catalog directly via secure link without entering password.</span>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => setShowCredsInDirectMode(true)}
                            className="customer-direct-toggle-btn"
                          >
                            View Credentials
                          </button>
                        </div>
                      ) : (
                        <div>
                          {viewingCustomer.linkShareType === 'Without Login' && (
                            <div className="flex justify-between items-center mb-1.5 px-0.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-[#6b8c85]">
                                Internal Account Credentials
                              </span>
                              <button
                                type="button"
                                onClick={() => setShowCredsInDirectMode(false)}
                                className="text-[10px] font-bold text-emerald-800 hover:underline cursor-pointer"
                              >
                                Hide
                              </button>
                            </div>
                          )}
                          <div className="customer-creds-grid">
                            <div className="customer-cred-tile">
                              <div className="customer-cred-header">
                                <span className="customer-cred-label">Username</span>
                                <User size={11} className="text-[#6b8c85]" />
                              </div>
                              <div className="customer-cred-val-row">
                                <span className="customer-cred-code">
                                  {viewingCustomer.user?.username || '—'}
                                </span>
                                {viewingCustomer.user?.username && (
                                  <button
                                    type="button"
                                    onClick={() => copyViewField(viewingCustomer.user.username, 'uname')}
                                    className="customer-contact-copy-btn"
                                    title="Copy username"
                                  >
                                    {viewCopiedField === 'uname' ? (
                                      <Check size={11} className="text-emerald-700" />
                                    ) : (
                                      <Copy size={11} />
                                    )}
                                  </button>
                                )}
                              </div>
                            </div>

                            <div className="customer-cred-tile">
                              <div className="customer-cred-header">
                                <span className="customer-cred-label">Password</span>
                                <Lock size={11} className="text-[#6b8c85]" />
                              </div>
                              <div className="customer-cred-val-row">
                                <span className="customer-cred-code">
                                  {viewingCustomer.plainPassword || viewingCustomer.user?.plainPassword
                                    ? showViewPassword
                                      ? viewingCustomer.plainPassword || viewingCustomer.user?.plainPassword
                                      : '••••••••'
                                    : '—'}
                                </span>
                                <div className="flex items-center gap-0.5">
                                  {(viewingCustomer.plainPassword || viewingCustomer.user?.plainPassword) && (
                                    <button
                                      type="button"
                                      onClick={() => setShowViewPassword(!showViewPassword)}
                                      className="customer-contact-copy-btn"
                                      title={showViewPassword ? 'Hide password' : 'Show password'}
                                    >
                                      {showViewPassword ? <Eye size={11} /> : <EyeOff size={11} />}
                                    </button>
                                  )}
                                  {(viewingCustomer.plainPassword || viewingCustomer.user?.plainPassword) && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        copyViewField(
                                          viewingCustomer.plainPassword || viewingCustomer.user?.plainPassword,
                                          'pwd'
                                        )
                                      }
                                      className="customer-contact-copy-btn"
                                      title="Copy password"
                                    >
                                      {viewCopiedField === 'pwd' ? (
                                        <Check size={11} className="text-emerald-700" />
                                      ) : (
                                        <Copy size={11} />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 3: Granular Category Sharing Schedule & KT Access */}
              <div className="customer-modal-section-card">
                <div className="customer-table-header-bar">
                  <div className="customer-modal-section-title">
                    <div className="customer-modal-section-title-icon">
                      <Folder size={13} />
                    </div>
                    <span>Assigned Categories &amp; Sharing Schedules</span>
                  </div>

                  <div className="flex items-center gap-2">
                    {Array.isArray(viewingCustomer.categoryAccess) && viewingCustomer.categoryAccess.length > 2 && (
                      <div className="customer-table-search-box">
                        <Search size={12} className="text-[#6b8c85]" />
                        <input
                          type="text"
                          value={viewCategorySearch}
                          onChange={(e) => setViewCategorySearch(e.target.value)}
                          placeholder="Filter categories..."
                          className="customer-table-search-input"
                        />
                      </div>
                    )}
                    <span className="customer-modal-section-badge">
                      {viewingCustomer.categoryAccess?.length || viewingCustomer.assignedCategories?.length || 0} Total Categories
                    </span>
                  </div>
                </div>

                {Array.isArray(viewingCustomer.categoryAccess) && viewingCustomer.categoryAccess.length > 0 ? (
                  <div className="customer-modal-table-wrap">
                    <table className="customer-modal-table">
                      <thead>
                        <tr>
                          <th style={{ width: '42px', textAlign: 'center' }}>#</th>
                          <th>Category Name</th>
                          <th>Purity (KT)</th>
                          <th>Schedule Time</th>
                          <th>Release Delay</th>
                          <th style={{ textAlign: 'right' }}>Format</th>
                        </tr>
                      </thead>
                      <tbody>
                        {viewingCustomer.categoryAccess
                          .filter((ca) => {
                            if (!viewCategorySearch.trim()) return true;
                            const term = viewCategorySearch.toLowerCase();
                            const catName = (ca.categoryName || ca.category?.name || '').toLowerCase();
                            const grpName = (ca.groupName || ca.group?.name || '').toLowerCase();
                            return catName.includes(term) || grpName.includes(term);
                          })
                          .map((ca, idx) => {
                            const catName = ca.categoryName || (ca.category && ca.category.name) || 'Category';
                            const grpName = ca.groupName || (ca.group && ca.group.name) || '';
                            const ktsList = Array.isArray(ca.kts) && ca.kts.length > 0
                              ? ca.kts
                              : (availableKts.length > 0 ? availableKts : []);
                            const timeFormatted = formatTimeDisplay(ca.shareTime || viewingCustomer.linkShareTime || '10:00');
                            const formatType = ca.shareFormat || viewingCustomer.shareFormat || 'Link';
                            const daysDelay = Number(ca.shareAfterDays ?? (viewingCustomer.linkShareAfterDays || 0));

                            let projectedDate = '';
                            if (viewingCustomer.accessStart) {
                              const d = new Date(viewingCustomer.accessStart);
                              d.setDate(d.getDate() + daysDelay);
                              if (!isNaN(d.getTime())) {
                                projectedDate = formatDateIST(d, { day: 'numeric', month: 'short' });
                              }
                            }

                            return (
                              <tr key={idx}>
                                <td style={{ textAlign: 'center' }}>
                                  <span className="customer-table-index-badge">
                                    {String(idx + 1).padStart(2, '0')}
                                  </span>
                                </td>
                                <td>
                                  <div className="customer-table-cat-title">
                                    <Sparkles size={12} className="text-[#C5A059] flex-shrink-0" />
                                    <span>{catName}</span>
                                  </div>
                                  {grpName && grpName !== '—' && (
                                    <span className="text-[10px] text-[#6b8c85] font-medium block ml-4">
                                      {grpName}
                                    </span>
                                  )}
                                </td>
                                <td>
                                  <div className="flex items-center gap-1 flex-wrap">
                                    {ktsList.map((kt) => (
                                      <span key={kt} className="customer-modal-kt-badge">
                                        {kt}
                                      </span>
                                    ))}
                                  </div>
                                </td>
                                <td>
                                  <span className="customer-table-time-chip">
                                    <Clock size={11} className="text-[#4a756b]" />
                                    <span>{timeFormatted}</span>
                                  </span>
                                </td>
                                <td>
                                  {daysDelay === 0 ? (
                                    <span className="customer-delay-immediate">Day 1 (Immediate)</span>
                                  ) : (
                                    <div>
                                      <span className="customer-delay-badge">+{daysDelay} Days</span>
                                      {projectedDate && (
                                        <span className="customer-delay-date">({projectedDate})</span>
                                      )}
                                    </div>
                                  )}
                                </td>
                                <td style={{ textAlign: 'right' }}>
                                  <span className={`customer-format-pill ${formatType === 'PDF' ? 'pdf' : 'link'}`}>
                                    {formatType === 'PDF' ? <FileDown size={11} /> : <Share2 size={11} />}
                                    <span>{formatType}</span>
                                  </span>
                                </td>
                              </tr>
                            );
                          })}
                      </tbody>
                    </table>
                  </div>
                ) : viewingCustomer.assignedCategories && viewingCustomer.assignedCategories.length > 0 ? (
                  <div className="p-4 flex flex-wrap gap-2">
                    {viewingCustomer.assignedCategories.map((c) => (
                      <span
                        key={c._id || c}
                        className="text-xs px-2.5 py-1 rounded-md font-semibold border"
                        style={{ backgroundColor: '#eef5f4', color: '#13392e', borderColor: '#B1D1CB' }}
                      >
                        {c.name || c}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs italic py-4 text-center text-stone-400">No categories assigned to this customer yet.</p>
                )}
              </div>

              {/* Row 4: Notes (if present) */}
              {viewingCustomer.notes && (
                <div className="p-3.5 rounded-xl border flex items-start gap-2.5" style={{ backgroundColor: '#fffbeb', borderColor: '#fde68a' }}>
                  <MessageSquare size={16} className="text-amber-700 flex-shrink-0 mt-0.5" />
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-widest block mb-1 text-amber-900">
                      INTERNAL NOTES / REMARKS
                    </span>
                    <p className="text-xs leading-relaxed whitespace-pre-wrap m-0 text-amber-950 font-medium">
                      {viewingCustomer.notes}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Modal Footer */}
            <div className="customer-modal-footer">
              <span className="customer-modal-footer-meta">
                <Clock size={12} className="text-[#6b8c85]" />
                <span>
                  Created on {formatDateIST(viewingCustomer.createdAt || Date.now(), { day: 'numeric', month: 'short', year: 'numeric' })} • SG Admin
                </span>
              </span>
              <div className="customer-modal-footer-actions">
                <button
                  type="button"
                  onClick={() => setViewCustomerModalOpen(false)}
                  className="customer-modal-close-action-btn"
                >
                  Close
                </button>
                {/* {viewingCustomer.shareToken && (
                  <a
                    href={`${window.location.origin}/shared/${viewingCustomer.shareToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="customer-modal-open-portal-btn"
                  >
                    <ExternalLink size={14} />
                    <span>Open Portfolio</span>
                  </a>
                )} */}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Customer Confirmation Modal */}
      <AdminConfirmModal
        isOpen={deleteModal.open}
        onClose={() => {
          if (!deleteModal.isLoading) {
            setDeleteModal({ open: false, customer: null, isLoading: false });
          }
        }}
        onConfirm={handleConfirmDeleteCustomer}
        isLoading={deleteModal.isLoading}
        title="Delete Customer Account"
        subtitle="Customer Directory"
        description="Are you sure you want to deactivate and remove this customer account? This will permanently wipe access."
        itemName={deleteModal.customer?.name}
        details={
          deleteModal.customer && (
            <>
              <div className="admin-delete-details-row">
                <span className="admin-delete-details-label">Customer Firm:</span>
                <span className="admin-delete-details-value">{deleteModal.customer.name}</span>
              </div>
              {deleteModal.customer.phones && deleteModal.customer.phones.length > 0 && (
                <div className="admin-delete-details-row">
                  <span className="admin-delete-details-label">Mobile Number(s):</span>
                  <span className="admin-delete-details-value">{deleteModal.customer.phones.join(', ')}</span>
                </div>
              )}
              {deleteModal.customer.city && (
                <div className="admin-delete-details-row">
                  <span className="admin-delete-details-label">Location:</span>
                  <span className="admin-delete-details-value">{deleteModal.customer.city}</span>
                </div>
              )}
            </>
          )
        }
        warning="All active customer links, catalog permissions, and login access will be immediately revoked and cannot be restored."
        confirmText="Delete Customer"
        cancelText="Cancel"
      />

      {/* Customer Catalog PDF Download with Quality Selection Modal */}
      {customerPdfModalOpen && customerPdfTarget && (
        <div className="admin-modal-backdrop" onClick={() => !customerPdfGenerating && setCustomerPdfModalOpen(false)}>
          <div className="admin-modal-card pdf-modal-card" onClick={(e) => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="pdf-modal-header">
              <div className="pdf-modal-header-main">
                <div className="pdf-modal-icon-badge">
                  <FileDown size={22} />
                </div>
                <div>
                  <h3 className="pdf-modal-title">Download Product Catalog</h3>
                </div>
              </div>
              <button
                type="button"
                disabled={customerPdfGenerating}
                onClick={() => setCustomerPdfModalOpen(false)}
                className="pdf-modal-close-btn"
                title="Close modal"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="pdf-modal-body">
              {/* Customer summary card */}
              <div className="pdf-customer-banner">
                <div className="pdf-customer-avatar">
                  {((customerPdfTarget.businessName || customerPdfTarget.name || 'SG')
                    .split(' ')
                    .filter(Boolean)
                    .slice(0, 2)
                    .map(w => w[0].toUpperCase())
                    .join('')) || 'SG'}
                </div>
                <div className="pdf-customer-info">
                  <span className="pdf-customer-tagline">Target Customer</span>
                  <div className="pdf-customer-name">
                    {customerPdfTarget.businessName || customerPdfTarget.name}
                  </div>
                  <div className="pdf-customer-meta">
                    {customerPdfTarget.city && (
                      <span className="flex items-center gap-1">
                        <MapPin size={11} className="text-brand-dark" />
                        {customerPdfTarget.city} •
                      </span>
                    )}
                    <span>
                      {customerPdfTarget.assignedCategories?.length || 0} Assigned Categories
                    </span>
                  </div>
                </div>
                <div>
                  <span className="pdf-customer-status-pill">
                    <span className="pdf-customer-status-dot" />
                    {customerPdfTarget.status || 'Active'}
                  </span>
                </div>
              </div>

              {/* Quality Selection Options */}
              <div>
                <label className="pdf-quality-section-label">
                  <span>Select Download Quality</span>
                </label>
                <div className="pdf-quality-cards-stack">
                  {/* 1. Original / Full Quality (Default) */}
                  <div
                    onClick={() => !customerPdfGenerating && setCustomerPdfQuality('original')}
                    className={`pdf-quality-card ${customerPdfQuality === 'original' ? 'selected' : ''}`}
                  >
                    <div className="pdf-quality-card-head">
                      <div className="pdf-quality-card-left">
                        <div className="pdf-radio-ring">
                          <div className="pdf-radio-dot" />
                        </div>
                        <span className="pdf-quality-card-title">Original / Full Quality</span>
                      </div>
                    </div>
                  </div>

                  {/* 2. Print Quality (600 DPI) */}
                  <div
                    onClick={() => !customerPdfGenerating && setCustomerPdfQuality('print')}
                    className={`pdf-quality-card ${customerPdfQuality === 'print' ? 'selected' : ''}`}
                  >
                    <div className="pdf-quality-card-head">
                      <div className="pdf-quality-card-left">
                        <div className="pdf-radio-ring">
                          <div className="pdf-radio-dot" />
                        </div>
                        <span className="pdf-quality-card-title">Print Quality (600 DPI)</span>
                      </div>
                    </div>
                  </div>

                  {/* 3. High (300 DPI) */}
                  <div
                    onClick={() => !customerPdfGenerating && setCustomerPdfQuality('high')}
                    className={`pdf-quality-card ${customerPdfQuality === 'high' ? 'selected' : ''}`}
                  >
                    <div className="pdf-quality-card-head">
                      <div className="pdf-quality-card-left">
                        <div className="pdf-radio-ring">
                          <div className="pdf-radio-dot" />
                        </div>
                        <span className="pdf-quality-card-title">High (300 DPI)</span>
                      </div>
                    </div>
                  </div>

                  {/* 4. Medium (150 DPI) */}
                  <div
                    onClick={() => !customerPdfGenerating && setCustomerPdfQuality('medium')}
                    className={`pdf-quality-card ${customerPdfQuality === 'medium' ? 'selected' : ''}`}
                  >
                    <div className="pdf-quality-card-head">
                      <div className="pdf-quality-card-left">
                        <div className="pdf-radio-ring">
                          <div className="pdf-radio-dot" />
                        </div>
                        <span className="pdf-quality-card-title">Medium (150 DPI)</span>
                      </div>
                    </div>
                  </div>

                  {/* 5. Low (72 DPI) */}
                  <div
                    onClick={() => !customerPdfGenerating && setCustomerPdfQuality('low')}
                    className={`pdf-quality-card ${customerPdfQuality === 'low' ? 'selected' : ''}`}
                  >
                    <div className="pdf-quality-card-head">
                      <div className="pdf-quality-card-left">
                        <div className="pdf-radio-ring">
                          <div className="pdf-radio-dot" />
                        </div>
                        <span className="pdf-quality-card-title">Low (72 DPI)</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pdf-modal-footer">
              <div className="pdf-modal-actions">
                <button
                  type="button"
                  disabled={customerPdfGenerating}
                  onClick={() => setCustomerPdfModalOpen(false)}
                  className="btn-outline-brand text-xs"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={customerPdfGenerating}
                  onClick={handleExecuteCustomerPdfDownload}
                  className="btn-brand text-xs py-2.5 px-5 flex items-center gap-2 font-semibold shadow-sm"
                >
                  {customerPdfGenerating ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>
                        Generating PDF ({
                          customerPdfQuality === 'original' ? 'Full Quality' :
                          customerPdfQuality === 'print' ? '600 DPI' :
                          customerPdfQuality === 'high' ? '300 DPI' :
                          customerPdfQuality === 'medium' ? '150 DPI' : '72 DPI'
                        })...
                      </span>
                    </>
                  ) : (
                    <>
                      <FileDown size={15} />
                      <span>Download PDF</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Portaled 3-Dot Actions Menu */}
      {activeActionMenuId && menuTargetCustomer && createPortal(
        <div
          ref={actionMenuRef}
          className="customer-action-menu"
          style={{
            position: 'fixed',
            top: menuPosition.top !== undefined ? `${menuPosition.top}px` : undefined,
            bottom: menuPosition.bottom !== undefined ? `${menuPosition.bottom}px` : undefined,
            right: `${menuPosition.right}px`,
            zIndex: 99999,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* 1. View Customer Details */}
          <button
            type="button"
            onClick={() => {
              const c = menuTargetCustomer;
              setActiveActionMenuId(null);
              setMenuTargetCustomer(null);
              openViewCustomerModal(c);
            }}
            className="customer-action-menu-item"
          >
            <Eye size={15} className="text-brand-dark shrink-0" />
            <span>View Details</span>
          </button>

          {/* 2. Share Portfolio & WhatsApp Schedule */}
          {/* <button
            type="button"
            onClick={() => {
              const c = menuTargetCustomer;
              setActiveActionMenuId(null);
              setMenuTargetCustomer(null);
              openShareModal(c);
            }}
            className="customer-action-menu-item"
          >
            <Share2 size={15} className="text-brand-dark shrink-0" />
            <span>Share Portfolio</span>
          </button>  */}

          {/* 3. 1-Click Copy or Generate Link */}
          <button
            type="button"
            onClick={() => {
              handleDirectCopyCustomerLink(menuTargetCustomer);
            }}
            disabled={generatingLinkCustomerId === menuTargetCustomer._id}
            className="customer-action-menu-item"
          >
            {copiedCustomerId === menuTargetCustomer._id ? (
              <Check size={15} className="text-emerald-600 stroke-[2.5] shrink-0" />
            ) : generatingLinkCustomerId === menuTargetCustomer._id ? (
              <RefreshCw size={15} className="animate-spin text-brand-primary shrink-0" />
            ) : (
              <Copy size={15} className="text-stone-600 shrink-0" />
            )}
            <span>
              {copiedCustomerId === menuTargetCustomer._id
                ? 'Link Copied!'
                : generatingLinkCustomerId === menuTargetCustomer._id
                ? 'Generating Link...'
                : 'Copy Link'}
            </span>
          </button>

          {/* 4. Customer Catalog PDF Download with Quality Options */}
          <button
            type="button"
            onClick={() => {
              const c = menuTargetCustomer;
              setActiveActionMenuId(null);
              setMenuTargetCustomer(null);
              openCustomerPdfModal(c);
            }}
            disabled={downloadingPdfCustomerId === menuTargetCustomer._id}
            className="customer-action-menu-item"
          >
            {downloadingPdfCustomerId === menuTargetCustomer._id ? (
              <RefreshCw size={15} className="animate-spin text-amber-600 shrink-0" />
            ) : (
              <FileDown size={15} className="text-amber-700 shrink-0" />
            )}
            <span>
              {downloadingPdfCustomerId === menuTargetCustomer._id ? 'Preparing PDF...' : 'Download PDF'}
            </span>
          </button>

          <div className="customer-action-menu-divider" />

          {/* 5. Edit Customer */}
          <button
            type="button"
            onClick={() => {
              const c = menuTargetCustomer;
              setActiveActionMenuId(null);
              setMenuTargetCustomer(null);
              openEditModal(c);
            }}
            className="customer-action-menu-item"
          >
            <Edit2 size={15} className="text-stone-600 shrink-0" />
            <span>Edit Customer</span>
          </button>

          {/* 6. Delete Customer */}
          <button
            type="button"
            onClick={() => {
              const c = menuTargetCustomer;
              setActiveActionMenuId(null);
              setMenuTargetCustomer(null);
              requestDeleteCustomer(c);
            }}
            className="customer-action-menu-item danger"
          >
            <Trash2 size={15} className="text-red-500 shrink-0" />
            <span>Delete Customer</span>
          </button>
        </div>,
        document.body
      )}
    </div>
  );
};

export default CustomersManagement;
