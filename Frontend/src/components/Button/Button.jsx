import React from 'react';

const Button = ({
  children,
  variant = 'gold', // 'gold', 'outline', 'ghost'
  size = 'md',
  onClick,
  type = 'button',
  disabled = false,
  className = '',
  icon: Icon,
  ...props
}) => {
  const variantClass = {
    gold: 'btn-gold',
    outline: 'btn-outline-gold',
    ghost: 'btn-ghost'
  }[variant] || 'btn-gold';

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`btn ${variantClass} ${className} ${disabled ? 'opacity-60 cursor-not-allowed' : ''}`}
      {...props}
    >
      <span>{children}</span>
      {Icon && <Icon size={16} className="btn-icon" />}
    </button>
  );
};

export default Button;
