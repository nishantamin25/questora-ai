
import React from 'react';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const Logo: React.FC<LogoProps> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'h-8 w-8',
    md: 'h-12 w-12',
    lg: 'h-16 w-16'
  };

  return (
    <div className={`flex items-center space-x-3 ${className}`}>
      <img 
        src="/lovable-uploads/edd8058e-2fb1-4f02-aecd-253f94fd9578.png" 
        alt="Questora AI Logo" 
        className={`${sizeClasses[size]} object-contain`}
      />
      <span className="text-2xl font-bold font-poppins bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent">
        Questora AI
      </span>
    </div>
  );
};

export default Logo;
