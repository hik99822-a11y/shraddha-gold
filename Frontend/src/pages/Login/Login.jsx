import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import {
  Eye,
  EyeOff,
  Gem,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  X,
  Phone,
  Mail
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import Toast from '../../components/Toast/Toast';
import './Login.css';

const Login = () => {
  const [searchParams] = useSearchParams();
  const redirectUrl = searchParams.get('redirect');

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fieldErrors, setFieldErrors] = useState({});
  const [toast, setToast] = useState({ message: '', type: 'info' });
  const [forgotPasswordOpen, setForgotPasswordOpen] = useState(false);

  const { login, logout, user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // If already logged in, route to appropriate dashboard
  useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'admin') {
        navigate('/admin/dashboard', { replace: true });
      } else {
        // If they are a customer, always take them to their full portal
        navigate('/customer/portal', { replace: true });
      }
    }
  }, [isAuthenticated, user, navigate]);

  const validateForm = () => {
    const errors = {};
    if (!identifier.trim()) {
      errors.identifier = 'Please enter your Email, Username, or Mobile Number';
    }
    if (!password) {
      errors.password = 'Please enter your account password';
    } else if (password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setLoading(true);
    setToast({ message: '', type: 'info' });

    try {
      const result = await login(identifier, password);
      if (result.success) {
        const isAdmin = result.user?.role === 'admin';
        setToast({
          message: redirectUrl
            ? 'Authentication successful. Accessing shared portfolio...'
            : isAdmin
            ? 'Administrator authenticated. Redirecting to Admin Dashboard...'
            : 'Authentication successful. Redirecting to Customer Portal...',
          type: 'success'
        });
        setTimeout(() => {
          if (isAdmin) {
            navigate('/admin/dashboard');
          } else {
            navigate('/customer/portal');
          }
        }, 800);
      } else {
        setToast({
          message: result.message || 'Invalid credentials. Please verify your details.',
          type: 'error'
        });
      }
    } catch (err) {
      setToast({
        message: err.message || 'Server connection error during authentication.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-root">
      {/* Toast Alert Feedback */}
      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'info' })}
      />

      <div className="login-split-layout">
        {/* Left Side: Luxury Visual & Branding */}
        <div className="login-visual-panel">
          <div className="login-visual-bg" />
          <div className="login-visual-overlay" />
          
          <div className="login-visual-content">
            <Link to="/" className="login-brand-group" title="Return to Homepage">
              <img
                src="/logo-horizontal.png"
                alt="Shraddha Gold's India Pvt Ltd"
                className="login-brand-logo-img"
              />
            </Link>

            <div className="login-hero-quote">
              <div className="login-atelier-tag">
                <Sparkles size={13} className="shrink-0" />
                <span>EXCLUSIVE ATELIER ACCESS</span>
              </div>
              <h2 className="quote-title font-serif">
                Precision Metallurgy.<br />
                <span className="quote-highlight">Generational Trust.</span>
              </h2>
              <p className="quote-desc">
                Access your real-time batch casting schedules, serialized CAD specifications, 
                and official BIS hallmark assay documentation.
              </p>

              {/* Luxury Feature Pillars */}
              <div className="login-features-grid">
                <div className="login-feature-item">
                  <div className="login-feature-icon-box">
                    <Gem size={18} />
                  </div>
                  <div>
                    <h4 className="login-feature-title">Proprietary Catalog</h4>
                    <p className="login-feature-sub">Ready stock & bespoke made-to-order casting</p>
                  </div>
                </div>

                <div className="login-feature-item">
                  <div className="login-feature-icon-box">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h4 className="login-feature-title">BIS Hallmark Certified</h4>
                    <p className="login-feature-sub">100% verified 18KT & 22KT gold purity assurance</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="login-panel-footer">
              <p>&copy; {new Date().getFullYear()} Shraddha Gold Manufacturing</p>
              <div className="login-footer-ssl">
                <ShieldCheck size={13} />
                <span>256-Bit SSL Architecture</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Authentication Form */}
        <div className="login-form-panel">
          <div className="login-card-floating">
            <div className="login-header">
              <div className="login-badge-pill">
                <ShieldCheck size={13} />
                <span>Authorized Client Portal</span>
              </div>
              <h1 className="login-main-title font-serif">Welcome Back</h1>
              <p className="login-sub-title">Sign in to access your Shraddha Gold account</p>
            </div>

            <form onSubmit={handleLoginSubmit} className="login-auth-form" noValidate>
              {/* Field 1: Identifier (Email, Username, or Mobile) */}
              <div className="login-form-group">
                <label htmlFor="identifier" className="login-field-label">Username / Mobile / Email</label>
                <div className={`login-input-wrapper ${fieldErrors.identifier ? 'input-error' : ''}`}>
                  <User size={18} className="login-field-icon" />
                  <input
                    id="identifier"
                    type="text"
                    autoComplete="username"
                    disabled={loading}
                    value={identifier}
                    onChange={(e) => {
                      setIdentifier(e.target.value);
                      if (fieldErrors.identifier) {
                        setFieldErrors({ ...fieldErrors, identifier: '' });
                      }
                    }}
                    placeholder="Enter email, username or mobile..."
                  />
                </div>
                {fieldErrors.identifier && (
                  <span className="login-error-text">{fieldErrors.identifier}</span>
                )}
              </div>

              {/* Field 2: Password with Show/Hide Toggle */}
              <div className="login-form-group">
                <div className="password-label-row">
                  <label htmlFor="password" className="login-field-label">Password</label>
                  <button
                    type="button"
                    onClick={() => setForgotPasswordOpen(true)}
                    className="forgot-password-link"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className={`login-input-wrapper ${fieldErrors.password ? 'input-error' : ''}`}>
                  <Lock size={18} className="login-field-icon" />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    disabled={loading}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (fieldErrors.password) {
                        setFieldErrors({ ...fieldErrors, password: '' });
                      }
                    }}
                    placeholder="Enter your account password..."
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                {fieldErrors.password && (
                  <span className="login-error-text">{fieldErrors.password}</span>
                )}
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="login-submit-btn"
              >
                <span>{loading ? 'Authenticating Credentials...' : 'Sign In to Account'}</span>
                {!loading && <ArrowRight size={18} />}
              </button>

              <div className="login-security-notice">
                <ShieldCheck size={14} className="opacity-70 shrink-0" />
                <span>Protected by 256-Bit Encrypted B2B Atelier Architecture</span>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotPasswordOpen && (
        <div className="login-modal-backdrop" onClick={() => setForgotPasswordOpen(false)}>
          <div className="login-modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="login-modal-header">
              <div className="login-modal-header-bg"></div>
              <button
                type="button"
                onClick={() => setForgotPasswordOpen(false)}
                className="login-modal-close-btn"
                aria-label="Close"
              >
                <X size={18} />
              </button>
              <div className="login-modal-header-content">
                <div className="login-modal-header-icon">
                  <Lock size={20} />
                </div>
                <div>
                  <h3 className="login-modal-title">Password Assistance</h3>
                  <p className="login-modal-subtitle">Commercial B2B Account Recovery</p>
                </div>
              </div>
            </div>
            <div className="login-modal-body">
              <p className="login-modal-text">
                To protect commercial account security and proprietary jewelry CAD designs, 
                password resets are handled directly through Shraddha Gold's systems administrator desk.
              </p>
              <div className="login-support-card">
                <div className="login-support-row">
                  <div className="login-support-row-icon">
                    <Phone size={15} />
                  </div>
                  <div>
                    <span className="login-support-label">Direct Technical Support Line</span>
                    <strong className="login-support-val">+91 98250 12345 (Admin Desk)</strong>
                  </div>
                </div>
                <div className="login-support-row">
                  <div className="login-support-row-icon">
                    <Mail size={15} />
                  </div>
                  <div>
                    <span className="login-support-label">Authorization Email Desk</span>
                    <strong className="login-support-val">security@shraddhagold.com</strong>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="login-modal-btn"
                onClick={() => setForgotPasswordOpen(false)}
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
