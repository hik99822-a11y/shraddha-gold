import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';

const CustomSelect = ({ value, onChange, options, placeholder, className, style, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);
  const dropdownRef = useRef(null);
  const [coords, setCoords] = useState(null);

  const selectedOption = options.find(opt => opt.value === value) || null;

  const handleToggle = (e) => {
    if (disabled) return;
    e.preventDefault();
    if (!isOpen) {
      updatePosition();
    }
    setIsOpen(!isOpen);
  };

  const updatePosition = () => {
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      
      const dropdownHeight = Math.min(options.length * 42 + 20, 300); // approx max height
      const placeAbove = spaceBelow < dropdownHeight && spaceAbove > spaceBelow;

      // Check if it would overflow the right edge of the screen (assuming ~280px max typical dropdown width)
      const isRightAligned = rect.left + 280 > window.innerWidth;

      setCoords({
        left: isRightAligned ? 'auto' : rect.left,
        right: isRightAligned ? window.innerWidth - rect.right : 'auto',
        top: placeAbove ? rect.top - 6 : rect.bottom + 6,
        minWidth: rect.width,
        placeAbove,
      });
    }
  };

  useEffect(() => {
    const handleOutsideClick = (e) => {
      // Allow clicking inside the portal
      const isOutsideContainer = containerRef.current && !containerRef.current.contains(e.target);
      const isOutsideDropdown = dropdownRef.current && !dropdownRef.current.contains(e.target);
      
      if (isOutsideContainer && isOutsideDropdown) {
        setIsOpen(false);
      }
    };
    
    const handleScrollOrResize = (e) => {
      if (isOpen) {
        // Do not close if the scroll originated from inside the dropdown itself
        if (e.type === 'scroll' && dropdownRef.current && dropdownRef.current.contains(e.target)) {
          return;
        }
        setIsOpen(false); // Closing on scroll is safer to avoid detached dropdowns
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
      window.addEventListener('resize', handleScrollOrResize);
      window.addEventListener('scroll', handleScrollOrResize, true);
    }
    
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [isOpen]);

  const dropdownMenu = isOpen && coords && createPortal(
    <AnimatePresence>
      <motion.div
        ref={dropdownRef}
        initial={{ opacity: 0, y: coords.placeAbove ? 10 : -10, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        transition={{ duration: 0.15, ease: "easeOut" }}
        style={{
          position: 'fixed',
          left: coords.left,
          right: coords.right,
          bottom: coords.placeAbove ? window.innerHeight - coords.top + 6 : 'auto',
          top: coords.placeAbove ? 'auto' : coords.top,
          minWidth: coords.minWidth,
          maxWidth: '92vw',
          width: 'max-content',
          zIndex: 999999,
          background: '#ffffff',
          borderRadius: '12px',
          boxShadow: '0 8px 30px rgba(19, 57, 46, 0.15), 0 0 0 1px rgba(177, 209, 203, 0.6)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '300px',
        }}
      >
        <div style={{ overflowY: 'auto', padding: '6px', scrollbarWidth: 'thin' }}>
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                style={{
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  fontSize: '0.85rem',
                  fontWeight: isSelected ? '700' : '500',
                  color: isSelected ? '#13392e' : '#4a756b',
                  background: isSelected ? '#F0F7F5' : 'transparent',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = '#f4f8f7';
                    e.currentTarget.style.color = '#13392e';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isSelected) {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#4a756b';
                  }
                }}
              >
                <span>{opt.label}</span>
                {isSelected && <Check size={16} color="#10b981" />}
              </div>
            );
          })}
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );

  return (
    <>
      <div 
        ref={containerRef}
        onClick={handleToggle}
        className={className}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.6 : 1,
          userSelect: 'none',
          ...style
        }}
      >
        <span style={{ 
          whiteSpace: 'nowrap', 
          overflow: 'hidden', 
          textOverflow: 'ellipsis',
          color: selectedOption ? 'inherit' : '#888'
        }}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDown size={16} style={{ 
          flexShrink: 0, 
          transition: 'transform 0.2s ease', 
          transform: isOpen ? 'rotate(180deg)' : 'rotate(0)' 
        }} />
      </div>
      {dropdownMenu}
    </>
  );
};

export default CustomSelect;
