import React, { useState, useEffect } from 'react';
import {
  X,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ShoppingBag,
  ArrowLeft,
  MessageSquare
} from 'lucide-react';
import { PhoneInput } from 'react-international-phone';
import 'react-international-phone/style.css';
import { orderApi } from '../../services/api';

const CheckoutModal = ({
  isOpen,
  onClose,
  items = [],
  accessType = 'Without Login',
  customerInfo = null,
  token = '',
  onOrderSuccess
}) => {
  if (!isOpen) return null;

  // Form states
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [remark, setRemark] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpSentMsg, setOtpSentMsg] = useState('');
  const [debugOtp, setDebugOtp] = useState('');
  const [timer, setTimer] = useState(0);
  const [verifying, setVerifying] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Reset fields on modal open
  useEffect(() => {
    if (isOpen) {
      setPhone('');
      setOtp('');
      setRemark('');
      setErrorMsg('');
      setOtpSentMsg('');
      setOtpSent(false);
      setTimer(0);
    }
  }, [isOpen]);

  // Resend countdown timer
  useEffect(() => {
    let interval = null;
    if (otpSent && timer > 0) {
      interval = setInterval(() => {
        setTimer((t) => (t > 1 ? t - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [otpSent, timer]);

  // Totals for header and summary
  const totalItems = items.length;
  const totalQuantity = items.reduce(
    (sum, item) => sum + (Number(item.quantity) || 1),
    0
  );
  const totalGrossWeight = items.reduce(
    (sum, item) =>
      sum + (Number(item.grossWeight) || 0) * (Number(item.quantity) || 1),
    0
  );

  // Helper to ensure clean styleId without variant suffixes
  const getSanitizedItems = (rawItems = []) =>
    rawItems.map((item) => ({
      ...item,
      styleId: item.styleId && String(item.styleId).includes('_v')
        ? String(item.styleId).split('_v')[0]
        : item.styleId
    }));

  // Send OTP
  const handleSendOtp = async () => {
    setErrorMsg('');
    setOtpSentMsg('');

    const clean = (phone || '').replace(/[^0-9]/g, '');
    if (!clean || clean.length < 10) {
      setErrorMsg('Please enter a valid mobile number with at least 10 digits.');
      return;
    }

    setSendingOtp(true);
    try {
      const res = await orderApi.sendOtp({
        phone: phone,
        token: token || '',
        items: getSanitizedItems(items)
      });

      if (res.success) {
        setOtpSent(true);
        setOtpSentMsg(
          res.message || `OTP dispatched to +${clean} via WhatsApp.`
        );
        if (res.debugOtp) setDebugOtp(res.debugOtp);
        setTimer(30);
      } else {
        setErrorMsg(res.message || 'Failed to send OTP.');
      }
    } catch (err) {
      setErrorMsg(
        err.message ||
          'This mobile number is not registered. Please enter a registered mobile number.'
      );
    } finally {
      setSendingOtp(false);
    }
  };

  // Verify OTP and Place Order
  const handleVerifyAndOrder = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    setErrorMsg('');

    const clean = (phone || '').replace(/[^0-9]/g, '');
    if (!clean || clean.length < 10) {
      setErrorMsg('Please enter your registered mobile number.');
      return;
    }

    if (!otp || otp.trim().length !== 6) {
      setErrorMsg('Please enter the 6-digit verification code.');
      return;
    }

    setVerifying(true);
    try {
      const res = await orderApi.verifyOtpAndOrder({
        phone: phone,
        otp: otp.trim(),
        customerName: customerInfo?.name || '',
        customerEmail: customerInfo?.email || '',
        remark: remark.trim(),
        notes: remark.trim(),
        items: getSanitizedItems(items),
        token: token || '',
        orderSource: accessType === 'With Login' ? 'With Login' : 'Without Login'
      });

      if (res.success && res.order) {
        if (onOrderSuccess) onOrderSuccess(res.order);
        onClose();
      } else {
        setErrorMsg(res.message || 'Failed to verify OTP.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to verify OTP. Please try again.');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="checkout-modal-backdrop" onClick={onClose}>
      <div
        className="checkout-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Premium Header */}
        <div className="checkout-header">
          <div className="checkout-header-bg"></div>
          <button
            onClick={onClose}
            className="checkout-close-btn"
            title="Close modal"
            aria-label="Close"
          >
            <X size={18} />
          </button>
          <div className="checkout-header-content">
            <div className="checkout-header-icon">
              <ShoppingBag size={22} />
            </div>
            <div className="checkout-header-text">
              <h3>Review &amp; Confirm Order</h3>
              <p>
                {totalItems} designs • {totalQuantity} pieces •{' '}
                {totalGrossWeight.toFixed(2)}g total
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="checkout-body">
          {/* Quick Metrics Strip */}
          <div className="checkout-summary-strip">
            <div className="checkout-summary-pill">
              <span className="checkout-summary-label">Designs</span>
              <span className="checkout-summary-val">{totalItems}</span>
            </div>
            <div className="checkout-summary-divider"></div>
            <div className="checkout-summary-pill">
              <span className="checkout-summary-label">Total Pieces</span>
              <span className="checkout-summary-val">{totalQuantity}</span>
            </div>
            <div className="checkout-summary-divider"></div>
            <div className="checkout-summary-pill">
              <span className="checkout-summary-label">Gross Weight</span>
              <span className="checkout-summary-val font-mono">{totalGrossWeight.toFixed(2)}g</span>
            </div>
          </div>

          <form onSubmit={handleVerifyAndOrder}>
            {/* Error Message */}
            {errorMsg && (
              <div className="checkout-alert error">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span className="leading-relaxed">{errorMsg}</span>
              </div>
            )}

            {/* OTP Sent Message */}
            {otpSentMsg && (
              <div className="checkout-alert success">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <span>{otpSentMsg}</span>
                  {debugOtp && (
                    <div className="checkout-debug-otp">
                      Dev OTP: {debugOtp}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Field 1: Mobile Number */}
            <div className="checkout-field">
              <label className="checkout-label">
                <Phone size={13} className="inline mr-1 opacity-70" />
                Mobile Number *
              </label>
              <div className="checkout-phone-row">
                <div className="checkout-phone-wrapper">
                  <PhoneInput
                    defaultCountry="in"
                    preferredCountries={['in', 'ae', 'us', 'gb']}
                    value={phone}
                    onChange={(val) => {
                      setPhone(val);
                      setErrorMsg('');
                    }}
                    placeholder="Enter registered mobile number"
                    className="checkout-phone-input-root"
                    inputClassName="checkout-phone-input-field"
                    countrySelectorStyleProps={{
                      buttonClassName: 'checkout-phone-country-btn',
                      dropdownStyleProps: { className: 'checkout-phone-dropdown' }
                    }}
                    required
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSendOtp}
                  disabled={sendingOtp || (timer > 0 && otpSent)}
                  className="btn-send-otp"
                >
                  {sendingOtp
                    ? 'Sending...'
                    : otpSent && timer > 0
                    ? `Resend (${timer}s)`
                    : otpSent
                    ? 'Resend OTP'
                    : 'Send OTP'}
                </button>
              </div>
            </div>

            {/* Field 2: OTP */}
            <div className="checkout-field">
              <div className="flex items-center justify-between mb-2">
                <label className="checkout-label" style={{ marginBottom: 0 }}>
                  <ShieldCheck size={13} className="inline mr-1 opacity-70" />
                  Verification Code (OTP) *
                </label>
                {otpSent && timer > 0 && (
                  <div className="checkout-timer">
                    <Clock size={12} />
                    <span>Resend in {timer}s</span>
                  </div>
                )}
              </div>
              <input
                type="text"
                inputMode="numeric"
                maxLength={6}
                placeholder="• • • • • •"
                value={otp}
                onChange={(e) => {
                  const digits = e.target.value
                    .replace(/[^0-9]/g, '')
                    .slice(0, 6);
                  setOtp(digits);
                  setErrorMsg('');
                }}
                className="checkout-otp-input"
                required
              />
              {!otpSent ? (
                <p className="checkout-hint">
                  Click <strong>Send OTP</strong> above to receive your verification code.
                </p>
              ) : (
                <p className="checkout-hint checkout-hint-active">
                  Please enter the 6-digit code sent to your WhatsApp number.
                </p>
              )}
            </div>

            {/* Field 3: Order Remark / Instructions */}
            <div className="checkout-field">
              <label className="checkout-label">
                <MessageSquare size={13} className="inline mr-1 opacity-70" />
                Remark / Special Instructions (Optional)
              </label>
              <textarea
                rows={2}
                placeholder="Add any specific instructions, delivery preferences, or remarks for this order..."
                value={remark}
                onChange={(e) => setRemark(e.target.value)}
                className="checkout-remark-textarea"
              />
            </div>

            {/* Action Buttons */}
            <div className="checkout-actions">
              <button
                type="button"
                onClick={onClose}
                className="checkout-btn-secondary"
              >
                <ArrowLeft size={14} />
                <span>Back to Cart</span>
              </button>
              <button
                type="submit"
                disabled={verifying || otp.length !== 6}
                className="checkout-btn-primary"
              >
                <span>
                  {verifying ? 'Verifying & Placing Order...' : 'Verify & Place Order'}
                </span>
                <CheckCircle2 size={15} />
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default CheckoutModal;
