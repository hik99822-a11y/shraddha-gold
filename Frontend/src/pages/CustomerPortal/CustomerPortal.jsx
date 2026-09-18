import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useNavigate, Link, useSearchParams, useParams } from 'react-router-dom';
import {
  ShieldCheck,
  Calendar,
  Clock,
  LogOut,
  Layers,
  Eye,
  EyeOff,
  AlertCircle,
  Gem,
  CheckCircle2,
  X,
  User,
  KeyRound,
  Lock,
  ChevronDown,
  ShoppingBag,
  Plus,
  Minus,
  Check,
  Search,
  Copy,
  Sparkles,
  RotateCcw,
  Filter,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  Mail,
  Phone,
  Building2,
  Shield,
  Menu,
  LayoutGrid,
  MapPin,
  Users,
  Trash2
} from 'lucide-react';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';
import { customerApi, authApi, sharedApi } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import CartDrawer from '../../components/Cart/CartDrawer';
import CheckoutModal from '../../components/Cart/CheckoutModal';
import './CustomerPortal.css';
import '../../components/Cart/CartDrawer.css';
import {
  getStylePurity,
  getStyleItem,
  getStyleItemCode,
  getStyleDisplayCode,
  formatItemLabel,
  formatKtLabel,
  extractUniqueItemsFromStyles,
  extractUniqueKtsFromStyles,
  resolveStyleImages,
  getPrimaryImageUrl
} from '../../utils/ktUtils.js';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5000';

/**
 * Dynamic Excel stock value extractors
 */
export const getRealNetWeight = (style) => {
  if (!style) return 0;
  const row = style.rawData || {};
  const rawVal = row.Wt !== undefined && row.Wt !== '' ? row.Wt : (row['Net Wt'] || row.NetWt || style.netWeight);
  const n = parseFloat(String(rawVal).replace(/[^0-9.]/g, ''));
  return !isNaN(n) ? n : (Number(style.netWeight) || 0);
};

export const getRealGrossWeight = (style) => {
  if (!style) return 0;
  const row = style.rawData || {};
  const rawVal = row.GrossWt !== undefined && row.GrossWt !== '' ? row.GrossWt : style.grossWeight;
  const n = parseFloat(String(rawVal).replace(/[^0-9.]/g, ''));
  return !isNaN(n) ? n : (Number(style.grossWeight) || 0);
};

export const getRealPureWeight = (style) => {
  if (!style) return null;
  const row = style.rawData || {};
  if (row.PureWt !== undefined && row.PureWt !== '' && row.PureWt !== null) {
    const n = parseFloat(String(row.PureWt).replace(/[^0-9.]/g, ''));
    if (!isNaN(n) && n > 0) return n;
  }
  return null;
};

export { getStylePurity, getStyleItemCode, getStyleDisplayCode };

/**
 * Available stock quantity extractor
 */
export const getRealQty = (style) => {
  if (!style) return 0;
  if (style.qty !== undefined && style.qty !== null) {
    return Math.max(0, Number(style.qty) || 0);
  }
  const row = style.rawData || {};
  const rawVal = row.Qty !== undefined && row.Qty !== '' ? row.Qty : (row.Quantity || row.Stock || row.Pcs || 0);
  const n = parseInt(String(rawVal).replace(/[^0-9]/g, ''), 10);
  return !isNaN(n) ? Math.max(0, n) : 0;
};

const ImageCarousel = ({ imagesForKt, styleCode, currentKt, categoryName, setPreviewImage }) => {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    setActiveIndex(0);
  }, [styleCode, currentKt]);

  if (!imagesForKt || imagesForKt.length === 0) {
    return (
      <div className="portal-card-atelier-placeholder w-full h-full flex flex-col items-center justify-center">
        <div className="portal-atelier-medallion">
          <Gem size={26} className="portal-atelier-icon" />
        </div>
        <div className="portal-atelier-text-group text-center">
          <div className="portal-atelier-brand">Shraddha Gold</div>
          <div className="portal-atelier-spec">{currentKt}</div>
        </div>
      </div>
    );
  }

  const activeImgUrl = imagesForKt[activeIndex]?.url ? `${API_BASE}${imagesForKt[activeIndex].url}` : null;

  const handlePrev = (e) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev === 0 ? imagesForKt.length - 1 : prev - 1));
  };

  const handleNext = (e) => {
    e.stopPropagation();
    setActiveIndex((prev) => (prev === imagesForKt.length - 1 ? 0 : prev + 1));
  };

  return (
    <div 
      className="cursor-pointer w-full h-full relative group"
      onClick={() => {
        if (activeImgUrl) {
          setPreviewImage({
            url: activeImgUrl,
            images: imagesForKt.map(img => img.url ? `${API_BASE}${img.url}` : null).filter(Boolean),
            currentIndex: activeIndex,
            title: `${styleCode} (${currentKt}) • ${categoryName}`
          });
        }
      }}
      title="Click to enlarge photo"
    >
      {activeImgUrl && (
        <img src={activeImgUrl} alt={styleCode} loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
      )}
      <div className="portal-card-quick-view-btn" title="Quick View High-Res">
        <Eye size={13} />
      </div>

      {imagesForKt.length > 1 && (
        <>
          <button 
            onClick={handlePrev}
            style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', backgroundColor: 'rgba(255,255,255,0.85)', color: '#000', borderRadius: '50%', padding: '8px', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.3)', border: 'none', cursor: 'pointer' }}
            title="Previous image"
          >
            <ChevronLeft size={24} strokeWidth={2.5} />
          </button>
          <button 
            onClick={handleNext}
            style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', backgroundColor: 'rgba(255,255,255,0.85)', color: '#000', borderRadius: '50%', padding: '8px', zIndex: 50, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 10px rgba(0,0,0,0.3)', border: 'none', cursor: 'pointer' }}
            title="Next image"
          >
            <ChevronRight size={24} strokeWidth={2.5} />
          </button>
          <div style={{ position: 'absolute', bottom: 8, left: '50%', transform: 'translateX(-50%)', display: 'flex', gap: '5px', zIndex: 10 }}>
            {imagesForKt.map((_, dotIdx) => (
              <div key={dotIdx} style={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: activeIndex === dotIdx ? '#fff' : 'rgba(255,255,255,0.5)', transition: 'background-color 0.2s' }} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

/**
 * Bespoke Vector Jewelry Silhouette for Luxury CAD Blueprints
 */
const JewelrySilhouette = ({ categoryName }) => {
  const cat = (categoryName || '').toUpperCase();
  if (cat.includes('BRACELET') || cat.includes('BANGLE') || cat.includes('KADA')) {
    return (
      <svg viewBox="0 0 160 120" className="w-24 h-24 text-gold-accent opacity-90" fill="none" stroke="currentColor">
        <ellipse cx="80" cy="60" rx="55" ry="34" strokeWidth="2" strokeDasharray="3 3" stroke="#c5a059" opacity="0.4" />
        <ellipse cx="80" cy="60" rx="50" ry="28" strokeWidth="2.5" stroke="#dfc888" />
        <circle cx="42" cy="60" r="4" fill="#c5a059" />
        <circle cx="80" cy="32" r="5" fill="#dfc888" />
        <circle cx="118" cy="60" r="4" fill="#c5a059" />
        <circle cx="80" cy="88" r="5" fill="#dfc888" />
        <polygon points="80,24 86,32 80,40 74,32" fill="#d4af37" />
        <polygon points="80,80 86,88 80,96 74,88" fill="#d4af37" />
      </svg>
    );
  }
  if (cat.includes('PENDANT') || cat.includes('MS PENDANT') || cat.includes('MANGALSUTRA')) {
    return (
      <svg viewBox="0 0 160 120" className="w-24 h-24 text-gold-accent opacity-90" fill="none" stroke="currentColor">
        <path d="M80 14 L80 32" stroke="#dfc888" strokeWidth="2" />
        <circle cx="80" cy="32" r="4" fill="#c5a059" />
        <path d="M80 36 C58 48, 48 68, 80 94 C112 68, 102 48, 80 36 Z" stroke="#dfc888" strokeWidth="2" fill="rgba(197, 160, 89, 0.12)" />
        <circle cx="80" cy="64" r="10" stroke="#c5a059" strokeWidth="1.5" />
        <polygon points="80,57 86,64 80,71 74,64" fill="#d4af37" />
        <circle cx="80" cy="102" r="3.5" fill="#dfc888" />
      </svg>
    );
  }
  if (cat.includes('NECKLACE') || cat.includes('SET') || cat.includes('CHOKER') || cat.includes('HAAR')) {
    return (
      <svg viewBox="0 0 160 120" className="w-24 h-24 text-gold-accent opacity-90" fill="none" stroke="currentColor">
        <path d="M30 30 C50 78, 110 78, 130 30" stroke="#dfc888" strokeWidth="2.2" fill="none" />
        <path d="M40 40 C60 86, 100 86, 120 40" stroke="#c5a059" strokeWidth="1.5" strokeDasharray="4 2" fill="none" />
        <circle cx="80" cy="85" r="6" fill="#d4af37" />
        <polygon points="80,91 84,98 80,105 76,98" fill="#dfc888" />
        <circle cx="65" cy="78" r="4" fill="#c5a059" />
        <circle cx="95" cy="78" r="4" fill="#c5a059" />
        <circle cx="52" cy="66" r="3.5" fill="#dfc888" />
        <circle cx="108" cy="66" r="3.5" fill="#dfc888" />
      </svg>
    );
  }
  if (cat.includes('RING')) {
    return (
      <svg viewBox="0 0 160 120" className="w-24 h-24 text-gold-accent opacity-90" fill="none" stroke="currentColor">
        <ellipse cx="80" cy="75" rx="36" ry="24" stroke="#dfc888" strokeWidth="3" fill="none" />
        <ellipse cx="80" cy="75" rx="30" ry="18" stroke="#c5a059" strokeWidth="1.5" strokeDasharray="3 2" fill="none" />
        <polygon points="80,30 92,45 80,60 68,45" stroke="#dfc888" strokeWidth="2" fill="rgba(212, 175, 55, 0.15)" />
        <polygon points="80,35 88,45 80,55 72,45" fill="#d4af37" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 160 120" className="w-24 h-24 text-gold-accent opacity-90" fill="none" stroke="currentColor">
      <polygon points="50,45 70,25 90,25 110,45 80,95" stroke="#dfc888" strokeWidth="2" fill="rgba(197, 160, 89, 0.12)" />
      <line x1="50" y1="45" x2="110" y2="45" stroke="#c5a059" strokeWidth="1.5" />
      <line x1="70" y1="25" x2="80" y2="95" stroke="#c5a059" strokeWidth="1.5" />
      <line x1="90" y1="25" x2="80" y2="95" stroke="#c5a059" strokeWidth="1.5" />
      <line x1="70" y1="45" x2="80" y2="25" stroke="#dfc888" strokeWidth="1" />
      <line x1="90" y1="45" x2="80" y2="25" stroke="#dfc888" strokeWidth="1" />
    </svg>
  );
};

const CustomerPortal = ({ isSharedLink = false }) => {
  const { logout, user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { section: routeSection, token: routeToken } = useParams();

  const token = routeToken;
  const isShared = isSharedLink || Boolean(token);

  const getInitialSection = () => {
    if (routeSection === 'make-to-stock' || routeSection === 'all') return 'all';
    if (routeSection === 'ready-stock' || routeSection === 'ready') return 'ready';
    const tabParam = searchParams.get('tab');
    if (tabParam === 'make-to-stock' || tabParam === 'all') return 'all';
    return 'ready';
  };

  const [stockSection, setStockSection] = useState(getInitialSection);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSectionChange = (section) => {
    setStockSection(section);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (section === 'all') {
        next.set('tab', 'make-to-stock');
      } else {
        next.delete('tab');
      }
      return next;
    }, { replace: true });
  };

  useEffect(() => {
    if (routeSection === 'make-to-stock' || routeSection === 'all') {
      if (stockSection !== 'all') setStockSection('all');
    } else if (routeSection === 'ready-stock' || routeSection === 'ready') {
      if (stockSection !== 'ready') setStockSection('ready');
    } else {
      const tab = searchParams.get('tab');
      if (tab === 'make-to-stock' || tab === 'all') {
        if (stockSection !== 'all') setStockSection('all');
      } else if (tab === 'ready-stock' || tab === 'ready' || !tab) {
        if (stockSection !== 'ready') setStockSection('ready');
      }
    }
  }, [routeSection, searchParams]);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const getSavedGridCols = (sec) => {
    try {
      const saved = localStorage.getItem(`sg_portal_grid_cols_${sec}`);
      const n = parseInt(saved, 10);
      if ([2, 3, 4, 5].includes(n)) return n;
      const general = parseInt(localStorage.getItem('sg_portal_grid_cols'), 10);
      return [2, 3, 4, 5].includes(general) ? general : 4;
    } catch {
      return 4;
    }
  };

  // Independent Filter states: Category Group, Category, KT Purity, Search, and Cards/Row for Ready Stock vs All Design
  const [sectionFilters, setSectionFilters] = useState({
    ready: { categoryGroup: 'All', category: 'All', kt: 'All', search: '', cols: getSavedGridCols('ready') },
    all: { categoryGroup: 'All', category: 'All', kt: 'All', search: '', cols: getSavedGridCols('all') }
  });

  const activeSectionKey = stockSection === 'ready' ? 'ready' : 'all';
  const currentFilters = sectionFilters[activeSectionKey] || sectionFilters.ready;
  const selectedCategoryGroup = currentFilters.categoryGroup;
  const selectedCategory = currentFilters.category;
  const selectedKt = currentFilters.kt;
  const searchQuery = currentFilters.search;
  const gridColumns = currentFilters.cols || 4;

  const setSelectedCategoryGroup = (val) => {
    setSectionFilters((prev) => {
      const nextGroup = typeof val === 'function' ? val(prev[activeSectionKey].categoryGroup) : val;
      return {
        ...prev,
        [activeSectionKey]: {
          ...prev[activeSectionKey],
          categoryGroup: nextGroup,
          category: 'All'
        }
      };
    });
  };

  const setSelectedCategory = (val) => {
    setSectionFilters((prev) => ({
      ...prev,
      [activeSectionKey]: {
        ...prev[activeSectionKey],
        category: typeof val === 'function' ? val(prev[activeSectionKey].category) : val
      }
    }));
  };

  const setSelectedKt = (val) => {
    setSectionFilters((prev) => ({
      ...prev,
      [activeSectionKey]: {
        ...prev[activeSectionKey],
        kt: typeof val === 'function' ? val(prev[activeSectionKey].kt) : val
      }
    }));
  };

  const setSearchQuery = (val) => {
    setSectionFilters((prev) => ({
      ...prev,
      [activeSectionKey]: {
        ...prev[activeSectionKey],
        search: typeof val === 'function' ? val(prev[activeSectionKey].search) : val
      }
    }));
  };

  const handleGridColsChange = (cols) => {
    setSectionFilters((prev) => ({
      ...prev,
      [activeSectionKey]: {
        ...prev[activeSectionKey],
        cols
      }
    }));
    try {
      localStorage.setItem(`sg_portal_grid_cols_${activeSectionKey}`, String(cols));
    } catch {}
  };

  const handleResetFilters = () => {
    setSectionFilters((prev) => ({
      ...prev,
      [activeSectionKey]: {
        ...prev[activeSectionKey],
        categoryGroup: 'All',
        category: 'All',
        kt: 'All',
        search: ''
      }
    }));
  };

  const [activeKtMap, setActiveKtMap] = useState({}); // styleCode -> dynamic KT
  const [previewImage, setPreviewImage] = useState(null);
  const [copiedCode, setCopiedCode] = useState(null);

  // Cart State for Customer Portal / Shared Link
  const portalCartKey = isShared && token
    ? `sg_cart_${token}`
    : `sg_portal_cart_${user?._id || 'guest'}`;
  const [cart, setCart] = useState(() => {
    try {
      const saved = localStorage.getItem(portalCartKey);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  // Re-read cart if portalCartKey changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(portalCartKey);
      setCart(saved ? JSON.parse(saved) : []);
    } catch {
      setCart([]);
    }
  }, [portalCartKey]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [orderToast, setOrderToast] = useState(null);
  const [stockAlert, setStockAlert] = useState('');

  // Auto-dismiss order success toast after 7 seconds
  useEffect(() => {
    if (orderToast) {
      const timer = setTimeout(() => {
        setOrderToast(null);
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [orderToast]);

  // Save cart to local storage
  useEffect(() => {
    try {
      localStorage.setItem(portalCartKey, JSON.stringify(cart));
    } catch (err) {
      console.error('Failed to save cart:', err);
    }
  }, [cart, portalCartKey]);

  // Handle Cart Operations
  const getCartQuantity = (style) => {
    const found = cart.find(
      (i) =>
        (i.styleId && style._id && String(i.styleId) === String(style._id)) ||
        (i.styleCode === style.styleCode && (i.item || i.kt) === (style.item || getStylePurity(style)))
    );
    return found ? found.quantity : 0;
  };

  const handleAddToCart = (style) => {
    const availableStock = getRealQty(style);
    const displayCode = getStyleDisplayCode(style);
    const purity = getStylePurity(style);
    const isMakeStock = stockSection === 'all';
    const isOutOfStock = availableStock <= 0;

    const resolvedImages = resolveStyleImages(style, purity);
    const primaryImgUrl = resolvedImages[0]?.url || '';

    setCart((prevCart) => {
      const existingIndex = prevCart.findIndex(
        (item) =>
          ((item.styleId && style._id && String(item.styleId) === String(style._id)) ||
          (item.styleCode === style.styleCode && (item.item || item.kt) === (style.item || purity))) &&
          !!item.isMakeStock === isMakeStock
      );
      if (existingIndex > -1) {
        const updated = [...prevCart];
        let nextQty = (Number(updated[existingIndex].quantity) || 1) + 1;
        
        // Enforce max quantity to available ready stock
        if (!isMakeStock && availableStock > 0 && nextQty > availableStock) {
          nextQty = availableStock;
        }

        updated[existingIndex].quantity = nextQty;
        updated[existingIndex].availableStock = availableStock;
        updated[existingIndex].isOutOfStock = isOutOfStock;
        return updated;
      } else {
        // Enforce max quantity for first addition if stock is 0 (though button should be disabled)
        if (!isMakeStock && availableStock <= 0) {
           // Can optionally prevent adding to cart, but UI already handles out-of-stock.
        }
        return [
          ...prevCart,
          {
            styleId: style._id,
            styleCode: style.styleCode,
            item: style.item || '',
            displayCode,
            categoryName: style.categoryName || '',
            kt: purity,
            purity,
            grossWeight: getRealGrossWeight(style),
            netWeight: getRealNetWeight(style),
            quantity: 1,
            availableStock,
            isOutOfStock,
            isMakeStock,
            imageUrl: primaryImgUrl,
            notes: isOutOfStock || isMakeStock ? 'Pre-order / Made-to-order' : ''
          }
        ];
      }
    });
  };

  const handleUpdateQuantity = (styleCode, kt, newQty, itemVal, styleId) => {
    if (newQty <= 0) {
      handleRemoveItem(styleCode, kt, itemVal, styleId);
      return;
    }

    const style = (data?.styles || []).find((s) =>
      (styleId && s._id && String(s._id) === String(styleId)) ||
      (s.styleCode === styleCode && (s.item || '') === (itemVal || ''))
    );
    const availableStock = style ? getRealQty(style) : 0;
    const isOutOfStock = availableStock <= 0;

    setCart((prevCart) =>
      prevCart.map((cartItem) => {
        const matches =
          (styleId && cartItem.styleId && String(cartItem.styleId) === String(styleId)) ||
          (cartItem.styleCode === styleCode && (cartItem.item || cartItem.kt) === (itemVal || kt));
        if (matches) {
          let finalQty = newQty;
          if (!cartItem.isMakeStock && availableStock > 0 && finalQty > availableStock) {
            finalQty = availableStock;
          }
          return { ...cartItem, quantity: finalQty, availableStock, isOutOfStock };
        }
        return cartItem;
      })
    );
  };

  const handleIncrement = (style) => {
    handleAddToCart(style);
  };

  const handleDecrement = (style) => {
    const currentQty = getCartQuantity(style);
    if (currentQty <= 1) {
      handleRemoveItem(style.styleCode, getStylePurity(style), style.item, style._id);
    } else {
      handleUpdateQuantity(style.styleCode, getStylePurity(style), currentQty - 1, style.item, style._id);
    }
  };

  const handleRemoveItem = (styleCode, kt, itemVal, styleId) => {
    setCart((prevCart) =>
      prevCart.filter((i) => {
        if (styleId && i.styleId) return String(i.styleId) !== String(styleId);
        if (itemVal && i.item) return !(i.styleCode === styleCode && i.item === itemVal);
        return !(i.styleCode === styleCode && i.kt === kt);
      })
    );
  };

  const handleClearCart = () => setCart([]);

  const totalCartCount = cart.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
  const totalGrossWeight = cart.reduce(
    (sum, item) => sum + (Number(item.grossWeight) || 0) * (Number(item.quantity) || 1),
    0
  );

  const handleCopyCode = (code) => {
    try {
      navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1800);
    } catch (e) {}
  };

  // Dropdown state
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef(null);

  // Profile modal state
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileTab, setProfileTab] = useState('details'); // 'details' | 'security'
  const [profileForm, setProfileForm] = useState({ name: '', email: '', mobile: '', companyName: '', city: '', contacts: [] });
  const [passwordForm, setPasswordForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [showCurrentPwd, setShowCurrentPwd] = useState(false);
  const [showNewPwd, setShowNewPwd] = useState(false);
  const [showAccountPlainPwd, setShowAccountPlainPwd] = useState(false);
  const [profileSubmitting, setProfileSubmitting] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ success: '', error: '' });
  const [pwdSubmitting, setPwdSubmitting] = useState(false);
  const [pwdMsg, setPwdMsg] = useState({ success: '', error: '' });

  // Close dropdown on click outside or escape key
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    };

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setUserDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Sync profile form when user changes
  useEffect(() => {
    if (user) {
      let initialContacts = Array.isArray(user.contacts) ? [...user.contacts] : [];
      if (initialContacts.length === 0) {
        initialContacts = [{ name: user.name || '', phone: Array.isArray(user.mobile) ? user.mobile[0] : (user.mobile || '') }];
      }
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        mobile: Array.isArray(user.mobile) ? user.mobile[0] : (user.mobile || ''),
        companyName: user.companyName || '',
        city: user.city || '',
        contacts: initialContacts
      });
    }
  }, [user, showProfileModal]);

  const fetchPortal = async () => {
    try {
      setLoading(true);
      setError('');
      if (isShared && token) {
        const res = await sharedApi.getSharedContent(token);
        if (res.success) {
          if (res.requiresLogin) {
            navigate(`/login?redirect=/shared/${token}`);
            return;
          }
          const p = res.portfolio || res;

          // If the link is "With Login" and the user is authenticated, 
          // redirect to the actual customer portal to unlock all panel pages.
          if (p.accessType === 'With Login' && user && user.role !== 'admin') {
            navigate('/customer/portal', { replace: true });
            return;
          }

          setData({
            customer: {
              id: p.customerId || p.customer?._id || p.customer?.id,
              name: p.customerName || p.companyName || p.customer?.name || 'Valued Client',
              companyName: p.companyName || p.customerName || p.customer?.companyName || 'Valued Client',
              city: p.city || p.customer?.city || '',
              email: p.email || p.customer?.email || '',
              primaryPhone: p.primaryPhone || p.customer?.primaryPhone || '',
              phones: Array.isArray(p.phones) && p.phones.length > 0 ? p.phones : (p.primaryPhone ? [p.primaryPhone] : []),
              accessStart: p.accessStart,
              accessEnd: p.accessEnd,
              assignedCategories: p.categories || p.customer?.assignedCategories || [],
              panelTabAccess: p.panelTabAccess || p.customer?.panelTabAccess || ['ready', 'all']
            },
            styles: p.styles || [],
            categoryGroups: p.categoryGroups || [],
            excelColumns: p.excelColumns || [],
            availableItems: p.availableItems || [],
            availableKts: p.availableKts || [],
            latestImport: p.latestImport || null,
            accessType: p.accessType || 'Without Login',
            token: p.token || token,
            categoryName: p.categoryName || null,
            isSpecificCategoryLink: Boolean(p.isSpecificCategoryLink)
          });
        } else {
          setError(res.message || 'Unable to load shared collection');
        }
      } else {
        const res = await customerApi.getPortalContent();
        if (res.success) {
          setData(res);
        } else {
          setError(res.message || 'Failed to load commercial partner portfolio');
        }
      }
    } catch (err) {
      setError(err.message || 'Failed to load portfolio content');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPortal();
  }, [isShared, token]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleContactChange = (index, field, value) => {
    const updatedContacts = [...profileForm.contacts];
    updatedContacts[index][field] = value;
    setProfileForm({ ...profileForm, contacts: updatedContacts });
  };

  const addContactField = () => {
    setProfileForm({
      ...profileForm,
      contacts: [...profileForm.contacts, { name: '', phone: '' }]
    });
  };

  const removeContactField = (index) => {
    const updatedContacts = profileForm.contacts.filter((_, i) => i !== index);
    setProfileForm({ ...profileForm, contacts: updatedContacts });
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setProfileSubmitting(true);
    setProfileMsg({ success: '', error: '' });
    try {
      const primaryContact = profileForm.contacts[0] || { name: profileForm.companyName || 'Primary Contact', phone: '' };
      if (!primaryContact.name.trim()) throw new Error('Primary contact name is required');
      const res = await authApi.updateProfile({
        name: primaryContact.name.trim(),
        email: profileForm.email.trim(),
        mobile: primaryContact.phone.trim(),
        companyName: profileForm.companyName.trim(),
        city: profileForm.city.trim(),
        contacts: profileForm.contacts.filter(c => c.name.trim() || c.phone.trim())
      });
      if (res.success && res.user) {
        updateUser(res.user);
        setProfileMsg({ success: 'Profile details updated successfully', error: '' });
      } else {
        throw new Error(res.message || 'Failed to update profile');
      }
    } catch (err) {
      setProfileMsg({ success: '', error: err.message || 'Error updating profile' });
    } finally {
      setProfileSubmitting(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPwdSubmitting(true);
    setPwdMsg({ success: '', error: '' });
    try {
      if (!passwordForm.currentPassword) throw new Error('Current password is required');
      if (!passwordForm.newPassword) throw new Error('New password is required');
      if (passwordForm.newPassword.length < 6) throw new Error('Password must be at least 6 characters');
      if (passwordForm.newPassword !== passwordForm.confirmPassword) throw new Error('Passwords do not match');

      const res = await authApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });

      if (res.success) {
        setPwdMsg({ success: 'Password changed successfully', error: '' });
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        throw new Error(res.message || 'Failed to change password');
      }
    } catch (err) {
      setPwdMsg({ success: '', error: err.message || 'Error updating password' });
    } finally {
      setPwdSubmitting(false);
    }
  };

  // -------------------------------------------------------------
  // Data Extraction & Filter Derivations (Hook Rules: Top Level)
  // -------------------------------------------------------------
  const { customer, styles = [], categoryGroups = [], excelColumns = [], latestImport } = data || {};
  const assignedCategories = customer?.assignedCategories || [];

  const availableKts = useMemo(() => {
    if (Array.isArray(data?.availableItems) && data.availableItems.length > 0) {
      return data.availableItems;
    }
    if (Array.isArray(data?.availableKts) && data.availableKts.length > 0) {
      return data.availableKts;
    }
    return extractUniqueItemsFromStyles(styles);
  }, [data?.availableItems, data?.availableKts, styles]);

  // 1. Available Category Groups with live style counts for active section
  const availableGroupOptions = useMemo(() => {
    const isReady = stockSection === 'ready';
    const sectionPool = isReady ? styles.filter((s) => getRealQty(s) >= 1) : styles;
    return (categoryGroups || [])
      .map((grp) => {
        const names = Array.isArray(grp.categoryNames) ? grp.categoryNames : [];
        const count = sectionPool.filter((s) => names.includes(s.categoryName)).length;
        return {
          ...grp,
          count
        };
      })
      .filter((grp) => grp.count > 0);
  }, [categoryGroups, styles, stockSection]);

  // 2. Available Categories scoped to selected Category Group and active section
  const availableCategories = useMemo(() => {
    const isReady = stockSection === 'ready';
    const sectionPool = isReady ? styles.filter((s) => getRealQty(s) >= 1) : styles;
    let baseCats = assignedCategories;
    if (selectedCategoryGroup !== 'All') {
      const targetGroup = (categoryGroups || []).find((g) => g.name === selectedCategoryGroup);
      const groupCatNames = targetGroup?.categoryNames || [];
      baseCats = assignedCategories.filter((catName) => groupCatNames.includes(catName));
    }
    return baseCats.filter((catName) => sectionPool.some((s) => s.categoryName === catName));
  }, [selectedCategoryGroup, assignedCategories, categoryGroups, styles, stockSection]);

  // Filter helper for any specific section filter state
  const filterStylesForSection = (filters, isReadyOnly = false) => {
    return styles.filter((style) => {
      if (isReadyOnly && getRealQty(style) < 1) {
        return false;
      }
      if (filters.categoryGroup !== 'All') {
        const targetGroup = (categoryGroups || []).find((g) => g.name === filters.categoryGroup);
        const groupCatNames = targetGroup?.categoryNames || [];
        if (!groupCatNames.includes(style.categoryName)) {
          return false;
        }
      }
      if (filters.category !== 'All' && style.categoryName !== filters.category) {
        return false;
      }
      if (filters.kt !== 'All') {
        const purity = getStylePurity(style);
        if (purity !== filters.kt) {
          return false;
        }
      }
      if (filters.search && filters.search.trim()) {
        const q = filters.search.toLowerCase().trim();
        const displayCode = getStyleDisplayCode(style).toLowerCase();
        const itemVal = (style.item || '').toLowerCase();
        const raw = style.rawData || {};
        const rawText = Object.values(raw)
          .map((v) => (v !== null && v !== undefined ? String(v).toLowerCase() : ''))
          .join(' ');
        if (
          !displayCode.includes(q) &&
          !style.styleCode.toLowerCase().includes(q) &&
          !itemVal.includes(q) &&
          !(style.categoryName && style.categoryName.toLowerCase().includes(q)) &&
          !(style.description && style.description.toLowerCase().includes(q)) &&
          !rawText.includes(q)
        ) {
          return false;
        }
      }
      return true;
    });
  };

  // 3. Ready Stock styles (purely filtered by sectionFilters.ready)
  const readyFilteredStyles = useMemo(() => {
    return filterStylesForSection(sectionFilters.ready, true);
  }, [styles, sectionFilters.ready, categoryGroups]);

  // 4. Make to Stock (All Design) styles (purely filtered by sectionFilters.all)
  const allFilteredStyles = useMemo(() => {
    return filterStylesForSection(sectionFilters.all, false);
  }, [styles, sectionFilters.all, categoryGroups]);

  // 5. Active displayed styles based on active page
  const displayedStyles = stockSection === 'ready' ? readyFilteredStyles : allFilteredStyles;

  // 6. Base styles for active section (for KT counts and group counts)
  const baseFilteredStyles = useMemo(() => {
    const isReady = stockSection === 'ready';
    return styles.filter((style) => {
      if (isReady && getRealQty(style) < 1) return false;
      if (selectedCategoryGroup !== 'All') {
        const targetGroup = (categoryGroups || []).find((g) => g.name === selectedCategoryGroup);
        const groupCatNames = targetGroup?.categoryNames || [];
        if (!groupCatNames.includes(style.categoryName)) return false;
      }
      if (selectedCategory !== 'All' && style.categoryName !== selectedCategory) return false;
      return true;
    });
  }, [styles, stockSection, selectedCategoryGroup, selectedCategory, categoryGroups]);

  // 7. Total count of styles in currently active Category Group for active section
  const groupStylesCount = useMemo(() => {
    const isReady = stockSection === 'ready';
    const pool = isReady ? styles.filter((s) => getRealQty(s) >= 1) : styles;
    if (selectedCategoryGroup === 'All') return pool.length;
    const targetGroup = (categoryGroups || []).find((g) => g.name === selectedCategoryGroup);
    const groupCatNames = targetGroup?.categoryNames || [];
    return pool.filter((s) => groupCatNames.includes(s.categoryName)).length;
  }, [styles, stockSection, selectedCategoryGroup, categoryGroups]);

  // 8. KT Counts based on current group and category for active section
  const ktCounts = useMemo(() => {
    const counts = { All: baseFilteredStyles.length };
    availableKts.forEach((k) => {
      counts[k] = 0;
    });
    baseFilteredStyles.forEach((s) => {
      const purity = getStylePurity(s);
      if (purity) {
        counts[purity] = (counts[purity] || 0) + 1;
      }
    });
    return counts;
  }, [baseFilteredStyles, availableKts]);

  // 9. Total counts for sidebar badges
  const readyStockCount = useMemo(() => {
    return styles.filter((s) => getRealQty(s) >= 1).length;
  }, [styles]);

  const allStockCount = useMemo(() => {
    return styles.length;
  }, [styles]);

  // Enforce tab access once data is loaded
  useEffect(() => {
    if (data?.customer?.panelTabAccess) {
      const access = data.customer.panelTabAccess;
      if (!access.includes(stockSection) && access.length > 0) {
        handleSectionChange(access[0]);
      }
    }
  }, [data?.customer, stockSection]);

  // Derive all active filters from sectionFilters based on current stockSection
  const hasActiveFilters =
    selectedCategoryGroup !== 'All' ||
    selectedCategory !== 'All' ||
    selectedKt !== 'All' ||
    searchQuery.trim() !== '';

  const partnerDisplayName = customer?.companyName || customer?.name || user?.name || 'Commercial Partner';
  const partnerInitials = partnerDisplayName
    .split(' ')
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  if (loading) {
    return (
      <div className="portal-root flex items-center justify-center min-h-screen">
        <div className="text-center p-8">
          <div className="w-12 h-12 border-4 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <h2 className="font-serif text-2xl font-bold text-text-primary">
            Shraddha Gold Exclusive Atelier
          </h2>
          <p className="text-xs text-text-secondary mt-1">
            Loading curated commercial jewelry catalog...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="portal-root min-h-screen flex items-center justify-center p-6">
        <div className="admin-card max-w-md text-center p-8 border-red-200 bg-white">
          <AlertCircle size={48} className="mx-auto text-red-500 mb-4" />
          <h2 className="font-serif text-2xl font-bold text-text-primary mb-2">
            Access Restricted
          </h2>
          <p className="text-xs text-text-secondary mb-6 leading-relaxed">
            {error}
          </p>
          <div className="flex gap-3">
            {!isShared && (
              <button onClick={handleLogout} className="btn-outline-brand text-xs flex-1 justify-center">
                Sign Out
              </button>
            )}
            <Link to="/" className="btn-brand text-xs flex-1 justify-center">
              Return Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="portal-layout-root">
      {/* Left Sidebar Navigation */}
      <aside className={`portal-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="portal-sidebar-header">
          <Link to="/" className="portal-brand-link" title="Return to Homepage">
            <img src="/Shraddha Gold India Pvt. Ltd - Black (1).png" alt="Shraddha Gold" className="portal-brand-logo" />
          </Link>
          <button
            type="button"
            className="portal-sidebar-close-btn"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="portal-sidebar-nav">
          <div className="portal-sidebar-section-title">Catalogue &amp; Stock</div>

          {/* Page 1: Ready Stock */}
          {(!data?.customer?.panelTabAccess || data.customer.panelTabAccess.includes('ready')) && (
            <button
              type="button"
              onClick={() => {
                handleSectionChange('ready');
                setSidebarOpen(false);
              }}
              className={`portal-sidebar-nav-item ${stockSection === 'ready' ? 'active' : ''}`}
              title="Browse styles currently available in Ready Stock"
            >
              <div className="portal-sidebar-nav-item-left">
                <div className="portal-sidebar-nav-icon ready">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                </div>
                <span className="portal-sidebar-nav-label">Ready Stock</span>
              </div>
              <span className="portal-sidebar-nav-badge ready">
                {readyFilteredStyles.length}
              </span>
            </button>
          )}

          {/* Page 2: Make to Stock(All Design) */}
          {(!data?.customer?.panelTabAccess || data.customer.panelTabAccess.includes('all')) && (
            <button
              type="button"
              onClick={() => {
                handleSectionChange('all');
                setSidebarOpen(false);
              }}
              className={`portal-sidebar-nav-item ${stockSection === 'all' ? 'active' : ''}`}
              title="Browse all styles in catalog (including made-to-order)"
            >
              <div className="portal-sidebar-nav-item-left">
                <div className="portal-sidebar-nav-icon all">
                  <Layers size={17} />
                </div>
                <span className="portal-sidebar-nav-label">Make to Stock(All Design)</span>
              </div>
              <span className="portal-sidebar-nav-badge all">
                {allFilteredStyles.length}
              </span>
            </button>
          )}
        </nav>

        {/* Sidebar Footer Partner Status Card */}
        <div className="portal-sidebar-footer">
          <div className="portal-sidebar-partner-card">
            <div className="portal-sidebar-avatar">
              {isShared ? (
                <ShieldCheck size={18} className="text-emerald-700" />
              ) : (
                partnerInitials || <User size={15} />
              )}
            </div>
            <div className="portal-sidebar-partner-info">
              <div className="portal-sidebar-partner-name" title={partnerDisplayName}>
                {partnerDisplayName}
              </div>
              <div className="portal-sidebar-partner-role">
                <span className="portal-sidebar-live-dot"></span>
                <span>{isShared ? 'Verified Share Link' : (customer?.name || user?.companyName || 'Verified Partner')}</span>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Area Content */}
      <div className="portal-main-area">
        {/* Topbar */}
        <header className="portal-topbar">
          <div className="portal-topbar-left">
            <button
              type="button"
              className="portal-mobile-toggle-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Open Navigation Menu"
            >
              <Menu size={20} />
            </button>
          </div>

          <div className="portal-topbar-actions" ref={userDropdownRef}>
            {/* Cart Button */}
            <button
              type="button"
              onClick={() => setCartOpen(true)}
              className="portal-header-cart-btn"
              title="Open Order Cart"
            >
              <ShoppingBag size={15} className="portal-cart-icon" />
              <span className="portal-cart-label hidden sm:inline">Order Cart</span>
              {totalCartCount > 0 && (
                <span className="portal-cart-badge-pill">
                  {totalCartCount} {totalGrossWeight > 0 ? `• ${totalGrossWeight.toFixed(2)}g` : ''}
                </span>
              )}
            </button>

            {/* User Dropdown (only for authenticated logged-in session) */}
            {!isShared && (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="portal-user-trigger"
                  aria-expanded={userDropdownOpen}
                  aria-haspopup="true"
                  title="Partner Menu"
                >
                  <div className="portal-user-avatar">
                    {partnerInitials || <User size={13} />}
                  </div>
                  <span className="hidden sm:inline font-medium text-xs truncate max-w-[120px]">
                    {partnerDisplayName.split(' ')[0]}
                  </span>
                  <ChevronDown
                    size={13}
                    className={`text-brand-dark transition-transform duration-200 ${
                      userDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {userDropdownOpen && (
                  <div className="portal-user-dropdown" role="menu">
                    <div className="portal-dropdown-header">
                      <div className="font-semibold text-text-primary text-xs truncate">
                        {partnerDisplayName}
                      </div>
                    </div>

                    <div className="p-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          setProfileMsg({ success: '', error: '' });
                          setPwdMsg({ success: '', error: '' });
                          setShowProfileModal(true);
                        }}
                        className="portal-dropdown-item"
                        role="menuitem"
                      >
                        <User size={15} className="text-brand-primary" />
                        <span>Profile</span>
                      </button>
                      <div className="my-1 border-t border-border-subtle" />
                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          handleLogout();
                        }}
                        className="portal-dropdown-item danger"
                        role="menuitem"
                      >
                        <LogOut size={15} className="text-red-500" />
                        <span>Sign Out</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </header>

        {/* Main Content Area */}
        <div className="portal-main-container">
          {(!data?.customer?.panelTabAccess || data.customer.panelTabAccess.length === 0) ? (
            <div className="flex flex-col items-center justify-center py-24 px-4 text-center h-full">
              <div className="bg-white p-8 rounded-2xl border border-border-subtle shadow-sm max-w-md w-full mx-auto">
                <ShieldCheck size={48} className="mx-auto text-brand-primary opacity-30 mb-4" />
                <h3 className="text-lg font-serif font-bold text-text-primary mb-2">
                  No Catalog Access
                </h3>
                <p className="text-sm text-text-muted">
                  You currently do not have access to view the catalog collections. Please contact the administrator for permissions.
                </p>
              </div>
            </div>
          ) : (
            <>
              {/* 2. Comprehensive Luxury Filter Control Hub (Category Group, Category, KT) */}
              <section className="portal-filter-hub" aria-label="Catalog Filters">
                <div className="portal-filter-grid">
            {/* Filter 1: Category Group */}
            <div className="portal-filter-field">
              <label className="portal-filter-label" htmlFor="portal-filter-group">
                <Layers size={13} className="text-brand-primary" />
                <span>Category Group</span>
              </label>
              <div className="portal-filter-select-wrap">
                <select
                  id="portal-filter-group"
                  value={selectedCategoryGroup}
                  onChange={(e) => {
                    const nextGroup = e.target.value;
                    setSelectedCategoryGroup(nextGroup);
                    setSelectedCategory('All');
                  }}
                  className="portal-filter-select"
                >
                  <option value="All">All Category Groups</option>
                  {availableGroupOptions.map((grp) => (
                    <option key={grp._id || grp.name} value={grp.name}>
                      {grp.name}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="portal-select-arrow" />
              </div>
            </div>

            {/* Filter 2: Category */}
            <div className="portal-filter-field">
              <label className="portal-filter-label" htmlFor="portal-filter-category">
                <Gem size={13} className="text-brand-primary" />
                <span>Category</span>
              </label>
              <div className="portal-filter-select-wrap">
                <select
                  id="portal-filter-category"
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="portal-filter-select"
                >
                  <option value="All">
                    {selectedCategoryGroup === 'All'
                      ? 'All Categories'
                      : `All in ${selectedCategoryGroup}`}
                  </option>
                  {availableCategories.map((catName) => (
                    <option key={catName} value={catName}>
                      {catName}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="portal-select-arrow" />
              </div>
            </div>

            {/* Filter 3: Item */}
            <div className="portal-filter-field portal-filter-kt-field">
              <label className="portal-filter-label">
                <Sparkles size={13} className="text-gold-accent" />
                <span>Item</span>
              </label>
              <div className="portal-kt-pills-bar" role="group" aria-label="Item Filter">
                {[
                  { id: 'All', label: 'All Items' },
                  ...availableKts.map((k) => ({ id: k, label: formatItemLabel(k) }))
                ].map((kt) => {
                  const isActive = selectedKt === kt.id;
                  return (
                    <button
                      key={kt.id}
                      type="button"
                      onClick={() => setSelectedKt(kt.id)}
                      className={`portal-kt-pill-btn ${isActive ? 'active' : ''}`}
                      title={`Filter by ${kt.label}`}
                    >
                      <span>{kt.label}</span>
                      {kt.id !== 'All' && (
                        <span className="portal-kt-count-badge">
                          ({ktCounts[kt.id] || 0})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Secondary Filter Row: Search & Action Bar */}
          <div className="portal-filter-subbar">
            <div className="portal-search-box">
              <Search size={15} className="portal-search-icon" />
              <input
                type="text"
                className="portal-search-input"
                placeholder="Search style code, description, or Hallmark specs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button
                  type="button"
                  className="portal-search-clear"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Results Count & Reset Controls */}
            <div className="portal-filter-actions">
              {/* Column Layout Controller (Cards per row: 2, 3, 4, 5) */}
              <div className="portal-grid-picker" role="group" aria-label="Cards per row">
                <span className="portal-grid-picker-label">
                  <LayoutGrid size={13} className="text-brand-primary" />
                  <span className="hidden sm:inline">Cards / Row:</span>
                </span>
                <div className="portal-grid-picker-btns">
                  {[2, 3, 4, 5].map((cols) => (
                    <button
                      key={cols}
                      type="button"
                      onClick={() => handleGridColsChange(cols)}
                      className={`portal-grid-picker-btn ${gridColumns === cols ? 'active' : ''}`}
                      title={`Show ${cols} cards per row`}
                    >
                      {cols}
                    </button>
                  ))}
                </div>
              </div>

              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={handleResetFilters}
                  className="portal-reset-filters-btn"
                  title="Reset all active filters"
                >
                  <RotateCcw size={12} />
                  <span>Reset All</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Dismissible Active Filter Chips */}
          {hasActiveFilters && (
            <div className="portal-active-chips-row">
              <span className="portal-active-label">Active Filters:</span>
              {selectedCategoryGroup !== 'All' && (
                <span className="portal-filter-chip">
                  <span>Group: {selectedCategoryGroup}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedCategoryGroup('All')}
                    title="Remove Group Filter"
                  >
                    <X size={11} />
                  </button>
                </span>
              )}
              {selectedCategory !== 'All' && (
                <span className="portal-filter-chip">
                  <span>Category: {selectedCategory}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('All')}
                    title="Remove Category Filter"
                  >
                    <X size={11} />
                  </button>
                </span>
              )}
              {selectedKt !== 'All' && (
                <span className="portal-filter-chip gold">
                  <span>Item: {selectedKt}</span>
                  <button
                    type="button"
                    onClick={() => setSelectedKt('All')}
                    title="Remove Item Filter"
                  >
                    <X size={11} />
                  </button>
                </span>
              )}
              {searchQuery.trim() && (
                <span className="portal-filter-chip">
                  <span>Search: "{searchQuery.trim()}"</span>
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    title="Clear Search Query"
                  >
                    <X size={11} />
                  </button>
                </span>
              )}
            </div>
          )}
        </section>

        {/* 3. Interactive Category Quick-Pill Navigation (Scoped to Selected Group) */}
        {availableCategories.length > 1 && (
          <nav className="portal-category-pills" aria-label="Category Quick Navigation">
            <button
              onClick={() => setSelectedCategory('All')}
              className={`portal-cat-pill ${selectedCategory === 'All' ? 'active' : ''}`}
            >
              <span>{selectedCategoryGroup === 'All' ? 'All Assigned Styles' : `All in ${selectedCategoryGroup}`}</span>
            </button>
            {availableCategories.map((catName) => (
              <button
                key={catName}
                onClick={() => setSelectedCategory(catName === selectedCategory ? 'All' : catName)}
                className={`portal-cat-pill ${selectedCategory === catName ? 'active' : ''}`}
              >
                <span>{catName}</span>
              </button>
            ))}
          </nav>
        )}

        {/* 4. Content Area: Grid View */}
        {displayedStyles.length === 0 ? (
          <div className="admin-card text-center py-16 text-text-muted bg-white border border-border-subtle rounded-xl">
            <Layers size={40} className="mx-auto text-brand-primary opacity-30 mb-2" />
            <p className="text-base font-semibold text-text-primary">
              {stockSection === 'ready' ? 'No designs currently in Ready Stock' : 'No designs match your criteria'}
            </p>
            <p className="text-xs text-text-muted mt-1">
              {stockSection === 'ready'
                ? "Switch to 'Make to Stock(All Design)' in the sidebar to view and order styles available for pre-order."
                : hasActiveFilters
                ? 'No jewellery styles match your selected filter combination. Try resetting filters.'
                : 'Please check other assigned categories.'}
            </p>
            {stockSection === 'ready' ? (
              <button
                type="button"
                onClick={() => handleSectionChange('all')}
                className="mt-4 px-4 py-1.5 text-xs font-semibold rounded-lg bg-light-brand text-brand-dark border border-brand-primary/30 inline-flex items-center gap-1.5"
              >
                <Layers size={13} />
                <span>View Make to Stock(All Design)</span>
              </button>
            ) : hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="mt-4 px-4 py-1.5 text-xs font-semibold rounded-lg bg-light-brand text-brand-dark border border-brand-primary/30 inline-flex items-center gap-1.5"
              >
                <RotateCcw size={13} />
                <span>Reset All Filters</span>
              </button>
            )}
          </div>
        ) : (
          /* GALLERY CARDS GRID VIEW */
          <div className={`portal-styles-grid cols-${gridColumns}`}>
            {displayedStyles.map((style) => {
              const currentKt = getStylePurity(style);
              const displayCode = getStyleDisplayCode(style);
              const imagesForKt = resolveStyleImages(style, currentKt);
              const cartQty = getCartQuantity(style);
              const realGross = getRealGrossWeight(style);
              const realNet = getRealNetWeight(style);
              const realPure = getRealPureWeight(style);
              const row = style.rawData || {};

              // Live available stock calculation
              const availableStock = getRealQty(style);
              const isOutOfStock = availableStock <= 0;

              return (
                <article key={style._id} className="portal-style-card">
                  {/* 1. Visual Presentation: Carousel of Images OR Luxury Atelier Placeholder */}
                  <div className="portal-style-image-display" style={{ overflow: 'hidden' }}>
                    <ImageCarousel 
                      imagesForKt={imagesForKt} 
                      styleCode={displayCode} 
                      currentKt={currentKt} 
                      categoryName={style.categoryName} 
                      setPreviewImage={setPreviewImage} 
                    />
                  </div>

                  {/* 2. Card Body & Luxury Identity */}
                  <div className="portal-style-body">
                    {/* Style Code Header & Stock Pill */}
                    <div className="portal-style-header">
                      <span className="portal-style-code" title={displayCode}>{displayCode}</span>
                      {stockSection === 'ready' && (
                        isOutOfStock ? (
                          <span className="portal-stock-pill out-of-stock" title="Made to Order / Pre-order design">
                            Made to Order
                          </span>
                        ) : availableStock === 1 ? (
                          <span className="portal-stock-pill only-one">Only 1 left</span>
                        ) : availableStock <= 5 ? (
                          <span className="portal-stock-pill low-stock">{availableStock} in stock</span>
                        ) : (
                          <span className="portal-stock-pill in-stock">{availableStock} in stock</span>
                        )
                      )}
                    </div>

                    {/* Luxury Dual Specification Capsule */}
                    <div className="portal-specs-capsule">
                      <div className="portal-spec-item">
                        <span className="portal-spec-item-label">Gross Weight</span>
                        <div className="portal-spec-item-value">
                          <strong>{realGross.toFixed(3)}</strong>
                          <span className="portal-spec-unit">g</span>
                        </div>
                      </div>
                      <div className="portal-spec-divider" />
                      <div className="portal-spec-item right">
                        <span className="portal-spec-item-label">Item</span>
                        <div className="portal-spec-item-value gold">
                          <strong>{currentKt}</strong>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 3. Order Action Footer with Interactive Stepper */}
                  <div className="portal-action-footer">
                    {cartQty > 0 ? (
                      <div className="portal-stepper-wrap">
                        <button
                          type="button"
                          onClick={() => handleDecrement(style)}
                          className="portal-stepper-btn"
                          title="Decrease Quantity"
                        >
                          <Minus size={14} />
                        </button>
                        <div className="portal-stepper-indicator">
                          <span className="portal-stepper-count">{cartQty} {cartQty === 1 ? 'pc' : 'pcs'} in Cart</span>
                          <span className="portal-stepper-caption">
                            {currentKt} • {(realGross * cartQty).toFixed(3)}g
                            {availableStock > 0 ? (
                              <span className="portal-stepper-max-hint"> (Ready: {availableStock})</span>
                            ) : (
                              <span className="text-amber-600 font-semibold"> (Made to Order)</span>
                            )}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleIncrement(style)}
                          className="portal-stepper-btn"
                          title="Increase Quantity"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleAddToCart(style)}
                        className="portal-btn-add"
                        title={stockSection === 'all' ? "Add to cart as make to stock" : "Add ready stock design to cart"}
                      >
                        {stockSection === 'all' ? (
                          <>
                            <ShoppingBag size={14} className="portal-btn-add-icon" />
                            <span>Make to Stock</span>
                          </>
                        ) : (
                          <>
                            <ShoppingBag size={14} className="portal-btn-add-icon" />
                            <span>Add to Cart</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
            </>
          )}
      </div>
    </div>

      {/* Floating Order Cart Trigger (Bottom Right) */}
      {cart.length > 0 && (
        <button
          type="button"
          onClick={() => setCartOpen(true)}
          className="cart-floating-trigger"
          aria-label="View Order Cart"
        >
          <ShoppingBag size={18} className="text-gold-accent" />
          <span>View Order Cart ({totalCartCount})</span>
          {totalGrossWeight > 0 && (
            <span className="cart-floating-badge">{totalGrossWeight.toFixed(2)}g</span>
          )}
        </button>
      )}

      {/* Slide-over Cart Drawer */}
      <CartDrawer
        isOpen={cartOpen}
        onClose={() => setCartOpen(false)}
        items={cart}
        onUpdateQuantity={handleUpdateQuantity}
        onRemoveItem={handleRemoveItem}
        onClearCart={handleClearCart}
        onProceedToCheckout={() => {
          setCartOpen(false);
          setCheckoutOpen(true);
        }}
      />

      {/* Checkout Modal (Authenticated or Shared Link Flow) */}
      <CheckoutModal
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        items={cart}
        accessType={isShared ? (data?.accessType || 'Without Login') : 'With Login'}
        customerInfo={{
          name: customer?.name || user?.name || '',
          email: customer?.email || user?.email || '',
          city: customer?.city || '',
          phones: customer?.phones || (customer?.primaryPhone ? [customer.primaryPhone] : [])
        }}
        token={isShared ? (token || '') : ''}
        onOrderSuccess={(order) => {
          setCart([]);
          try {
            localStorage.removeItem('sg_portal_cart');
            localStorage.removeItem(portalCartKey);
          } catch (e) {}
          if (order) setOrderToast(order);
          // Immediately refresh portal catalog data so decremented stock is displayed right away!
          fetchPortal();
        }}
      />

      {/* Lightbox Zoom for Uploaded Photos */}
      {previewImage && (
        <div className="admin-modal-backdrop" onClick={() => setPreviewImage(null)} style={{ zIndex: 1000 }}>
          <div className="max-w-3xl max-h-[90vh] p-3 bg-white rounded-xl shadow-2xl relative flex flex-col items-center justify-center" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 bg-black/60 text-white rounded-full p-2 hover:bg-black transition-colors z-50"
            >
              <X size={18} />
            </button>
            
            {previewImage.images?.length > 1 && (
              <>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewImage(prev => ({
                      ...prev,
                      currentIndex: prev.currentIndex === 0 ? prev.images.length - 1 : prev.currentIndex - 1
                    }));
                  }}
                  className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white rounded-full p-2 z-50 shadow-md transition-colors"
                  title="Previous image"
                >
                  <ChevronLeft size={24} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewImage(prev => ({
                      ...prev,
                      currentIndex: prev.currentIndex === prev.images.length - 1 ? 0 : prev.currentIndex + 1
                    }));
                  }}
                  className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/70 text-white rounded-full p-2 z-50 shadow-md transition-colors"
                  title="Next image"
                >
                  <ChevronRight size={24} />
                </button>
              </>
            )}

            <img
              src={previewImage.images ? previewImage.images[previewImage.currentIndex] : previewImage.url}
              alt={previewImage.title}
              className="max-h-[75vh] w-auto mx-auto rounded-lg object-contain bg-gray-50"
            />
            <div className="text-center text-xs font-semibold text-text-primary pt-3">
              {previewImage.title} {previewImage.images?.length > 1 && `(${previewImage.currentIndex + 1}/${previewImage.images.length})`}
            </div>
          </div>
        </div>
      )}



      {/* Commercial Partner Profile & Security Modal */}
      {showProfileModal && (
        <div className="admin-modal-backdrop" onClick={() => setShowProfileModal(false)}>
          <div className="portal-profile-modal" onClick={(e) => e.stopPropagation()}>

            {/* Premium Profile Header with Avatar */}
            <div className="portal-profile-header">
              <div className="portal-profile-header-bg"></div>
              <button
                onClick={() => setShowProfileModal(false)}
                className="portal-profile-close-btn"
                aria-label="Close profile"
              >
                <X size={18} />
              </button>
              <div className="portal-profile-avatar-section">
                <div className="portal-profile-avatar-lg">
                  {(user?.name || 'P').charAt(0).toUpperCase()}
                </div>
                <div className="portal-profile-user-info">
                  <h3 className="portal-profile-name">{user?.companyName || 'Commercial Partner'}</h3>
                </div>
              </div>
            </div>

            {/* Elegant Tab Navigation */}
            <div className="portal-profile-tabs">
              <button
                onClick={() => setProfileTab('details')}
                className={`portal-profile-tab ${profileTab === 'details' ? 'active' : ''}`}
              >
                <User size={14} />
                <span>Profile Information</span>
              </button>
              <button
                onClick={() => setProfileTab('security')}
                className={`portal-profile-tab ${profileTab === 'security' ? 'active' : ''}`}
              >
                <KeyRound size={14} />
                <span>Change Password</span>
              </button>
            </div>

            {/* Modal Body */}
            <div className="portal-profile-body">
              {profileTab === 'details' ? (
                <form onSubmit={handleProfileUpdate}>
                  {profileMsg.success && (
                    <div className="portal-profile-alert success">
                      <CheckCircle2 size={15} />
                      <span>{profileMsg.success}</span>
                    </div>
                  )}
                  {profileMsg.error && (
                    <div className="portal-profile-alert error">
                      <AlertCircle size={15} />
                      <span>{profileMsg.error}</span>
                    </div>
                  )}

                  <div className="portal-profile-row">
                    <div className="portal-profile-field">
                      <label className="portal-profile-label">Business Name</label>
                      <div className="portal-profile-input-wrap">
                        <Building2 size={15} className="portal-profile-field-icon" />
                        <input
                          type="text"
                          className="portal-profile-input"
                          value={profileForm.companyName}
                          onChange={(e) => setProfileForm({ ...profileForm, companyName: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="portal-profile-field">
                      <label className="portal-profile-label">Email Address</label>
                      <div className="portal-profile-input-wrap">
                        <Mail size={15} className="portal-profile-field-icon" />
                        <input
                          type="email"
                          className="portal-profile-input"
                          value={profileForm.email}
                          onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="portal-profile-field" style={{ marginTop: '20px' }}>
                    <label className="portal-profile-label">City</label>
                    <div className="portal-profile-input-wrap">
                      <MapPin size={15} className="portal-profile-field-icon" />
                      <input
                        type="text"
                        className="portal-profile-input"
                        value={profileForm.city}
                        onChange={(e) => setProfileForm({ ...profileForm, city: e.target.value })}
                        placeholder="City"
                      />
                    </div>
                  </div>

                  <div className="portal-profile-field" style={{ marginTop: '20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                      <label className="portal-profile-label" style={{ marginBottom: 0 }}>Authorized Customer Contacts (Name & Mobile Number)*</label>
                    </div>
                    <div className="portal-profile-contacts-list" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {profileForm.contacts.map((contact, idx) => (
                        <div key={idx} style={{ 
                            display: 'flex', 
                            gap: '16px', 
                            alignItems: 'center', 
                            backgroundColor: '#fbfbfb', 
                            padding: '16px', 
                            borderRadius: '14px', 
                            border: '1px solid var(--border-subtle, #eaeaea)',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.02)'
                          }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            justifyContent: 'center', 
                            minWidth: '28px', 
                            height: '28px', 
                            borderRadius: '50%', 
                            backgroundColor: 'rgba(197, 160, 89, 0.1)', 
                            color: '#b08947', 
                            fontSize: '13px', 
                            fontWeight: '700' 
                          }}>
                            {idx + 1}
                          </div>
                          
                          <div className="portal-profile-input-wrap" style={{ flex: 1, marginBottom: 0 }}>
                            <User size={14} className="portal-profile-field-icon" style={{ opacity: 0.6 }} />
                            <input
                              type="text"
                              placeholder="Contact Name"
                              value={contact.name}
                              onChange={(e) => handleContactChange(idx, 'name', e.target.value)}
                              className="portal-profile-input"
                            />
                          </div>
                          
                          <div className="portal-profile-input-wrap" style={{ flex: 1.2, marginBottom: 0, overflow: 'visible' }}>
                            <PhoneInput
                              defaultCountry="in"
                              preferredCountries={['in', 'ae', 'us', 'gb']}
                              value={contact.phone}
                              onChange={(val) => handleContactChange(idx, 'phone', val)}
                              placeholder="Mobile Number"
                              className="admin-phone-input-compact"
                              inputClassName="admin-phone-input-field portal-profile-input"
                              style={{ width: '100%', '--react-international-phone-background': 'transparent', '--react-international-phone-border-color': 'transparent' }}
                            />
                          </div>
                        </div>
                      ))}
                      {profileForm.contacts.length === 0 && (
                        <div style={{ fontSize: '13px', color: 'var(--text-secondary)', fontStyle: 'italic', padding: '10px 0' }}>No additional contacts added.</div>
                      )}
                    </div>
                  </div>

                  {user?.notes && (
                    <div className="portal-profile-field">
                      <label className="portal-profile-label">Special Notes</label>
                      <div className="portal-profile-input-wrap disabled" style={{ background: 'var(--bg-card)', padding: '10px 15px', borderRadius: '12px', border: '1px solid var(--border-light)' }}>
                        <div style={{ fontSize: '14px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                          {user.notes}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="portal-profile-actions">
                    <button
                      type="button"
                      onClick={() => setShowProfileModal(false)}
                      className="portal-profile-btn-secondary"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={profileSubmitting}
                      className="portal-profile-btn-primary"
                    >
                      {profileSubmitting ? 'Saving...' : 'Save Details'}
                    </button>
                  </div>
                </form>
              ) : (
                <form onSubmit={handlePasswordChange}>
                  {pwdMsg.success && (
                    <div className="portal-profile-alert success">
                      <CheckCircle2 size={15} />
                      <span>{pwdMsg.success}</span>
                    </div>
                  )}
                  {pwdMsg.error && (
                    <div className="portal-profile-alert error">
                      <AlertCircle size={15} />
                      <span>{pwdMsg.error}</span>
                    </div>
                  )}

                  {/* Plain Password Display */}
                  {user?.plainPassword && (
                    <div className="portal-profile-pwd-reveal">
                      <div className="portal-profile-pwd-reveal-top">
                        <span className="portal-profile-pwd-reveal-label">Current Plain Password</span>
                        <button
                          type="button"
                          onClick={() => setShowAccountPlainPwd(!showAccountPlainPwd)}
                          className="portal-profile-pwd-reveal-btn"
                        >
                          {showAccountPlainPwd ? <EyeOff size={13} /> : <Eye size={13} />}
                          <span>{showAccountPlainPwd ? 'Hide' : 'Reveal'}</span>
                        </button>
                      </div>
                      <div className="portal-profile-pwd-reveal-value">
                        {showAccountPlainPwd ? user.plainPassword : '••••••••••••'}
                      </div>
                    </div>
                  )}

                  <div className="portal-profile-field">
                    <label className="portal-profile-label">Current Password *</label>
                    <div className="portal-profile-input-wrap">
                      <KeyRound size={15} className="portal-profile-field-icon" />
                      <input
                        type={showCurrentPwd ? 'text' : 'password'}
                        className="portal-profile-input"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                        placeholder="Enter current password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPwd(!showCurrentPwd)}
                        className="portal-profile-eye-btn"
                        tabIndex={-1}
                      >
                        {showCurrentPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="portal-profile-field">
                    <label className="portal-profile-label">New Password * <span className="portal-profile-label-hint">(Min 6 characters)</span></label>
                    <div className="portal-profile-input-wrap">
                      <KeyRound size={15} className="portal-profile-field-icon" />
                      <input
                        type={showNewPwd ? 'text' : 'password'}
                        className="portal-profile-input"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                        placeholder="Enter new password"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPwd(!showNewPwd)}
                        className="portal-profile-eye-btn"
                        tabIndex={-1}
                      >
                        {showNewPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>

                  <div className="portal-profile-field">
                    <label className="portal-profile-label">Confirm New Password *</label>
                    <div className="portal-profile-input-wrap">
                      <KeyRound size={15} className="portal-profile-field-icon" />
                      <input
                        type="password"
                        className="portal-profile-input"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                        placeholder="Repeat new password"
                        required
                      />
                    </div>
                  </div>

                  <div className="portal-profile-actions">
                    <button
                      type="button"
                      onClick={() => setShowProfileModal(false)}
                      className="portal-profile-btn-secondary"
                    >
                      Close
                    </button>
                    <button
                      type="submit"
                      disabled={pwdSubmitting}
                      className="portal-profile-btn-primary"
                    >
                      {pwdSubmitting ? 'Updating...' : 'Update Password'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Luxury Order Success Toast Notification */}
      {orderToast && (
        <div className="portal-order-toast" role="alert">
          <div className="portal-order-toast-icon">
            <CheckCircle2 size={18} />
          </div>
          <div className="portal-order-toast-content">
            <div className="portal-order-toast-title">
              Order Placed Successfully!
            </div>
            <div className="portal-order-toast-desc">
              Order <strong className="font-mono text-gold-accent">{orderToast.orderNumber}</strong> • {orderToast.totalItems || 1} {orderToast.totalItems === 1 ? 'design' : 'designs'} ({orderToast.totalQuantity || 1} pcs) • {Number(orderToast.totalGrossWeight || 0).toFixed(2)}g
            </div>
          </div>
          <button
            type="button"
            onClick={() => setOrderToast(null)}
            className="portal-order-toast-close"
            aria-label="Dismiss notification"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Stock Warning Toast Banner */}
      {stockAlert && (
        <div className="portal-stock-warning-toast" role="alert">
          <div className="portal-stock-alert-content">
            <div className="portal-stock-alert-icon">
              <AlertCircle size={18} />
            </div>
            <div className="portal-stock-alert-text">
              {stockAlert}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStockAlert(null)}
            className="portal-stock-alert-close"
            aria-label="Dismiss stock alert"
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Mobile Drawer Backdrop */}
      {sidebarOpen && (
        <div
          className="portal-sidebar-backdrop"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default CustomerPortal;
