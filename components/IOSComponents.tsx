import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  fullWidth?: boolean;
}

export const IOSButton: React.FC<ButtonProps> = ({ 
  children, 
  variant = 'primary', 
  fullWidth = false, 
  className = '', 
  ...props 
}) => {
  const baseStyle = "px-6 py-3.5 rounded-xl font-semibold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2";
  
  const variants = {
    primary: "bg-ios-blue text-white shadow-ios hover:brightness-110",
    secondary: "bg-white text-ios-blue border border-gray-200 shadow-sm",
    danger: "bg-ios-red text-white shadow-ios",
    ghost: "bg-transparent text-ios-blue hover:bg-gray-100"
  };

  return (
    <button 
      className={`${baseStyle} ${variants[variant]} ${fullWidth ? 'w-full' : ''} ${className}`}
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
      {label && <label className="block text-xs font-medium text-gray-500 uppercase mb-2 ml-1">{label}</label>}
      <input 
        className={`w-full bg-white border border-gray-200 rounded-xl px-4 py-3.5 text-base text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-ios-blue/50 focus:border-ios-blue transition-all ${className}`}
        {...props}
      />
    </div>
  );
};

export const IOSCard: React.FC<{ children: React.ReactNode, className?: string, onClick?: () => void }> = ({ 
  children, 
  className = '',
  onClick
}) => {
  return (
    <div 
      onClick={onClick}
      className={`bg-white rounded-2xl shadow-ios p-5 ${onClick ? 'cursor-pointer active:scale-[0.98] transition-transform' : ''} ${className}`}
    >
      {children}
    </div>
  );
};