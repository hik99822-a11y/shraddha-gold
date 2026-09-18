import React, { useState, useRef, useEffect } from 'react';
import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  Layers,
  Image,
  FileSpreadsheet,
  LogOut,
  Menu,
  X,
  ExternalLink,
  ShieldCheck,
  User,
  ChevronDown,
  ShoppingBag,
  Sparkles,
  Globe,
  FileArchive
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { orderApi } from '../services/api';
import '../pages/Admin/AdminCommon.css';

const AdminLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef(null);
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

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
  const [pendingCounts, setPendingCounts] = useState({ regular: 0, makeStock: 0 });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        const res = await orderApi.getPendingOrderCounts();
        if (res.success) {
          setPendingCounts(res.counts);
        }
      } catch (err) {
        console.error('Failed to fetch pending counts', err);
      }
    };
    
    fetchCounts();
    const interval = setInterval(fetchCounts, 60000); // 1 minute
    return () => clearInterval(interval);
  }, []);

  const navSections = [
    {
      title: 'OVERVIEW',
      items: [
        { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard }
      ]
    },
    {
      title: 'SALES & RELATIONS',
      items: [
        { name: 'Customers', path: '/admin/customers', icon: Users },
        { name: 'Orders', path: '/admin/orders', icon: ShoppingBag },
        { name: 'Make Stock Order', path: '/admin/make-stock-orders', icon: Layers }
      ]
    },
    {
      title: 'CATALOG & INVENTORY',
      items: [
        { name: 'Excel Stock', path: '/admin/excel-stock', icon: FileSpreadsheet },
        { name: 'Style Images', path: '/admin/style-images', icon: Image },
        { name: 'Categories', path: '/admin/categories', icon: Layers },
        { name: 'PDF Compress', path: '/admin/pdf-compress', icon: FileArchive }
      ]
    }
  ];

  const adminInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'S';

  return (
    <div className="admin-layout-root">
      {/* Sidebar Navigation (Desktop Fixed / Mobile Slide-in Drawer) */}
      <aside className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="admin-sidebar-header">
          <Link
            to="/admin/dashboard"
            onClick={() => setSidebarOpen(false)}
            className="admin-brand-link"
          >
            <img
              src="/Shraddha Gold India Pvt. Ltd - Black (1).png"
              alt="Shraddha Gold"
              className="admin-brand-logo"
            />
          </Link>
        </div>

        <nav className="admin-sidebar-nav">
          {navSections.map((section) => (
            <div key={section.title}>
              <div className="admin-nav-section-title">{section.title}</div>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.name}
                    to={item.path}
                    onClick={() => setSidebarOpen(false)}
                    className={({ isActive }) =>
                      `admin-nav-item ${isActive ? 'active' : ''}`
                    }
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <Icon size={18} className="flex-shrink-0" />
                        <span>{item.name}</span>
                      </div>
                      {item.name === 'Orders' && pendingCounts.regular > 0 && (
                        <span className="admin-nav-badge">
                          {pendingCounts.regular}
                        </span>
                      )}
                      {item.name === 'Make Stock Order' && pendingCounts.makeStock > 0 && (
                        <span className="admin-nav-badge">
                          {pendingCounts.makeStock}
                        </span>
                      )}
                    </div>
                  </NavLink>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Sidebar Footer System & User Status */}
        <div className="admin-sidebar-footer">
          <div className="admin-user-pill">
            <div className="admin-avatar">
              {adminInitial}
            </div>
            <div className="admin-user-details">
              <div className="admin-user-name">
                {user?.name || 'Administrator'}
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="admin-main-area">
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button
              className="admin-mobile-toggle-btn"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Open Sidebar Navigation"
            >
              <Menu size={20} />
            </button>
          </div>

          {/* Topbar Actions */}
          <div className="admin-topbar-actions" ref={userDropdownRef}>
            <Link
              to="/customer/portal"
              target="_blank"
              rel="noopener noreferrer"
              className="admin-topbar-site-link hidden sm:inline-flex"
              title="Open Customer Portal in new tab"
            >
              <Globe size={14} />
              <span>Customer Portal</span>
              <ExternalLink size={12} />
            </Link>

            {/* User Account Trigger Button */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                className={`admin-topbar-user-btn ${userDropdownOpen ? 'active' : ''}`}
                aria-expanded={userDropdownOpen}
                aria-haspopup="true"
                title="Account Menu"
              >
                <div className="admin-topbar-avatar">
                  {adminInitial}
                </div>
                <div className="admin-topbar-user-meta">
                  <span className="admin-topbar-user-name">
                    {user?.name?.split(' ')[0] || 'Shraddha'}
                  </span>
                  <span className="admin-topbar-user-badge">Super Admin</span>
                </div>
                <ChevronDown
                  size={14}
                  className={`admin-topbar-chevron ${userDropdownOpen ? 'rotated' : ''}`}
                />
              </button>

              {userDropdownOpen && (
                <div className="admin-user-dropdown" role="menu">
                  <div className="admin-dropdown-header">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="admin-topbar-avatar" style={{ width: 40, height: 40, fontSize: '1rem', background: 'linear-gradient(135deg, #f7f9f9, #eef2f1)', boxShadow: '0 2px 8px rgba(194,160,82,0.15)' }}>
                        {adminInitial}
                      </div>
                      <div style={{ minWidth: 0, flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--admin-text-primary)', letterSpacing: '-0.01em' }}>
                          {user?.name || 'Shraddha Gold'}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ padding: '8px' }}>
                    <Link
                      to="/admin/profile"
                      onClick={() => setUserDropdownOpen(false)}
                      className="admin-dropdown-item"
                      role="menuitem"
                      style={{ animationDelay: '0.05s' }}
                    >
                      <User size={16} style={{ color: 'var(--brand-dark)', opacity: 0.8 }} />
                      <span>Profile &amp; Security</span>
                    </Link>

                    <div style={{ height: '1px', background: 'linear-gradient(90deg, transparent, rgba(25,36,26,0.06), transparent)', margin: '6px 0' }} />

                    <button
                      type="button"
                      onClick={() => {
                        setUserDropdownOpen(false);
                        handleLogout();
                      }}
                      className="admin-dropdown-item danger"
                      role="menuitem"
                      style={{ animationDelay: '0.1s' }}
                    >
                      <LogOut size={16} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="admin-content-container">
          <Outlet />
        </main>
      </div>

      {/* Backdrop for mobile drawer */}
      {sidebarOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(10, 18, 10, 0.65)',
            backdropFilter: 'blur(6px)',
            WebkitBackdropFilter: 'blur(6px)',
            zIndex: 990
          }}
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

export default AdminLayout;
