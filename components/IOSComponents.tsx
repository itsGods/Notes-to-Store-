import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'magic';
  fullWidth?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const IOSButton: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  size = 'md',
  className = '', 
  ...props 
}) => {
  const baseStyle = "font-medium transition-all duration-300 active:scale-95 flex items-center justify-center gap-2 select-none";
  
  const sizeStyles = {
    sm: "px-3 py-1.5 text-sm rounded-lg",
    md: "px-6 py-3.5 text-base rounded-xl",
    lg: "px-8 py-4 text-lg rounded-2xl"
  };

  const variants = {
    primary: "bg-ios-yellow text-black hover:brightness-105 shadow-md shadow-orange-500/10", // Notes app yellow
    secondary: "bg-gray-100 text-black active:bg-gray-200",
    danger: "bg-red-50 text-ios-red active:bg-red-100",
    ghost: "bg-transparent text-ios-blue hover:bg-blue-50/50",
    magic: "bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/30 border border-white/20"
  };

  return (
    <button 
      className={`${baseStyle} ${sizeStyles[size]} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
}

export const IOSInput: React.FC<InputProps> = ({ label, className = '', ...props }) => {
  return (
    <div className="w-full">
      {label && <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 ml-1">{label}</label>}
      <div className="relative group">
        <input 
          className={`w-full bg-gray-50/50 border-none rounded-xl px-4 py-4 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ios-yellow/50 focus:bg-white transition-all shadow-sm ${className}`}
          {...props}
        />
      </div>
    </div>
  );
};

interface CardProps { 
    children: React.ReactNode; 
    className?: string; 
    onClick?: () => void;
    active?: boolean; 
}

export const IOSCard: React.FC<CardProps> = ({ 
  children, 
  className = '',
  onClick,
  active = false
}) => {
  return (
    <div 
      onClick={onClick}
      className={`
        bg-white rounded-2xl p-5 transition-all duration-300 relative overflow-hidden
        ${onClick ? 'cursor-pointer active:scale-[0.98]' : ''}
        ${active ? 'ring-2 ring-ios-yellow shadow-lg' : 'shadow-sm hover:shadow-md'}
        ${className}
      `}
    >
      {children}
    </div>
  );
};

export const IOSModal: React.FC<{ children: React.ReactNode, isOpen: boolean, onClose: () => void }> = ({ children, isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white rounded-3xl shadow-2xl p-6 w-full max-w-sm animate-scale-in">
                {children}
            </div>
        </div>
    );
};