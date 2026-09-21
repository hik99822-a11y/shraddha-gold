import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Search,
  RefreshCw,
  FileDown,
  Eye,
  Trash2,
  Send,
  CheckCircle2,
  Clock,
  Sparkles,
  AlertCircle,
  X,
  Layers,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  ShieldCheck,
  Gem,
  ArrowRight,
  SlidersHorizontal,
  Printer,
  Calendar,
  Flame,
  Award,
  User,
  Link as LinkIcon,
  Globe,
  MessageSquare
} from 'lucide-react';
import { adminApi, customerApi, orderApi } from '../../../services/api';
import { formatDateTimeIST } from '../../../utils/dateUtils';
import AdminConfirmModal from '../components/AdminConfirmModal';
import './OrdersManagement.css';
import '../AdminCommon.css';

const API_BASE = 'https://api.shraddhagold.com';

const STATUS_OPTIONS = ['Pending', 'Confirmed', 'In Production', 'Completed', 'Cancelled'];

const formatPhone = (phone) => {
  if (!phone) return '—';
  const clean = String(phone).replace(/\D/g, '');
  if (clean.length === 12 && clean.startsWith('91')) {
    return `+91 ${clean.slice(2, 7)} ${clean.slice(7)}`;
  }
  if (clean.length === 10) {
    return `+91 ${clean.slice(0, 5)} ${clean.slice(5)}`;
  }
  return phone;
};

const formatDate = (dateStr) => {
  if (!dateStr) return { date: '—', time: '' };
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return { date: '-', time: '' };
  const date = formatDateTimeIST(d, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
  const time = formatDateTimeIST(d, {
    hour: '2-digit',
    minute: '2-digit'
  });
  return { date, time };
};

// ============================================================================
// ORDER DETAILS MODAL (High-Performance for 200+ Items with Search & Pagination)
// ============================================================================
const OrderDetailsModal = ({
  order,
  onClose,
  onDownloadPdf,
  actionLoading,
  setPreviewImage,
  copiedId,
  handleCopyOrderId
}) => {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(
    order.items?.length > 50 ? 25 : (order.items?.length > 10 ? 25 : 'All')
  );

  const allItems = useMemo(() => {
    return (order.items || []).map((item, idx) => ({
      ...item,
      _originalIndex: idx + 1
    }));
  }, [order.items]);

  const filteredItems = useMemo(() => {
    if (!search.trim()) return allItems;
    const q = search.toLowerCase().trim();
    return allItems.filter((item) => {
      const code = (item.styleCode || '').toLowerCase();
      const cat = (item.categoryName || item.item || '').toLowerCase();
      const kt = (item.kt || '').toLowerCase();
      return code.includes(q) || cat.includes(q) || kt.includes(q);
    });
  }, [allItems, search]);

  const totalFiltered = filteredItems.length;
  const isAll = pageSize === 'All';
  const effectivePageSize = isAll ? Math.max(1, totalFiltered) : Number(pageSize);
  const totalPages = isAll ? 1 : Math.ceil(totalFiltered / effectivePageSize) || 1;

  // Keep page within valid bounds
  useEffect(() => {
    if (page > totalPages) {
      setPage(Math.max(1, totalPages));
    }
  }, [totalPages, page]);

  const paginatedItems = useMemo(() => {
    if (isAll) return filteredItems;
    const start = (page - 1) * effectivePageSize;
    return filteredItems.slice(start, start + effectivePageSize);
  }, [filteredItems, page, effectivePageSize, isAll]);

  const startIndex = isAll ? 0 : (page - 1) * effectivePageSize;
  const endIndex = isAll ? totalFiltered : Math.min(startIndex + effectivePageSize, totalFiltered);

  // Filtered stats
  const filteredTotals = useMemo(() => {
    const qty = filteredItems.reduce((acc, it) => acc + (Number(it.quantity) || 1), 0);
    const wt = filteredItems.reduce(
      (acc, it) => acc + (Number(it.grossWeight) || 0) * (Number(it.quantity) || 1),
      0
    );
    return { qty, wt: wt.toFixed(2) };
  }, [filteredItems]);

  const pdfFullUrl = `${API_BASE}/api/orders/${order._id}/pdf`;

  return (
    <div className="admin-modal-backdrop" onClick={onClose}>
      <div
        className="admin-modal-card order-details-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 1. Executive Modal Header */}
        <div className="order-modal-header">
          <div className="order-modal-header-left">
            <div className="order-modal-icon-badge">
              <ShoppingBag size={20} />
            </div>
            <div className="order-modal-header-text">
              <div className="order-modal-title-row">
                <h3 className="order-modal-title">Order Details</h3>
                <div className="order-modal-id-pill">
                  <span>{order.orderNumber}</span>
                  <button
                    type="button"
                    onClick={() => handleCopyOrderId(order.orderNumber)}
                    className="order-modal-copy-btn"
                    title="Copy Order Number"
                  >
                    {copiedId === order.orderNumber ? (
                      <Check size={12} className="text-emerald-700" />
                    ) : (
                      <Copy size={12} />
                    )}
                  </button>
                </div>
              </div>
              <span className="order-modal-channel-subtitle">
                Channel: <strong>{order.orderSource || 'Direct Link (Without Login)'}</strong> • Shraddha Gold B2B
              </span>
            </div>
          </div>

          <div className="order-modal-header-right">
            <div className={`order-modal-status-badge ${order.status?.toLowerCase().replace(/\s+/g, '-')}`}>
              <span className="order-modal-status-dot" />
              <span>{order.status}</span>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="order-modal-close-btn"
              title="Close"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* 2. Modal Body: Luxury Cards */}
        <div className="order-modal-body">
          {/* Dossier Card 1: Customer Information */}
          <div className="order-modal-section-card">
            <div className="order-modal-section-header">
              <div className="order-modal-section-title">
                <User size={15} />
                <span>Customer &amp; Procurement Dossier</span>
              </div>
              <span className="order-modal-section-badge">
                Verified Client
              </span>
            </div>

            <div className="order-modal-info-grid">
              {/* Business Name */}
              <div className="order-modal-info-tile">
                <span className="order-modal-info-label">Client Business</span>
                <div className="order-modal-client-name">
                  {order.customerName}
                </div>
                {order.orderedBy && order.orderedBy !== order.customerName && (
                  <div className="order-modal-ordered-by">
                    <User size={10} className="text-brand-primary flex-shrink-0" />
                    <span>Ordered By: <strong>{order.orderedBy}</strong></span>
                  </div>
                )}
              </div>

              {/* Customer Mobile */}
              <div className="order-modal-info-tile">
                <span className="order-modal-info-label">Customer Mobile</span>
                <div className="order-modal-contact-row">
                  <span className="order-modal-phone">{formatPhone(order.customerPhone)}</span>
                </div>
              </div>

              {/* Order Date & Time */}
              <div className="order-modal-info-tile">
                <span className="order-modal-info-label">Order Date &amp; Time</span>
                <div className="order-modal-date-val">
                  <Calendar size={13} className="text-emerald-700" />
                  <span>
                    {new Date(order.createdAt).toLocaleString('en-IN', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: true
                    })}
                  </span>
                </div>
              </div>

              {/* Customer Email */}
              <div className="order-modal-info-tile">
                <span className="order-modal-info-label">Customer Email</span>
                <div className="order-modal-email-val" title={order.customerEmail || '—'}>
                  {order.customerEmail || 'Not Provided'}
                </div>
              </div>
            </div>
          </div>

          {/* Customer Remark / Instructions */}
          {(order.remark || order.notes) && (
            <div className="order-modal-notes-card">
              <MessageSquare size={16} className="order-modal-notes-icon" />
              <div>
                <span className="order-modal-notes-label">Customer Remark / Instructions:</span>
                <p className="order-modal-notes-text">"{order.remark || order.notes}"</p>
              </div>
            </div>
          )}

          {/* Dossier Card 2: Ordered Items Table (Optimized for 200+ Items) */}
          <div className="order-modal-section-card products">
            <div className="order-modal-section-header">
              <div className="order-modal-section-title">
                <Gem size={15} />
                <span>Ordered Jewelry Styles ({allItems.length})</span>
              </div>

              <div className="order-modal-header-actions">
                {allItems.length > 5 && (
                  <div className="order-modal-search-box">
                    <Search size={13} className="order-modal-search-icon" />
                    <input
                      type="text"
                      placeholder="Filter styles..."
                      value={search}
                      onChange={(e) => {
                        setSearch(e.target.value);
                        setPage(1);
                      }}
                      className="order-modal-search-input"
                    />
                    {search && (
                      <button
                        type="button"
                        onClick={() => {
                          setSearch('');
                          setPage(1);
                        }}
                        className="order-modal-search-clear"
                        title="Clear filter"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                )}

                {search ? (
                  <span
                    className="order-modal-section-badge filtered"
                    title={`${filteredTotals.qty} pcs • ${filteredTotals.wt}g matched`}
                  >
                    Matched: <strong>{totalFiltered}</strong>
                  </span>
                ) : (
                  <span className="order-modal-section-badge total-qty">
                    Total: <strong>{order.totalQuantity} pcs</strong>
                  </span>
                )}
              </div>
            </div>

            <div className="order-modal-table-wrap">
              <table className="order-modal-table">
                <thead>
                  <tr>
                    <th style={{ width: '38px', textAlign: 'center' }}>#</th>
                    <th style={{ width: '56px' }}>Design</th>
                    <th>Style Code &amp; Category</th>
                    <th>Purity</th>
                    <th>Gross Wt</th>
                    <th className="text-center">Qty</th>
                    <th className="text-right">Total Wt</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="order-modal-empty-search">
                        <div className="py-8 text-center">
                          <Search size={24} className="mx-auto text-stone-300 mb-2" />
                          <p className="text-stone-600 font-semibold text-xs">
                            No styles match "{search}"
                          </p>
                          <button
                            type="button"
                            onClick={() => setSearch('')}
                            className="mt-2 text-xs font-bold text-emerald-700 underline cursor-pointer"
                          >
                            Clear Filter
                          </button>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedItems.map((item) => {
                      const imgUrl = item.imageUrl
                        ? item.imageUrl.startsWith('http')
                          ? item.imageUrl
                          : `${API_BASE}${item.imageUrl}`
                        : null;

                      const rowGross = (
                        (Number(item.grossWeight) || 0) * (Number(item.quantity) || 1)
                      ).toFixed(2);

                      return (
                        <tr key={item._id || `${item.styleCode}-${item._originalIndex}`}>
                          <td className="order-modal-index-col">
                            {item._originalIndex}
                          </td>
                          <td>
                            <div
                              className="order-modal-product-thumb"
                              onClick={() => {
                                if (imgUrl) {
                                  setPreviewImage({
                                    url: imgUrl,
                                    title: `${item.styleCode} (${item.kt || '22KT'}) • ${
                                      item.categoryName || ''
                                    }`
                                  });
                                }
                              }}
                              title={imgUrl ? 'Click to view enlarged CAD image' : 'No image available'}
                            >
                              {imgUrl ? (
                                <img src={imgUrl} alt={item.styleCode} loading="lazy" />
                              ) : (
                                <Gem size={18} className="text-stone-400" />
                              )}
                            </div>
                          </td>

                          <td>
                            <div className="order-modal-product-title-row">
                              <span className="order-modal-style-code">{item.styleCode}</span>
                              <button
                                type="button"
                                onClick={() => handleCopyOrderId(item.styleCode)}
                                className="order-modal-code-copy"
                                title="Copy Code"
                              >
                                {copiedId === item.styleCode ? (
                                  <Check size={11} className="text-emerald-600" />
                                ) : (
                                  <Copy size={11} />
                                )}
                              </button>
                            </div>
                            <span className="order-modal-category-sub" title={item.categoryName}>
                              {item.categoryName || item.item || 'Jewellery'}
                            </span>
                          </td>

                          <td>
                            {item.kt ? (
                              <span className="order-modal-karat-pill">{item.kt}</span>
                            ) : (
                              <span className="text-stone-400">—</span>
                            )}
                          </td>

                          <td className="order-modal-unit-wt">
                            {Number(item.grossWeight || 0).toFixed(2)} g
                          </td>

                          <td className="text-center">
                            <span className="order-modal-qty-chip">
                              {item.quantity || 1}
                            </span>
                          </td>

                          <td className="text-right order-modal-row-total">
                            {rowGross} g
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls for 10+ Items */}
            {allItems.length > 10 && (
              <div className="order-modal-pagination">
                <div className="order-modal-pagination-info">
                  Showing <strong>{totalFiltered > 0 ? startIndex + 1 : 0}–{endIndex}</strong> of{' '}
                  <strong>{totalFiltered}</strong> styles
                  {search && (
                    <span className="order-modal-pagination-sub">
                      {' '}
                      (filtered from {allItems.length})
                    </span>
                  )}
                </div>

                <div className="order-modal-pagination-actions">
                  <div className="order-modal-page-nav">
                    <button
                      type="button"
                      disabled={page <= 1 || isAll}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      className="order-modal-page-btn"
                      title="Previous Page"
                    >
                      <ChevronLeft size={13} />
                      <span>Prev</span>
                    </button>

                    <span className="order-modal-page-indicator">
                      Page <strong>{isAll ? 1 : page}</strong> of <strong>{totalPages}</strong>
                    </span>

                    <button
                      type="button"
                      disabled={page >= totalPages || isAll}
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      className="order-modal-page-btn"
                      title="Next Page"
                    >
                      <span>Next</span>
                      <ChevronRight size={13} />
                    </button>
                  </div>

                  <div className="order-modal-pagesize-group">
                    <label className="order-modal-pagesize-label">Per page:</label>
                    <select
                      value={pageSize}
                      onChange={(e) => {
                        const val = e.target.value === 'All' ? 'All' : Number(e.target.value);
                        setPageSize(val);
                        setPage(1);
                      }}
                      className="order-modal-pagesize-select"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                      <option value="All">All ({allItems.length})</option>
                    </select>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Dossier Card 3: Executive Order Totals Summary */}
          <div className="order-modal-totals-banner">
            <div className="order-modal-totals-col">
              <span className="order-modal-totals-label">Unique Designs</span>
              <div className="order-modal-totals-val">
                {order.totalItems || order.items?.length || 0}
              </div>
            </div>

            <div className="order-modal-totals-divider" />

            <div className="order-modal-totals-col">
              <span className="order-modal-totals-label">Total Quantity</span>
              <div className="order-modal-totals-val">
                {order.totalQuantity} <span className="order-modal-totals-unit">pcs</span>
              </div>
            </div>

            <div className="order-modal-totals-divider" />

            <div className="order-modal-totals-col gold">
              <span className="order-modal-totals-label gold">Total Gross Weight</span>
              <div className="order-modal-totals-val gold">
                {Number(order.totalGrossWeight || 0).toFixed(2)}{' '}
                <span className="order-modal-totals-unit gold">g</span>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Modal Footer */}
        <div className="order-modal-footer">
          <button
            type="button"
            onClick={onClose}
            className="order-modal-footer-close-btn"
          >
            Close Details
          </button>

          <div className="order-modal-footer-actions flex items-center gap-3">
            {pdfFullUrl && (
              <button
                type="button"
                disabled={actionLoading}
                onClick={(e) => onDownloadPdf(e, order._id, order.orderNumber)}
                className="order-modal-download-pdf-btn"
                title="Download Official CAD / Order PDF"
              >
                <FileDown size={15} className={actionLoading ? 'animate-bounce' : ''} />
                <span>{actionLoading ? 'Generating...' : 'Download Production PDF'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

const OrdersManagement = ({ orderType = 'Regular' }) => {
  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState({
    all: 0,
    pending: 0,
    confirmed: 0,
    inProduction: 0,
    completed: 0,
    cancelled: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);

  // Detail Modal
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);
  const [copiedId, setCopiedId] = useState(null);

  // Delete Confirmation Modal State
  const [deleteModal, setDeleteModal] = useState({
    open: false,
    orderId: null,
    orderNumber: '',
    customerName: '',
    totalQuantity: 0,
    totalGrossWeight: 0,
    isLoading: false
  });

  // Action status feedback
  const [actionFeedback, setActionFeedback] = useState({ message: '', type: 'info' });
  const [actionLoading, setActionLoading] = useState(false);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError('');
      const params = {
        page,
        limit: 18,
        orderType,
        ...(statusFilter !== 'All' && { status: statusFilter }),
        ...(searchTerm.trim() && { search: searchTerm.trim() }),
        ...(startDate && { startDate }),
        ...(endDate && { endDate })
      };

      const res = await orderApi.getAdminOrders(params);
      if (res.success) {
        setOrders(res.orders || []);
        setTotalOrders(res.total || 0);
        setTotalPages(res.pages || 1);
        if (res.counts) {
          setCounts(res.counts);
        }
      } else {
        throw new Error(res.message || 'Failed to fetch customer orders');
      }
    } catch (err) {
      setError(err.message || 'Failed to load customer orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [page, statusFilter, orderType, startDate, endDate]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchOrders();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  const showFeedback = (message, type = 'success') => {
    setActionFeedback({ message, type });
    setTimeout(() => {
      setActionFeedback({ message: '', type: 'info' });
    }, 3500);
  };

  // Status update
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      setActionLoading(true);
      const res = await orderApi.updateOrderStatus(orderId, newStatus);
      if (res.success) {
        showFeedback(`Order status updated to '${newStatus}'`);
        setOrders((prev) =>
          prev.map((ord) => (ord._id === orderId ? { ...ord, status: newStatus } : ord))
        );
        if (selectedOrder && selectedOrder._id === orderId) {
          setSelectedOrder((prev) => ({ ...prev, status: newStatus }));
        }
        const countRes = await orderApi.getAdminOrders({ limit: 1 });
        if (countRes.counts) setCounts(countRes.counts);
      }
    } catch (err) {
      showFeedback(err.message || 'Failed to update order status', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Open custom delete confirmation modal
  const handleDeleteOrder = (ord) => {
    setDeleteModal({
      open: true,
      orderId: ord._id,
      orderNumber: ord.orderNumber,
      customerName: ord.customerName || 'Customer',
      totalQuantity: ord.totalQuantity || 1,
      totalGrossWeight: ord.totalGrossWeight || 0,
      isLoading: false
    });
  };

  // Perform confirmed deletion
  const handleConfirmDelete = async () => {
    if (!deleteModal.orderId) return;
    try {
      setDeleteModal((prev) => ({ ...prev, isLoading: true }));
      const res = await orderApi.deleteOrder(deleteModal.orderId);
      if (res.success) {
        showFeedback(`Order ${deleteModal.orderNumber} deleted successfully`);
        if (selectedOrder && selectedOrder._id === deleteModal.orderId) {
          setSelectedOrder(null);
        }
        setDeleteModal({
          open: false,
          orderId: null,
          orderNumber: '',
          customerName: '',
          totalQuantity: 0,
          totalGrossWeight: 0,
          isLoading: false
        });
        fetchOrders();
      } else {
        throw new Error(res.message || 'Failed to delete order');
      }
    } catch (err) {
      showFeedback(err.message || 'Failed to delete order', 'error');
      setDeleteModal((prev) => ({ ...prev, isLoading: false }));
    }
  };

  // Resend WhatsApp notification
  const handleResendWhatsApp = async (orderId, orderNum) => {
    try {
      setActionLoading(true);
      const res = await orderApi.resendWhatsApp(orderId);
      if (res.success) {
        showFeedback(`WhatsApp notification dispatched for order ${orderNum}`);
        if (selectedOrder && selectedOrder._id === orderId) {
          setSelectedOrder((prev) => ({
            ...prev,
            whatsappDispatches: res.whatsappDispatches
          }));
        }
      }
    } catch (err) {
      showFeedback(err.message || 'Failed to resend WhatsApp notification', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Copy Order ID helper
  const handleCopyOrderId = (id) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Direct Order PDF download to local disk
  const handleDownloadPdf = async (e, orderId, orderNumber) => {
    if (e) e.preventDefault();
    try {
      setActionLoading(true);
      const downloadUrl = `${API_BASE}/api/orders/${orderId}/pdf`;
      const res = await fetch(downloadUrl);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `SG_Order_${orderNumber || orderId}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(blobUrl), 1000);
    } catch (err) {
      console.error('Download error, falling back to direct URL:', err);
      window.location.href = `${API_BASE}/api/orders/${orderId}/pdf`;
    } finally {
      setActionLoading(false);
    }
  };

  // Orders sorted by newest
  const processedOrders = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  // Calculate cumulative stats from loaded orders
  const cumulativeGrossWeight = orders.reduce(
    (sum, o) => sum + Number(o.totalGrossWeight || 0),
    0
  );
  const cumulativeQuantity = orders.reduce(
    (sum, o) => sum + Number(o.totalQuantity || 0),
    0
  );

  return (
    <div className="orders-page-root">
      {/* Action Feedback Banner */}
      {actionFeedback.message && (
        <div
          className={`orders-feedback-banner ${
            actionFeedback.type === 'error' ? 'feedback-error' : 'feedback-success'
          }`}
        >
          {actionFeedback.type === 'error' ? <AlertCircle size={16} /> : <CheckCircle2 size={16} />}
          <span className="font-semibold">{actionFeedback.message}</span>
        </div>
      )}

      {/* 2. EXECUTIVE KPI STATS CARDS */}
      <div className="orders-kpi-grid">
        <div
          className={`orders-kpi-card all ${statusFilter === 'All' ? 'active-kpi' : ''}`}
          onClick={() => {
            setStatusFilter('All');
            setPage(1);
          }}
          title="Filter all orders"
        >
          <div className="orders-kpi-icon-wrap all">
            <ShoppingBag size={22} />
          </div>
          <div className="orders-kpi-info">
            <span className="orders-kpi-label">Total Orders</span>
            <div className="orders-kpi-value">{counts.all}</div>
            <div className="orders-kpi-sub">
              <span className="orders-kpi-pill">
                {cumulativeQuantity} pcs • {cumulativeGrossWeight.toFixed(1)}g gross
              </span>
            </div>
          </div>
        </div>

        <div
          className={`orders-kpi-card pending ${statusFilter === 'Pending' ? 'active-kpi' : ''}`}
          onClick={() => {
            setStatusFilter('Pending');
            setPage(1);
          }}
          title="Filter pending confirmation"
        >
          <div className="orders-kpi-icon-wrap pending">
            <Clock size={22} />
          </div>
          <div className="orders-kpi-info">
            <span className="orders-kpi-label">Pending Review</span>
            <div className="orders-kpi-value text-amber-600">{counts.pending}</div>
            <div className="orders-kpi-sub">
              <span className="orders-kpi-pill amber">Awaiting confirmation</span>
            </div>
          </div>
        </div>

        <div
          className={`orders-kpi-card production ${statusFilter === 'In Production' ? 'active-kpi' : ''}`}
          onClick={() => {
            setStatusFilter('In Production');
            setPage(1);
          }}
          title="Filter in production & casting"
        >
          <div className="orders-kpi-icon-wrap production">
            <Layers size={22} />
          </div>
          <div className="orders-kpi-info">
            <span className="orders-kpi-label">In Casting &amp; Production</span>
            <div className="orders-kpi-value text-blue-600">
              {counts.confirmed + counts.inProduction}
            </div>
            <div className="orders-kpi-sub">
              <span className="orders-kpi-pill blue">Active casting batch</span>
            </div>
          </div>
        </div>

        <div
          className={`orders-kpi-card completed ${statusFilter === 'Completed' ? 'active-kpi' : ''}`}
          onClick={() => {
            setStatusFilter('Completed');
            setPage(1);
          }}
          title="Filter completed orders"
        >
          <div className="orders-kpi-icon-wrap completed">
            <Award size={22} />
          </div>
          <div className="orders-kpi-info">
            <span className="orders-kpi-label">Completed &amp; Hallmarked</span>
            <div className="orders-kpi-value text-emerald-600">{counts.completed}</div>
            <div className="orders-kpi-sub">
              <span className="orders-kpi-pill emerald">BIS certified &amp; ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. TOOLBAR CONTROLS & FILTERS */}
      <div className="orders-controls-card">
        {/* Search Bar & Results Counter */}
        <div className="orders-filter-toolbar">
          <div className="flex items-stretch gap-3 flex-1 flex-wrap">
            <div className="orders-search-wrapper">
              <Search size={16} className="orders-search-icon" />
              <input
                type="text"
                placeholder="Search Order ID, customer name, mobile, style code..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="orders-search-input"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm('')}
                  className="orders-clear-search"
                  title="Clear search"
                >
                  <X size={14} />
                </button>
              )}
            </div>
            <div className="flex items-center bg-[#f7fcfb] border-[1.5px] border-[#c2ded8] rounded-full h-[40px] px-4 shadow-sm transition-all focus-within:border-[#4a756b] focus-within:ring-4 focus-within:ring-[#4a756b]/10 hover:border-[#96b8b0]">
              <Calendar size={15} className="text-[#4a756b] mr-2" />
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => { setStartDate(e.target.value); setPage(1); }} 
                className="text-[13px] font-semibold bg-transparent border-none outline-none text-[#13392e] cursor-pointer"
                title="Start Date"
              />
              <div className="flex items-center px-3 h-full">
                <span className="text-[#84a39b] font-bold text-[10px] uppercase tracking-widest">To</span>
              </div>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => { setEndDate(e.target.value); setPage(1); }} 
                className="text-[13px] font-semibold bg-transparent border-none outline-none text-[#13392e] cursor-pointer"
                title="End Date"
              />
            </div>
          </div>

          <div className="orders-toolbar-meta">
            <span className="orders-count-indicator">
              Showing <strong>{processedOrders.length}</strong> of <strong>{totalOrders}</strong> orders
            </span>
            {(statusFilter !== 'All' || searchTerm || startDate || endDate) && (
              <button
                type="button"
                onClick={() => {
                  setStatusFilter('All');
                  setSearchTerm('');
                  setStartDate('');
                  setEndDate('');
                  setPage(1);
                }}
                className="orders-reset-filter-btn"
                title="Reset all filters"
              >
                Reset Filters
              </button>
            )}

            <button
              type="button"
              onClick={fetchOrders}
              className="orders-refresh-btn toolbar"
              title="Refresh Feed"
              disabled={loading}
            >
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>{loading ? 'Refreshing...' : 'Refresh Feed'}</span>
            </button>
          </div>
        </div>

        {/* Status Segmented Tabs */}
        <div className="orders-status-tabs">
          {[
            { id: 'All', label: 'All Orders', count: counts.all, dotClass: 'all' },
            { id: 'Pending', label: 'Pending', count: counts.pending, dotClass: 'pending' },
            { id: 'Confirmed', label: 'Confirmed', count: counts.confirmed, dotClass: 'confirmed' },
            { id: 'In Production', label: 'In Production', count: counts.inProduction, dotClass: 'production' },
            { id: 'Completed', label: 'Completed', count: counts.completed, dotClass: 'completed' },
            { id: 'Cancelled', label: 'Cancelled', count: counts.cancelled, dotClass: 'cancelled' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(1);
              }}
              className={`orders-status-tab ${statusFilter === tab.id ? 'active' : ''}`}
            >
              <span className={`orders-status-dot ${tab.dotClass}`} />
              <span className="orders-tab-label">{tab.label}</span>
              <span className="orders-tab-count">{tab.count}</span>
            </button>
          ))}
        </div>

        {/* =========================================================
            PRESENTATION: EXECUTIVE DATA TABLE
           ========================================================= */}
        <div className="admin-table-container">
          <table className="admin-table orders-table">
            <thead>
              <tr>
                <th>Order Number</th>
                <th>Customer &amp; Mobile</th>
                <th>Channel</th>
                <th>Style Code(s) &amp; Design</th>
                <th>Quantity</th>
                <th>Gross Wt</th>
                <th>Status</th>
                <th>Date &amp; Time</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="text-center py-16">
                    <div className="orders-loading-spinner" />
                    <p className="orders-loading-text">Loading orders pipeline...</p>
                  </td>
                </tr>
              ) : processedOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="text-center py-16">
                    <div className="orders-empty-state">
                      <div className="orders-empty-icon">
                        <ShoppingBag size={32} />
                      </div>
                      <h4 className="orders-empty-title">No orders match the selected filter</h4>
                      <p className="orders-empty-subtitle">
                        Try clearing search terms or selecting another status tab
                      </p>
                    </div>
                  </td>
                </tr>
              ) : (
                processedOrders.map((ord) => {
                  const pdfFullUrl = `${API_BASE}/api/orders/${ord._id}/pdf`;
                  const statusClass = (ord.status || 'Pending').toLowerCase().replace(/\s+/g, '-');
                  const itemsList = ord.items || [];
                  const firstItem = itemsList[0];
                  const imgUrl = firstItem?.imageUrl
                    ? firstItem.imageUrl.startsWith('http')
                      ? firstItem.imageUrl
                      : `${API_BASE}${firstItem.imageUrl}`
                    : null;
                  const dateInfo = formatDate(ord.createdAt);

                  return (
                    <tr key={ord._id} className="orders-table-row">
                      {/* 1. Order Number */}
                      <td className="orders-td-number">
                        <div className="orders-id-group">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(ord)}
                            className="orders-id-btn"
                            title="View order details"
                          >
                            <span>{ord.orderNumber}</span>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyOrderId(ord.orderNumber);
                            }}
                            className="orders-copy-btn"
                            title="Copy order number"
                          >
                            {copiedId === ord.orderNumber ? (
                              <Check size={12} className="text-emerald-600" />
                            ) : (
                              <Copy size={12} />
                            )}
                          </button>
                        </div>
                        <span className="orders-designs-count">
                          {itemsList.length} unique design{itemsList.length > 1 ? 's' : ''}
                        </span>
                      </td>

                      {/* 2. Customer & Contact */}
                      <td className="orders-td-customer">
                        <div className="orders-customer-block">
                          <div className="orders-customer-name" title="Customer / Business Name">
                            {ord.customerName}
                          </div>
                          {ord.orderedBy && ord.orderedBy !== ord.customerName && (
                            <div className="orders-ordered-by-pill" title="Order Placed By">
                              <User size={10} className="orders-ordered-by-icon" />
                              <span>Ordered by: <strong>{ord.orderedBy}</strong></span>
                            </div>
                          )}
                          <div className="orders-phone-row">
                            <span className="orders-phone-text">
                              {formatPhone(ord.customerPhone)}
                            </span>
                          </div>
                          {(ord.remark || ord.notes) && (
                            <div className="orders-remark-pill" title={`Customer Remark: ${ord.remark || ord.notes}`}>
                              <MessageSquare size={10} className="orders-remark-pill-icon" />
                              <span className="orders-remark-pill-text">Remark: "{ord.remark || ord.notes}"</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* 3. Channel */}
                      <td className="orders-td-channel">
                        <span
                          className={`orders-channel-tag ${
                            ord.orderSource === 'With Login'
                              ? 'login'
                              : ord.orderSource === 'Customer Portal'
                              ? 'portal'
                              : 'direct'
                          }`}
                        >
                          {ord.orderSource === 'With Login' ? (
                            <>
                              <ShieldCheck size={11} />
                              <span>With Login</span>
                            </>
                          ) : ord.orderSource === 'Customer Portal' ? (
                            <>
                              <Globe size={11} />
                              <span>Customer Portal</span>
                            </>
                          ) : (
                            <>
                              <LinkIcon size={11} />
                              <span>Direct Link</span>
                            </>
                          )}
                        </span>
                      </td>

                      {/* 4. Style Code & Design with Visual Thumbnail */}
                      <td className="orders-td-styles">
                        <div className="orders-style-cell">
                          <div
                            className="orders-table-thumb"
                            onClick={() => {
                              if (imgUrl) {
                                setPreviewImage({
                                  url: imgUrl,
                                  title: `${firstItem.styleCode} (${firstItem.kt || '22KT'}) • ${firstItem.categoryName || ''}`
                                });
                              } else {
                                setSelectedOrder(ord);
                              }
                            }}
                            title={imgUrl ? "Click to preview design image" : "Click to view order details"}
                          >
                            {imgUrl ? (
                              <img src={imgUrl} alt={firstItem?.styleCode || 'Style'} />
                            ) : (
                              <Gem size={18} className="orders-thumb-fallback-icon" />
                            )}
                          </div>

                          <div className="orders-style-info">
                            <div className="orders-style-title-row">
                              <span className="orders-style-code">{firstItem?.styleCode || '—'}</span>
                              {firstItem?.kt && (
                                <span className="orders-purity-badge">{firstItem.kt}</span>
                              )}
                            </div>
                            <span className="orders-category-name" title={firstItem?.categoryName}>
                              {firstItem?.quantity || 1} pc{(firstItem?.quantity || 1) > 1 ? 's' : ''} • {firstItem?.categoryName || firstItem?.item || 'Jewellery'}
                            </span>
                            {itemsList.length > 1 && (
                              <button
                                type="button"
                                onClick={() => setSelectedOrder(ord)}
                                className="orders-more-styles-btn"
                              >
                                +{itemsList.length - 1} more designs
                              </button>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 5. Quantity */}
                      <td className="orders-td-qty">
                        <div className="orders-qty-pill">
                          <strong className="orders-qty-num">{ord.totalQuantity}</strong>
                          <span className="orders-qty-unit">pcs</span>
                        </div>
                      </td>

                      {/* 6. Gross Weight */}
                      <td className="orders-td-weight">
                        <div className="orders-weight-badge">
                          <span className="orders-weight-val">
                            {Number(ord.totalGrossWeight || 0).toFixed(2)}
                          </span>
                          <span className="orders-weight-unit">g</span>
                        </div>
                      </td>

                      {/* 7. Status */}
                      <td className="orders-td-status">
                        <div className={`orders-status-select-wrap ${statusClass}`}>
                          <span className={`orders-select-status-dot ${statusClass}`} />
                          <select
                            value={ord.status}
                            onChange={(e) => handleStatusChange(ord._id, e.target.value)}
                            disabled={actionLoading}
                            className={`orders-select-field ${statusClass}`}
                          >
                            {STATUS_OPTIONS.map((st) => (
                              <option key={st} value={st}>
                                {st}
                              </option>
                            ))}
                          </select>
                          <ChevronDown size={12} className="orders-select-arrow" />
                        </div>
                      </td>

                      {/* 8. Date & Time */}
                      <td className="orders-td-date">
                        <div className="orders-date-wrap">
                          <span className="orders-date-primary">{dateInfo.date}</span>
                          <span className="orders-time-secondary">
                            <Clock size={11} className="orders-clock-icon" />
                            <span>{dateInfo.time}</span>
                          </span>
                        </div>
                      </td>

                      {/* 9. Actions */}
                      <td className="orders-td-actions">
                        <div className="orders-actions-cluster">
                          <button
                            type="button"
                            onClick={() => setSelectedOrder(ord)}
                            className="orders-btn-action view"
                            title="View Full Order Details"
                          >
                            <Eye size={14} />
                            <span>View</span>
                          </button>

                          {pdfFullUrl && (
                            <button
                              type="button"
                              onClick={(e) => handleDownloadPdf(e, ord._id, ord.orderNumber)}
                              className="orders-btn-action pdf"
                              title="Download CAD / Order PDF"
                            >
                              <FileDown size={14} />
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteOrder(ord)}
                            className="orders-btn-action delete"
                            title="Delete Order"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-border-subtle flex items-center justify-between text-xs text-text-muted">
            <div>
              Showing page <strong>{page}</strong> of <strong>{totalPages}</strong> ({totalOrders} total orders)
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="btn-outline-brand text-xs py-1 px-3"
              >
                Previous
              </button>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="btn-outline-brand text-xs py-1 px-3"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* =============================================================
          ORDER DETAILS MODAL (FOCUSED ONLY ON ORDER DETAILS)
         ============================================================= */}
      {selectedOrder && (
        <OrderDetailsModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onDownloadPdf={handleDownloadPdf}
          actionLoading={actionLoading}
          setPreviewImage={setPreviewImage}
          copiedId={copiedId}
          handleCopyOrderId={handleCopyOrderId}
        />
      )}

      {/* Lightbox Zoom */}
      {previewImage && (
        <div className="admin-modal-backdrop z-[1200]" onClick={() => setPreviewImage(null)}>
          <div className="max-w-xl p-2 bg-white rounded-lg shadow-2xl relative" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 bg-black/60 text-white rounded-full p-2 hover:bg-black"
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

      {/* Custom Delete Confirmation Modal */}
      <AdminConfirmModal
        isOpen={deleteModal.open}
        onClose={() => {
          if (!deleteModal.isLoading) {
            setDeleteModal((prev) => ({ ...prev, open: false }));
          }
        }}
        onConfirm={handleConfirmDelete}
        isLoading={deleteModal.isLoading}
        title="Delete Customer Order"
        subtitle="Commercial Orders"
        description="Are you sure you want to permanently delete this commercial order and its CAD job records?"
        itemName={deleteModal.orderNumber}
        details={
          <>
            <div className="admin-delete-details-row">
              <span className="admin-delete-details-label">Customer:</span>
              <span className="admin-delete-details-value">{deleteModal.customerName}</span>
            </div>
            <div className="admin-delete-details-row">
              <span className="admin-delete-details-label">Volume &amp; Weight:</span>
              <span className="admin-delete-details-value">
                {deleteModal.totalQuantity} pcs • {Number(deleteModal.totalGrossWeight || 0).toFixed(2)}g Gross
              </span>
            </div>
          </>
        }
        warning={null}
        confirmText="Delete Order"
        cancelText="Cancel"
      />
    </div>
  );
};

export default OrdersManagement;
