import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Gem, User, Building, Mail, Phone, ShieldCheck, LogOut, FileText, CheckCircle2, Clock } from 'lucide-react';
import Button from '../../components/Button/Button';
import './Dashboard.css';

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="dashboard-page-root">
      <div className="container dashboard-container">
        {/* Dashboard Header Bar */}
        <div className="dashboard-header-card luxury-card">
          <div className="dash-user-info">
            <div className="dash-avatar-box">
              <img src="/logo-icon.png" alt="Shraddha Gold" className="dash-avatar-logo" />
            </div>
            <div>
              <div className="luxury-badge mb-1">
                <ShieldCheck size={12} className="text-gold" />
                <span>Verified B2B Partner Network</span>
              </div>
              <h1 className="dash-welcome font-serif">
                Welcome, {user?.name || 'Valued Commercial Partner'}
              </h1>
              <p className="dash-company-name">
                {user?.companyName || 'Shraddha Gold Authorized Client'} • Account ID: {user?.id?.slice(-8) || 'SG-9824'}
              </p>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-outline-gold dash-logout-btn">
            <LogOut size={16} />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Account Details & Order Status Grid */}
        <div className="dashboard-grid">
          {/* Account Profile Card */}
          <div className="dash-card luxury-card">
            <h3 className="dash-card-title font-serif">Partner Credentials</h3>
            <div className="credentials-list">
              <div className="cred-row">
                <span className="cred-label">Commercial Name:</span>
                <span className="cred-value">{user?.name}</span>
              </div>
              <div className="cred-row">
                <span className="cred-label">Enterprise / Brand:</span>
                <span className="cred-value">{user?.companyName}</span>
              </div>
              <div className="cred-row">
                <span className="cred-label">Primary Email:</span>
                <span className="cred-value">{user?.email}</span>
              </div>
              <div className="cred-row">
                <span className="cred-label">Registered Username:</span>
                <span className="cred-value">@{user?.username}</span>
              </div>
              <div className="cred-row">
                <span className="cred-label">Registered Mobile:</span>
                <span className="cred-value">{user?.mobile}</span>
              </div>
              <div className="cred-row">
                <span className="cred-label">Role Classification:</span>
                <span className="cred-value text-gold font-semibold uppercase">{user?.role || 'Partner'}</span>
              </div>
            </div>
          </div>

          {/* Active Production Batches (Placeholder) */}
          <div className="dash-card luxury-card">
            <h3 className="dash-card-title font-serif">Active Production Batches</h3>
            <div className="batches-list">
              <div className="batch-item">
                <div className="batch-status-icon in-progress">
                  <Clock size={18} />
                </div>
                <div className="batch-info">
                  <div className="batch-head">
                    <strong className="batch-title">Batch #SG-2026-0842</strong>
                    <span className="batch-stage-badge">Induction Casting</span>
                  </div>
                  <p className="batch-details">
                    22K Hallmarked Antique Bangle Suite (50 Pairs) • Assay Target: 91.65%
                  </p>
                </div>
              </div>

              <div className="batch-item">
                <div className="batch-status-icon completed">
                  <CheckCircle2 size={18} />
                </div>
                <div className="batch-info">
                  <div className="batch-head">
                    <strong className="batch-title">Batch #SG-2026-0799</strong>
                    <span className="batch-stage-badge ready">Dispatched (Insured)</span>
                  </div>
                  <p className="batch-details">
                    18K Micro-Pavé Cocktail Diamond Ring Mounts (25 Units) • Airway: BVC Secure
                  </p>
                </div>
              </div>
            </div>

            <div className="dash-cad-download-box">
              <FileText size={20} className="text-gold" />
              <div>
                <strong className="text-white text-sm block">B2B Standard Technical Agreement</strong>
                <p className="text-muted text-xs">Standard OEM Casting &amp; BIS Hallmarking Assay Protocol</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
