import React from 'react';

const LoadingSpinner = ({ size = 'md', text = '' }) => {
  const sizes = {
    sm: { width: 24, height: 24, border: 2 },
    md: { width: 40, height: 40, border: 3 },
    lg: { width: 60, height: 60, border: 4 },
  };

  const s = sizes[size];

  return (
    <div className="loading-container">
      <div 
        className="spinner"
        style={{
          width: s.width,
          height: s.height,
          borderWidth: s.border,
        }}
      />
      {text && <p className="loading-text">{text}</p>}
    </div>
  );
};

export default LoadingSpinner;
