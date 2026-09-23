import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Layers,
  FileSpreadsheet,
  Inbox,
  ArrowUpRight,
  Clock,
  AlertCircle,
  FileDown
} from 'lucide-react';
import { adminApi, BASE_URL } from '../../../services/api';
import { formatDateIST, formatTimeIST } from '../../../utils/dateUtils';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getDashboardStats();
      if (res.success) {
        setStats(res.stats);
      }
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="w-10 h-10 border-3 border-brand-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm font-medium" style={{ color: 'var(--admin-text-secondary)' }}>
            Loading executive intelligence...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="admin-card border-red-200 bg-red-50 text-red-700 p-6 flex items-center gap-4">
        <AlertCircle size={24} className="flex-shrink-0" />
        <div>
          <h3 className="font-semibold text-base sm:text-lg">Error loading dashboard</h3>
          <p className="text-xs sm:text-sm">{error}</p>
        </div>
      </div>
    );
  }

  const { customers, categories, styles, orders, latestExcel } = stats || {};

  return (
    <div style={{ maxWidth: '100%' }}>
      {/* Executive Page Banner & Toolbar */}
      <div className="admin-page-header-banner" style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div className="admin-banner-title-group">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#19241A', background: '#EAF2F0', border: '1px solid #9CBDB7', padding: '3px 12px', borderRadius: '9999px' }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#19241A' }}></span>
              Executive Console
            </span>
          </div>
          <h1 style={{ fontFamily: 'var(--font-serif, serif)', fontSize: 'clamp(1.6rem, 2.4vw, 2.2rem)', fontWeight: 700, color: '#19241A', margin: 0, letterSpacing: '-0.01em' }}>
            Operations &amp; Intelligence Overview
          </h1>
          <p className="admin-banner-subtitle" style={{ color: 'rgba(25, 36, 26, 0.7)', fontSize: '0.86rem', marginTop: '4px', margin: '4px 0 0 0' }}>
            Real-time telemetry across jewellery manufacturing orders, retail partners, and inventory catalogues.
          </p>
        </div>

        {/* Quick Action Toolbar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <Link to="/admin/customers" className="btn-outline-brand">
            <Users size={17} />
            <span>Manage Customers</span>
          </Link>
          <Link to="/admin/excel-stock" className="btn-brand">
            <FileSpreadsheet size={17} />
            <span>Upload Excel</span>
          </Link>
        </div>
      </div>

      {/* 5 Stat Cards */}
      <div className="admin-stats-grid">
        {/* Card 1: Total Customers */}
        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <Users size={22} />
          </div>
          <div className="stat-details">
            <div className="stat-label">Total Customers</div>
            <div className="stat-value">{customers?.total || 0}</div>
            <div className="stat-subtext truncate">
              <span style={{ color: '#19241A', fontWeight: 700 }}>{customers?.active || 0} Active</span> •{' '}
              <span style={{ color: 'rgba(25, 36, 26, 0.65)' }}>{customers?.inactive || 0} Inactive</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Categories */}
        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <Layers size={22} />
          </div>
          <div className="stat-details">
            <div className="stat-label">Active Categories</div>
            <div className="stat-value">{categories?.total || 0}</div>
            <div className="stat-subtext truncate">
              Across <strong style={{ color: '#19241A' }}>{styles?.total || 0}</strong> master styles
            </div>
          </div>
        </div>

        {/* Card 3: Customer Orders / Inquiries */}
        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <Inbox size={22} />
          </div>
          <div className="stat-details">
            <div className="stat-label">Customer Orders &amp; RFQs</div>
            <div className="stat-value">{orders?.total || 0}</div>
            <div className="stat-subtext truncate">
              <span style={{ color: '#92400E', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#D97706', display: 'inline-block' }}></span>
                {orders?.pending || 0} Pending Review
              </span>
            </div>
          </div>
        </div>

        {/* Card 4: Make Stock Orders */}
        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <Layers size={22} />
          </div>
          <div className="stat-details">
            <div className="stat-label">Make Stock Orders</div>
            <div className="stat-value">{stats?.makeStock?.total || 0}</div>
            <div className="stat-subtext truncate">
              <span style={{ color: '#19241A', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#19241A', display: 'inline-block' }}></span>
                {stats?.makeStock?.pending || 0} Pending
              </span>
            </div>
          </div>
        </div>

        {/* Card 5: Latest Excel Upload */}
        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <FileSpreadsheet size={22} />
          </div>
          <div className="stat-details">
            <div className="stat-label">Latest Stock Sync</div>
            <div
              className="stat-value"
              style={{ fontSize: '1.25rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              title={latestExcel?.fileName || 'No upload recorded'}
            >
              {latestExcel ? latestExcel.fileName : 'None'}
            </div>
            <div
              className="stat-subtext truncate"
              title={
                latestExcel
                  ? `${formatDateIST(latestExcel.uploadDateTime)} ${formatTimeIST(latestExcel.uploadDateTime)}`
                  : undefined
              }
            >
              {latestExcel ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', color: '#19241A' }}>
                  <Clock size={12} />
                  <span>
                    {formatDateIST(latestExcel.uploadDateTime)}{' '}
                    {formatTimeIST(latestExcel.uploadDateTime)}
                  </span>
                </span>
              ) : (
                'Pending first sync'
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Customer Inquiries / Recent Orders */}
      <div className="admin-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', marginBottom: '16px', borderBottom: '1.5px solid var(--admin-border-subtle)', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h3 style={{ fontFamily: 'var(--font-serif, serif)', fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#19241A' }}>
              Recent Customer Orders
            </h3>
            <span className="badge-status badge-active">
              {orders?.recent?.length || 0} Recent
            </span>
          </div>

          <Link
            to="/admin/orders"
            className="btn-sub-action"
          >
            <span>Manage All Orders</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table" style={{ minWidth: '650px' }}>
            <thead>
              <tr>
                <th>Client</th>
                <th>Contact</th>
                <th>Category / Order</th>
                <th>Status</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {orders?.recent && orders.recent.length > 0 ? (
                orders.recent.map((ord) => (
                  <tr key={ord._id}>
                    <td>
                      <strong style={{ color: '#19241A', fontSize: '0.9rem', display: 'block', fontWeight: 700 }}>{ord.fullName}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(25, 36, 26, 0.65)', fontWeight: 500 }}>{ord.companyName || 'Retail Partner'}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.84rem', display: 'block', color: '#19241A', fontWeight: 600 }}>{ord.phone}</span>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(25, 36, 26, 0.65)' }}>{ord.email}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#19241A' }}>{ord.subject}</span>
                        {ord.pdfUrl && (
                          <a
                            href={ord.pdfUrl.startsWith('http') ? ord.pdfUrl : `${BASE_URL}${ord.pdfUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#19241A', display: 'inline-flex', alignItems: 'center', padding: '4px 7px', borderRadius: '6px', background: '#EAF2F0', border: '1px solid #9CBDB7', transition: 'all 0.2s' }}
                            title="Download Order Specification PDF"
                          >
                            <FileDown size={14} />
                          </a>
                        )}
                      </div>
                      {ord.styles && ord.styles.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', marginTop: '6px' }}>
                          {ord.styles.slice(0, 3).map((st, i) => (
                            <span key={i} style={{ fontFamily: 'monospace', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '5px', background: '#EAF2F0', color: '#19241A', border: '1px solid #DCE7E4' }}>
                              {st}
                            </span>
                          ))}
                          {ord.styles.length > 3 && (
                            <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(25, 36, 26, 0.6)' }}>+{ord.styles.length - 3}</span>
                          )}
                        </div>
                      )}
                      <span style={{ fontSize: '0.75rem', color: 'rgba(25, 36, 26, 0.65)', display: 'block', marginTop: '4px', fontWeight: 500 }}>{ord.category} • {ord.estimatedVolume}</span>
                    </td>
                    <td>
                      <span
                        className={`badge-status ${
                          ord.status === 'New' || ord.status === 'Pending'
                            ? 'badge-pending'
                            : ord.status === 'Closed' || ord.status === 'Completed'
                            ? 'badge-active'
                            : 'badge-retrying'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'rgba(25, 36, 26, 0.75)', whiteSpace: 'nowrap', fontWeight: 500 }}>
                      {formatDateIST(ord.createdAt)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'rgba(25, 36, 26, 0.6)' }}>
                    No customer orders recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Make Stock Orders */}
      <div className="admin-card" style={{ marginTop: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingBottom: '16px', marginBottom: '16px', borderBottom: '1.5px solid var(--admin-border-subtle)', flexWrap: 'wrap', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h3 style={{ fontFamily: 'var(--font-serif, serif)', fontSize: '1.35rem', fontWeight: 700, margin: 0, color: '#19241A' }}>
              Recent Make Stock Orders
            </h3>
            <span className="badge-status badge-active">
              {stats?.makeStock?.recent?.length || 0} Recent
            </span>
          </div>

          <Link
            to="/admin/make-stock-orders"
            className="btn-sub-action"
          >
            <span>Manage Make Stock Orders</span>
            <ArrowUpRight size={14} />
          </Link>
        </div>

        <div className="admin-table-wrapper">
          <table className="admin-table" style={{ minWidth: '650px' }}>
            <thead>
              <tr>
                <th>Client</th>
                <th>Contact</th>
                <th>Category / Order</th>
                <th>Status</th>
                <th>Received</th>
              </tr>
            </thead>
            <tbody>
              {stats?.makeStock?.recent && stats.makeStock.recent.length > 0 ? (
                stats.makeStock.recent.map((ord) => (
                  <tr key={ord._id}>
                    <td>
                      <strong style={{ color: '#19241A', fontSize: '0.9rem', display: 'block', fontWeight: 700 }}>{ord.fullName}</strong>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(25, 36, 26, 0.65)', fontWeight: 500 }}>{ord.companyName || 'Retail Partner'}</span>
                    </td>
                    <td>
                      <span style={{ fontSize: '0.84rem', display: 'block', color: '#19241A', fontWeight: 600 }}>{ord.phone}</span>
                      <span style={{ fontSize: '0.75rem', color: 'rgba(25, 36, 26, 0.65)' }}>{ord.email}</span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.88rem', fontWeight: 700, color: '#19241A' }}>{ord.subject}</span>
                        {ord.pdfUrl && (
                          <a
                            href={ord.pdfUrl.startsWith('http') ? ord.pdfUrl : `${BASE_URL}${ord.pdfUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ color: '#19241A', display: 'inline-flex', alignItems: 'center', padding: '4px 7px', borderRadius: '6px', background: '#EAF2F0', border: '1px solid #9CBDB7', transition: 'all 0.2s' }}
                            title="Download Order Specification PDF"
                          >
                            <FileDown size={14} />
                          </a>
                        )}
                      </div>
                      {ord.styles && ord.styles.length > 0 && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap', marginTop: '6px' }}>
                          {ord.styles.slice(0, 3).map((st, i) => (
                            <span key={i} style={{ fontFamily: 'monospace', fontSize: '10px', fontWeight: 700, padding: '2px 7px', borderRadius: '5px', background: '#EAF2F0', color: '#19241A', border: '1px solid #DCE7E4' }}>
                              {st}
                            </span>
                          ))}
                          {ord.styles.length > 3 && (
                            <span style={{ fontSize: '10px', fontWeight: 700, color: 'rgba(25, 36, 26, 0.6)' }}>+{ord.styles.length - 3}</span>
                          )}
                        </div>
                      )}
                      <span style={{ fontSize: '0.75rem', color: 'rgba(25, 36, 26, 0.65)', display: 'block', marginTop: '4px', fontWeight: 500 }}>{ord.category} • {ord.estimatedVolume}</span>
                    </td>
                    <td>
                      <span
                        className={`badge-status ${
                          ord.status === 'New' || ord.status === 'Pending'
                            ? 'badge-pending'
                            : ord.status === 'Closed' || ord.status === 'Completed'
                            ? 'badge-active'
                            : 'badge-retrying'
                        }`}
                      >
                        {ord.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'rgba(25, 36, 26, 0.75)', whiteSpace: 'nowrap', fontWeight: 500 }}>
                      {formatDateIST(ord.createdAt)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '36px', color: 'rgba(25, 36, 26, 0.6)' }}>
                    No make stock orders recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
