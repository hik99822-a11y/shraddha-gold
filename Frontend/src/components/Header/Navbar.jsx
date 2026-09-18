import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Instagram, 
  Facebook, 
  Phone, 
  Mail, 
  Menu, 
  X, 
  User as UserIcon, 
  LogOut,
  ArrowRight,
  ChevronDown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { topNavbarData, mainNavLinks } from '../../data/navigation';
import './Navbar.css';

const Navbar = () => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const isHome = location.pathname === '/' || location.pathname === '';

  // Close user dropdown on outside click or escape
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target)) {
        setUserDropdownOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === 'Escape') setUserDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 35);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [location.pathname, location.hash]);

  // Handle in-page smooth scroll on Home page or route navigation
  const handleNavClick = (e, link) => {
    if (isHome && link.sectionId) {
      e.preventDefault();
      const targetElement = document.getElementById(link.sectionId);
      if (targetElement) {
        if (window.lenis) {
          window.lenis.scrollTo(targetElement, { offset: -90 });
        } else {
          targetElement.scrollIntoView({ behavior: 'smooth' });
        }
        // Update URL hash without reload
        window.history.pushState(null, '', `#${link.sectionId}`);
      }
    } else if (!isHome && link.sectionId) {
      // If on another page, navigate to home with hash
      e.preventDefault();
      navigate(`/#${link.sectionId}`);
    }
    setMobileMenuOpen(false);
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className={`site-header-wrapper ${scrolled ? 'header-scrolled' : ''}`}>
      {/* =====================================================================
          1. TOP NAVBAR (Slim Contact & Social Bar)
          ===================================================================== */}
      <div className="top-navbar">
        <div className="container top-navbar-inner">
          <div className="top-nav-socials">
            <a href={topNavbarData.socials[0].url} target="_blank" rel="noopener noreferrer" className="top-social-link">
              <Facebook size={14} className="social-svg" />
              <span className="social-label">{topNavbarData.socials[0].name}</span>
            </a>
            <span className="top-divider">|</span>
            <a href={topNavbarData.socials[1].url} target="_blank" rel="noopener noreferrer" className="top-social-link">
              <Instagram size={14} className="social-svg" />
              <span className="social-label">{topNavbarData.socials[1].name}</span>
            </a>
          </div>
          <div className="top-nav-contact">
            <a href={topNavbarData.contact.phoneHref} className="top-contact-item">
              <Phone size={13} className="contact-svg" />
              <span>{topNavbarData.contact.phone}</span>
            </a>
            <a href={topNavbarData.contact.emailHref} className="top-contact-item">
              <Mail size={13} className="contact-svg" />
              <span>{topNavbarData.contact.email}</span>
            </a>
          </div>
        </div>
      </div>

      {/* =====================================================================
          2. MAIN HEADER (Centered Logo, Split Navigation)
          ===================================================================== */}
      <div className="main-header">
        <div className="container main-header-inner">
          
          {/* Left: Shraddha Gold Official Brand Logo */}
          <Link to="/" className="brand-logo-link" aria-label="Shraddha Gold Home">
            <img
              src="/assets/images/Shraddha Gold India Pvt. Ltd - Black.png"
              alt="Shraddha Gold India Pvt. Ltd."
              className="brand-logo-img"
            />
          </Link>

          {/* Center: Main Navigation Links */}
          <nav className="desktop-navigation center-nav" aria-label="Main Navigation">
            <ul className="desktop-nav-list">
              <li className="desktop-nav-item">
                <a
                  href="/#products"
                  onClick={(e) => handleNavClick(e, { sectionId: 'products', path: '/#products' })}
                  className="desktop-nav-link"
                >
                  Our Products
                </a>
              </li>
              <li className="desktop-nav-item">
                <Link to="/about" className="desktop-nav-link">Company Profile</Link>
              </li>
              <li className="desktop-nav-item">
                <Link to="/contact" className="desktop-nav-link">Contact Us</Link>
              </li>
            </ul>
          </nav>

          {/* Right Actions & Login */}
          <div className="header-actions">
            {isAuthenticated ? (
              <div className="auth-user-dropdown-wrapper" ref={userDropdownRef}>
                <button
                  type="button"
                  onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                  className="auth-user-badge-btn"
                  aria-expanded={userDropdownOpen}
                  title="Account Menu"
                >
                  <div className="auth-user-avatar">
                    {user?.name ? user.name.charAt(0).toUpperCase() : <UserIcon size={12} />}
                  </div>
                  <span className="user-label hidden sm:inline">
                    {user?.role === 'admin' ? 'Admin' : user?.name?.split(' ')[0] || 'User'}
                  </span>
                  <ChevronDown
                    size={13}
                    className={`transition-transform duration-200 ${userDropdownOpen ? 'rotate-180' : ''}`}
                  />
                </button>

                {userDropdownOpen && (
                  <div className="navbar-user-dropdown" role="menu">
                    <div className="navbar-dropdown-header">
                      <div className="font-semibold text-text-primary text-xs truncate">
                        {user?.name || 'Authorized Member'}
                      </div>
                      <div className="text-[11px] text-text-muted truncate mt-0.5">
                        {user?.email || user?.username || ''}
                      </div>
                      <span className="inline-block mt-1 px-2 py-0.5 bg-brand-primary/10 text-brand-dark text-[10px] rounded font-medium capitalize">
                        {user?.role === 'admin' ? 'Executive Admin' : 'Commercial Partner'}
                      </span>
                    </div>

                    <div className="p-1.5">
                      <Link
                        to={user?.role === 'admin' ? '/admin/profile' : '/customer/portal'}
                        onClick={() => setUserDropdownOpen(false)}
                        className="navbar-dropdown-item"
                        role="menuitem"
                      >
                        <UserIcon size={14} className="text-brand-primary" />
                        <span>Profile</span>
                      </Link>

                      {user?.role === 'admin' && (
                        <Link
                          to="/admin/dashboard"
                          onClick={() => setUserDropdownOpen(false)}
                          className="navbar-dropdown-item"
                          role="menuitem"
                        >
                          <span className="text-brand-primary text-xs font-bold">⌘</span>
                          <span>Admin Console</span>
                        </Link>
                      )}

                      <div className="my-1 border-t border-border-subtle" />

                      <button
                        type="button"
                        onClick={() => {
                          setUserDropdownOpen(false);
                          handleLogout();
                        }}
                        className="navbar-dropdown-item danger w-full text-left"
                        role="menuitem"
                      >
                        <LogOut size={14} className="text-red-500" />
                        <span>Logout</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/login" className="btn btn-brand header-login-btn">
                <span>LOGIN</span>
              </Link>
            )}

            {/* Mobile Hamburger Toggle Button */}
            <button
              className="mobile-hamburger-toggle"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              aria-label={mobileMenuOpen ? 'Close Menu' : 'Open Menu'}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X size={26} /> : <Menu size={26} />}
            </button>
          </div>
        </div>
      </div>

      {/* =====================================================================
          3. MOBILE DRAWER NAVIGATION MENU
          ===================================================================== */}
      <div className={`mobile-drawer ${mobileMenuOpen ? 'drawer-open' : ''}`}>
        <div className="mobile-drawer-content">
          <div className="mobile-drawer-top">
            <Link to="/" onClick={() => setMobileMenuOpen(false)}>
              <img
                src="/assets/images/Shraddha Gold India Pvt. Ltd - Black.png"
                alt="Shraddha Gold India Pvt. Ltd."
                className="mobile-drawer-logo"
              />
            </Link>
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="mobile-drawer-close"
              aria-label="Close navigation"
            >
              <X size={24} />
            </button>
          </div>

          <ul className="mobile-menu-list">
            {mainNavLinks.map((link) => (
              <li key={link.name} className="mobile-menu-item">
                <a
                  href={link.path}
                  onClick={(e) => handleNavClick(e, link)}
                  className="mobile-menu-link"
                >
                  <span>{link.name}</span>
                  <ArrowRight size={16} className="menu-arrow" />
                </a>
              </li>
            ))}
          </ul>

          <div className="mobile-drawer-bottom">
            {isAuthenticated ? (
              <div className="mobile-auth-section">
                <Link
                  to={user?.role === 'admin' ? '/admin/dashboard' : '/customer/portal'}
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn btn-brand w-full mb-3"
                >
                  {user?.role === 'admin' ? 'Admin Dashboard' : 'Customer Portal'}
                </Link>
                <button
                  onClick={() => {
                    handleLogout();
                    setMobileMenuOpen(false);
                  }}
                  className="btn btn-outline-brand w-full"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                to="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="btn btn-brand w-full mobile-login-cta"
              >
                <span>LOGIN</span>
              </Link>
            )}

            {/* Mobile Contact & Social Details */}
            <div className="mobile-drawer-info">
              <p className="mobile-info-label">Direct Communication Desk</p>
              <a href={topNavbarData.contact.phoneHref} className="mobile-info-item">
                <Phone size={14} />
                <span>{topNavbarData.contact.phone}</span>
              </a>
              <a href={topNavbarData.contact.emailHref} className="mobile-info-item">
                <Mail size={14} />
                <span>{topNavbarData.contact.email}</span>
              </a>

              <div className="mobile-social-row">
                <a
                  href={topNavbarData.socials[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mobile-social-btn"
                  aria-label="Facebook"
                >
                  <Facebook size={16} />
                </a>
                <a
                  href={topNavbarData.socials[1].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mobile-social-btn"
                  aria-label="Instagram"
                >
                  <Instagram size={16} />
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Backdrop overlay for mobile drawer */}
      {mobileMenuOpen && (
        <div
          className="mobile-backdrop"
          onClick={() => setMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}
    </header>
  );
};

export default Navbar;
