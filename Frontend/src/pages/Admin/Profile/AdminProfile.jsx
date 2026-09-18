import React, { useState, useEffect } from 'react';
import {
  User,
  Shield,
  Mail,
  Phone,
  Building,
  KeyRound,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  Save,
  Clock,
  Sparkles,
  Lock,
  ShieldCheck,
  Award,
  Fingerprint,
  Plus,
  X
} from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import { authApi } from '../../../services/api';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';
import '../AdminCommon.css';

const AdminProfile = () => {
  const { user, updateUser } = useAuth();

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: '',
    email: '',
    mobile: [''],
    companyName: ''
  });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState('');
  const [profileError, setProfileError] = useState('');

  // Password Form State
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPlainPassword, setShowPlainPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [passwordError, setPasswordError] = useState('');

  // Sync profileForm with logged-in user
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        email: user.email || '',
        mobile: Array.isArray(user.mobile) ? (user.mobile.length > 0 ? user.mobile : ['']) : (user.mobile ? [user.mobile] : ['']),
        companyName: user.companyName || ''
      });
    }
  }, [user]);

  // Handle Profile Update
  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileSuccess('');
    setProfileError('');

    try {
      if (!profileForm.name.trim()) {
        throw new Error('Full name is required');
      }

      const validMobiles = profileForm.mobile.map(m => m.trim()).filter(m => m.replace(/\D/g, '').length >= 7);
      if (validMobiles.length === 0) {
        throw new Error('Please enter at least one valid mobile number with country code');
      }

      const res = await authApi.updateProfile({
        name: profileForm.name.trim(),
        email: profileForm.email.trim(),
        mobile: validMobiles,
        companyName: profileForm.companyName.trim()
      });

      if (res.success && res.user) {
        updateUser(res.user);
        setProfileSuccess(res.message || 'Profile information updated successfully');
        setTimeout(() => setProfileSuccess(''), 5000);
      } else {
        throw new Error(res.message || 'Failed to update profile');
      }
    } catch (err) {
      setProfileError(err.message || 'Error updating profile details');
    } finally {
      setProfileLoading(false);
    }
  };

  // Handle Password Update
  const handlePasswordSubmit = async (e) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordSuccess('');
    setPasswordError('');

    try {
      if (!passwordForm.currentPassword) {
        throw new Error('Please enter your current password');
      }
      if (passwordForm.newPassword.length < 6) {
        throw new Error('New password must be at least 6 characters');
      }
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        throw new Error('New passwords do not match');
      }

      const res = await authApi.changePassword({
        currentPassword: passwordForm.currentPassword,
        newPassword: passwordForm.newPassword
      });

      if (res.success) {
        setPasswordSuccess(res.message || 'Password successfully updated');
        setPasswordForm({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setTimeout(() => setPasswordSuccess(''), 5000);
      } else {
        throw new Error(res.message || 'Failed to update password');
      }
    } catch (err) {
      setPasswordError(err.message || 'Error changing password');
    } finally {
      setPasswordLoading(false);
    }
  };

  // Calculate password strength
  const getPasswordStrength = (pwd) => {
    if (!pwd) return { label: '', score: 0, color: '' };
    let score = 0;
    if (pwd.length >= 6) score++;
    if (pwd.length >= 10) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 2) return { label: 'Weak', score: 33, color: 'bg-amber-500' };
    if (score <= 4) return { label: 'Moderate', score: 66, color: 'bg-emerald-500' };
    return { label: 'Strong & Secure', score: 100, color: 'bg-brand-primary' };
  };

  const strength = getPasswordStrength(passwordForm.newPassword);
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : 'S';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px', paddingBottom: '32px' }}>

      {/* Main Grid: Overview (Left) + Forms (Right) */}
      <div className="admin-profile-grid">
        {/* Left Column: Account Identity Card */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div className="admin-card" style={{ textAlign: 'center', padding: 0, marginBottom: 0, overflow: 'hidden' }}>
            {/* Cover Banner */}
            <div style={{ height: '100px', background: 'linear-gradient(135deg, var(--brand-tint) 0%, rgba(194, 160, 82, 0.15) 100%)', width: '100%' }} />
            
            <div style={{ padding: '0 24px 32px', marginTop: '-42px' }}>
              {/* Large Luxury Avatar */}
              <div
                style={{
                  width: '84px',
                  height: '84px',
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, var(--brand-primary) 0%, var(--text-primary) 100%)',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '2rem',
                  fontWeight: 700,
                  fontFamily: 'var(--font-serif, serif)',
                  margin: '0 auto 16px',
                  border: '4px solid #ffffff',
                  boxShadow: '0 8px 24px rgba(25, 36, 26, 0.12)'
                }}
              >
                {initials}
              </div>

              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--admin-text-primary)', margin: '0 0 4px', fontFamily: 'var(--font-serif, serif)' }}>
              {user?.name || 'Shraddha Executive'}
            </h2>
            <div style={{ fontSize: '0.8rem', color: 'var(--admin-text-muted)', marginBottom: '14px' }}>
              @{user?.username || 'admin'}
            </div>

            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '4px 12px', borderRadius: '9999px', background: 'var(--brand-subtle)', border: '1px solid var(--admin-border-subtle)', fontSize: '0.74rem', fontWeight: 700, color: 'var(--brand-dark)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              <ShieldCheck size={14} style={{ color: 'var(--gold-accent)' }} />
              <span>Super Administrator</span>
            </div>

            <div style={{ height: '1px', background: 'var(--admin-border-subtle)', margin: '20px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', textAlign: 'left' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--brand-subtle)', borderRadius: '10px', border: '1px solid var(--admin-border-subtle)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(25, 36, 26, 0.04)' }}>
                  <Building size={14} style={{ color: 'var(--brand-primary)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 800, color: 'var(--admin-text-muted)' }}>Organization</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--admin-text-primary)' }}>{user?.companyName || 'Shraddha Gold Corporate HQ'}</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--brand-subtle)', borderRadius: '10px', border: '1px solid var(--admin-border-subtle)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(25, 36, 26, 0.04)' }}>
                  <Mail size={14} style={{ color: 'var(--brand-primary)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 800, color: 'var(--admin-text-muted)' }}>Email Address</span>
                  <span className="truncate" style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--admin-text-primary)' }}>{user?.email || 'admin@shraddhagold.com'}</span>
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '10px 14px', background: 'var(--brand-subtle)', borderRadius: '10px', border: '1px solid var(--admin-border-subtle)' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: '#ffffff', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(25, 36, 26, 0.04)' }}>
                  <Phone size={14} style={{ color: 'var(--brand-primary)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 800, color: 'var(--admin-text-muted)' }}>Mobile Number</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--admin-text-primary)' }}>{Array.isArray(user?.mobile) ? user.mobile.join(', ') : (user?.mobile || '+91 9876543210')}</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', padding: '12px', background: 'var(--brand-tint)', borderRadius: '10px', fontSize: '0.74rem', color: 'var(--brand-dark)', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
              <span className="admin-live-dot" />
              <span>Session Authenticated &amp; Active</span>
            </div>
            </div> {/* End of padding wrapper */}
          </div>
        </div>

        {/* Right Column: Edit Forms */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Card 1: Personal & Organization Details */}
          <div className="admin-card" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '16px', marginBottom: '20px', borderBottom: '1px solid var(--admin-border-subtle)' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--brand-subtle)', color: 'var(--brand-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <User size={18} />
              </div>
              <div>
                <h2 style={{ fontFamily: 'var(--font-serif, serif)', fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--admin-text-primary)' }}>
                  Personal &amp; Organization Information
                </h2>
              </div>
            </div>

            {/* Notifications */}
            {profileSuccess && (
              <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '8px', background: '#ecfdf5', border: '1px solid var(--brand-primary)', color: 'var(--text-primary)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--text-primary)', flexShrink: 0 }} />
                <span>{profileSuccess}</span>
              </div>
            )}
            {profileError && (
              <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '8px', background: '#fef2f2', border: '1px solid var(--bg-light-brand)', color: 'var(--brand-primary)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} style={{ color: '#dc2626', flexShrink: 0 }} />
                <span>{profileError}</span>
              </div>
            )}

            <form onSubmit={handleProfileSubmit}>
              <div className="form-row">
                <div className="admin-form-group">
                  <label htmlFor="admin-name">Full Name *</label>
                  <input
                    id="admin-name"
                    type="text"
                    className="admin-input"
                    value={profileForm.name}
                    onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                    placeholder="e.g. Hardik Patel"
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label htmlFor="admin-username">Username</label>
                  <input
                    id="admin-username"
                    type="text"
                    className="admin-input"
                    style={{ background: 'var(--brand-subtle)', cursor: 'not-allowed', color: 'var(--admin-text-muted)' }}
                    value={user?.username || ''}
                    disabled
                    title="Username is permanent and uniquely assigned to this account"
                  />
                  <span style={{ fontSize: '0.74rem', color: 'var(--admin-text-muted)', marginTop: '4px', display: 'block' }}>
                    Permanent system username (read-only)
                  </span>
                </div>
              </div>

              <div className="form-row">
                <div className="admin-form-group">
                  <label htmlFor="admin-email">Email Address *</label>
                  <input
                    id="admin-email"
                    type="email"
                    className="admin-input"
                    value={profileForm.email}
                    onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                    placeholder="admin@shraddhagold.com"
                    required
                  />
                </div>

                <div className="admin-form-group">
                  <label>Mobile Numbers *</label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {profileForm.mobile.map((mob, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <PhoneInput
                          defaultCountry="in"
                          preferredCountries={['in', 'ae', 'us', 'gb']}
                          value={mob}
                          onChange={(val) => {
                            const newMobile = [...profileForm.mobile];
                            newMobile[idx] = val;
                            setProfileForm({ ...profileForm, mobile: newMobile });
                          }}
                          placeholder="e.g. +91 9876543210"
                          className="admin-phone-input-compact"
                          inputClassName="admin-phone-input-field"
                          countrySelectorStyleProps={{
                            buttonClassName: 'admin-phone-country-btn',
                            dropdownStyleProps: {
                              className: 'admin-phone-dropdown'
                            }
                          }}
                          style={{ flex: 1 }}
                        />
                        {profileForm.mobile.length > 1 && (
                          <button
                            type="button"
                            onClick={() => {
                              const newMobile = profileForm.mobile.filter((_, i) => i !== idx);
                              setProfileForm({ ...profileForm, mobile: newMobile });
                            }}
                            className="btn-outline-brand"
                            style={{ padding: '6px', minWidth: 'auto', minHeight: 'auto', borderRadius: '6px', color: '#dc2626', borderColor: '#fee2e2', background: '#fef2f2' }}
                            title="Remove number"
                          >
                            <X size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={() => setProfileForm({ ...profileForm, mobile: [...profileForm.mobile, ''] })}
                    style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.78rem', color: 'var(--brand-primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600, padding: '4px 0' }}
                  >
                    <Plus size={14} />
                    <span>Add Another Mobile Number</span>
                  </button>
                </div>
              </div>

              <div className="form-row">
                <div className="admin-form-group">
                  <label htmlFor="admin-company">Company / Organization Name</label>
                  <input
                    id="admin-company"
                    type="text"
                    className="admin-input"
                    value={profileForm.companyName}
                    onChange={(e) => setProfileForm({ ...profileForm, companyName: e.target.value })}
                    placeholder="Shraddha Gold India Pvt. Ltd."
                  />
                </div>

                <div className="admin-form-group">
                  <label htmlFor="admin-role">System Role</label>
                  <input
                    id="admin-role"
                    type="text"
                    className="admin-input"
                    style={{ background: 'var(--brand-subtle)', cursor: 'not-allowed', color: 'var(--admin-text-muted)' }}
                    value={user?.role === 'admin' ? 'Executive Administrator (Full Access)' : user?.role || ''}
                    disabled
                  />
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
                <button
                  type="submit"
                  disabled={profileLoading}
                  className="btn-brand"
                >
                  <Save size={15} />
                  <span>{profileLoading ? 'Saving Profile...' : 'Save Profile Changes'}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Card 2: Security & Password Management */}
          <div className="admin-card" style={{ marginBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', paddingBottom: '16px', marginBottom: '20px', borderBottom: '1px solid var(--admin-border-subtle)' }}>
              <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'var(--brand-subtle)', color: 'var(--brand-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <KeyRound size={18} />
              </div>
              <div>
                <h2 style={{ fontFamily: 'var(--font-serif, serif)', fontSize: '1.2rem', fontWeight: 700, margin: 0, color: 'var(--admin-text-primary)' }}>
                  Account Security &amp; Credentials
                </h2>
              </div>
            </div>

            {/* Notifications */}
            {passwordSuccess && (
              <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '8px', background: '#ecfdf5', border: '1px solid var(--brand-primary)', color: 'var(--text-primary)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle2 size={16} style={{ color: 'var(--text-primary)', flexShrink: 0 }} />
                <span>{passwordSuccess}</span>
              </div>
            )}
            {passwordError && (
              <div style={{ marginBottom: '16px', padding: '12px 14px', borderRadius: '8px', background: '#fef2f2', border: '1px solid var(--bg-light-brand)', color: 'var(--brand-primary)', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <AlertCircle size={16} style={{ color: '#dc2626', flexShrink: 0 }} />
                <span>{passwordError}</span>
              </div>
            )}

            {/* Stored Plain Password Display */}
            {user?.plainPassword && (
              <div style={{ marginBottom: '20px', padding: '16px', borderRadius: '12px', background: 'var(--bg-light-brand)', border: '1px solid var(--bg-light-brand)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--brand-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Shield size={14} style={{ color: 'var(--border-subtle)' }} />
                    <span>Database Registered Password</span>
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: '0.95rem', fontWeight: 700, color: 'var(--brand-primary)', marginTop: '4px', letterSpacing: '0.05em' }}>
                    {showPlainPassword ? user.plainPassword : '••••••••••••••••'}
                  </div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--brand-primary)' }}>
                    Saved securely for authorized administrative credential recovery
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setShowPlainPassword(!showPlainPassword)}
                  className="btn-outline-brand"
                  style={{ fontSize: '0.8rem', minHeight: '34px', padding: '6px 12px', background: '#ffffff' }}
                >
                  {showPlainPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                  <span>{showPlainPassword ? 'Hide' : 'Reveal'}</span>
                </button>
              </div>
            )}

            <form onSubmit={handlePasswordSubmit}>
              <div className="admin-form-group">
                <label htmlFor="current-password">Current Password *</label>
                <div style={{ position: 'relative' }}>
                  <input
                    id="current-password"
                    type={showCurrent ? 'text' : 'password'}
                    className="admin-input"
                    style={{ paddingRight: '40px' }}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    placeholder="Enter your current password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrent(!showCurrent)}
                    style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)' }}
                    tabIndex={-1}
                    aria-label={showCurrent ? 'Hide password' : 'Show password'}
                  >
                    {showCurrent ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div className="form-row">
                <div className="admin-form-group">
                  <label htmlFor="new-password">New Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="new-password"
                      type={showNew ? 'text' : 'password'}
                      className="admin-input"
                      style={{ paddingRight: '40px' }}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="Minimum 6 characters"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNew(!showNew)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)' }}
                      tabIndex={-1}
                      aria-label={showNew ? 'Hide password' : 'Show password'}
                    >
                      {showNew ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {/* Strength Bar */}
                  {passwordForm.newPassword && (
                    <div style={{ marginTop: '8px' }}>
                      <div style={{ height: '6px', width: '100%', background: 'var(--admin-border-subtle)', borderRadius: '9999px', overflow: 'hidden' }}>
                        <div
                          style={{
                            height: '100%',
                            transition: 'all 0.3s ease',
                            width: `${strength.score}%`,
                            background: strength.score <= 33 ? '#f59e0b' : strength.score <= 66 ? 'var(--text-primary)' : 'var(--brand-primary)'
                          }}
                        />
                      </div>
                      <span style={{ fontSize: '0.74rem', color: 'var(--admin-text-muted)', marginTop: '4px', display: 'block' }}>
                        Password Strength: <strong style={{ color: 'var(--admin-text-primary)' }}>{strength.label}</strong>
                      </span>
                    </div>
                  )}
                </div>

                <div className="admin-form-group">
                  <label htmlFor="confirm-password">Confirm New Password *</label>
                  <div style={{ position: 'relative' }}>
                    <input
                      id="confirm-password"
                      type={showConfirm ? 'text' : 'password'}
                      className="admin-input"
                      style={{ paddingRight: '40px' }}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      placeholder="Repeat new password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--admin-text-muted)' }}
                      tabIndex={-1}
                      aria-label={showConfirm ? 'Hide password' : 'Show password'}
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '8px' }}>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="btn-brand"
                >
                  <Lock size={15} />
                  <span>{passwordLoading ? 'Updating Password...' : 'Update Password'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminProfile;
