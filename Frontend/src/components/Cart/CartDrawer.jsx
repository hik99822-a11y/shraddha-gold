import React from 'react';
import { ShoppingBag, X, Trash2, Plus, Minus, ArrowRight, Gem, AlertCircle, Sparkles } from 'lucide-react';
import './CartDrawer.css';

const API_BASE = 'https://api.shraddhagold.com';

const CartDrawer = ({
  isOpen,
  onClose,
  items = [],
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  onProceedToCheckout
}) => {
  if (!isOpen) return null;

  const totalItems = items.length;
  const totalQuantity = items.reduce((sum, item) => sum + (Number(item.quantity) || 1), 0);
  const totalGrossWeight = items.reduce(
    (sum, item) => sum + ((Number(item.grossWeight) || 0) * (Number(item.quantity) || 1)),
    0
  );

  return (
    <div className="cart-drawer-backdrop" onClick={onClose}>
      <div className="cart-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Premium Header */}
        <div className="cart-drawer-header">
          <div className="cart-drawer-header-bg"></div>
          <div className="cart-drawer-title-group">
            <div className="cart-header-icon-box">
              <ShoppingBag size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="cart-drawer-title">Your Order Cart</h3>
                <span className="cart-badge-count">{totalItems}</span>
              </div>
              <p className="cart-drawer-subtitle">
                {totalQuantity} {totalQuantity === 1 ? 'piece' : 'pieces'} • {totalGrossWeight.toFixed(2)}g gross wt
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cart-drawer-close-btn"
            aria-label="Close cart"
          >
            <X size={18} />
          </button>
        </div>

        {/* Cart Body */}
        <div className="cart-drawer-body">
          {items.length === 0 ? (
            <div className="cart-empty-state">
              <div className="cart-empty-icon">
                <ShoppingBag size={30} />
              </div>
              <h4 className="cart-empty-title">
                Your order cart is empty
              </h4>
              <p className="cart-empty-desc">
                Browse our collections and add designs to your cart to create an order inquiry.
              </p>
            </div>
          ) : (
            <div className="cart-items-list">
              {items.map((item, index) => {
                const imgUrl = item.imageUrl
                  ? item.imageUrl.startsWith('http')
                    ? item.imageUrl
                    : `${API_BASE}${item.imageUrl}`
                  : null;

                const itemTotalWt = (
                  (Number(item.grossWeight) || 0) * (Number(item.quantity) || 1)
                ).toFixed(2);

                const isItemOverStock =
                  item.availableStock !== undefined &&
                  item.availableStock !== null &&
                  item.quantity > item.availableStock;

                return (
                  <div
                    key={`${item.styleCode}_${item.kt}_${index}`}
                    className={`cart-item-card ${isItemOverStock ? 'overstock-alert' : ''}`}
                  >
                    {/* Thumbnail */}
                    <div className="cart-item-thumb">
                      {imgUrl ? (
                        <img src={imgUrl} alt={item.styleCode} loading="lazy" />
                      ) : (
                        <Gem size={24} className="cart-item-fallback-icon" />
                      )}
                    </div>

                    {/* Details */}
                    <div className="cart-item-info">
                      <div className="cart-item-top">
                        <div className="cart-item-code">
                          {item.displayCode || (item.item ? `${item.styleCode} – ${item.item}` : item.styleCode)}
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.styleCode, item.kt, item.item, item.styleId)}
                          className="cart-item-delete-btn"
                          title="Remove design"
                          aria-label="Remove design"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>

                      {/* Specs Tags */}
                      <div className="cart-item-specs">
                        {item.kt && <span className="cart-kt-badge">{item.kt}</span>}
                        <span className="cart-gross-weight">Gross: {Number(item.grossWeight || 0).toFixed(3)}g</span>
                        {item.availableStock !== undefined && item.availableStock !== null && (
                          <span className={`cart-item-stock-tag ${item.availableStock <= 0 ? 'out-of-stock' : item.availableStock <= 1 ? 'warning' : ''}`}>
                            <span className="stock-dot" />
                            {item.availableStock <= 0 ? 'Made to Order' : `Stock: ${item.availableStock}`}
                          </span>
                        )}
                      </div>

                      {/* Stock Info Notice */}
                      {item.availableStock !== undefined && item.availableStock !== null && item.availableStock <= 0 ? (
                        <div className="cart-bespoke-notice">
                          <Sparkles size={12} className="shrink-0" />
                          <span>Bespoke made-to-order design</span>
                        </div>
                      ) : isItemOverStock ? (
                        <div className="cart-bespoke-notice warning">
                          <Sparkles size={12} className="shrink-0" />
                          <span>{item.availableStock} in ready stock, {item.quantity - item.availableStock} on pre-order</span>
                        </div>
                      ) : null}

                      {/* Bottom Controls */}
                      <div className="cart-item-bottom">
                        <div className="cart-qty-control">
                          <button
                            type="button"
                            className="cart-qty-btn"
                            onClick={() =>
                              onUpdateQuantity(
                                item.styleCode,
                                item.kt,
                                Math.max(1, (Number(item.quantity) || 1) - 1),
                                item.item,
                                item.styleId
                              )
                            }
                            disabled={item.quantity <= 1}
                            aria-label="Decrease quantity"
                          >
                            <Minus size={13} />
                          </button>
                          <span className="cart-qty-num">{item.quantity}</span>
                          <button
                            type="button"
                            className="cart-qty-btn"
                            onClick={() =>
                              onUpdateQuantity(
                                item.styleCode,
                                item.kt,
                                (Number(item.quantity) || 1) + 1,
                                item.item,
                                item.styleId
                              )
                            }
                            title="Increase quantity"
                            disabled={!item.isMakeStock && item.availableStock !== undefined && item.quantity >= item.availableStock}
                            aria-label="Increase quantity"
                          >
                            <Plus size={13} />
                          </button>
                        </div>

                        <div className="cart-item-subtotal">
                          <strong>{itemTotalWt}</strong>
                          <span>g</span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="cart-drawer-footer">
            <div className="cart-summary-box">
              <div className="cart-summary-row">
                <span>Unique Designs:</span>
                <strong>{totalItems}</strong>
              </div>
              <div className="cart-summary-row">
                <span>Total Quantity:</span>
                <strong>{totalQuantity} pieces</strong>
              </div>
              <div className="cart-summary-row cart-summary-row-total">
                <span className="cart-summary-total-label">Total Gross Weight:</span>
                <span className="cart-summary-total-val">{totalGrossWeight.toFixed(3)} g</span>
              </div>
            </div>

            <div className="cart-actions-row">
              <button
                type="button"
                onClick={onClearCart}
                className="cart-btn-clear"
              >
                Clear Cart
              </button>
              <button
                type="button"
                onClick={onProceedToCheckout}
                className="cart-btn-checkout"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight size={15} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartDrawer;
