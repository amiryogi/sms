import React from 'react';
import { TrendingUp, TrendingDown } from 'lucide-react';

const StatCard = ({ 
  title, 
  value, 
  icon: Icon, 
  trend = null, 
  trendValue = null,
  color = 'primary' 
}) => {
  const colorClasses = {
    primary: 'stat-primary',
    success: 'stat-success',
    warning: 'stat-warning',
    danger: 'stat-danger',
    info: 'stat-info',
  };

  return (
    <div className={`stat-card ${colorClasses[color]}`}>
      <div className="stat-icon-wrapper">
        {Icon && <Icon size={24} />}
      </div>
      <div className="stat-content">
        <span className="stat-title">{title}</span>
        <span className="stat-value">{value}</span>
        {trend && (
          <div className={`stat-trend ${trend === 'up' ? 'trend-up' : 'trend-down'}`}>
            {trend === 'up' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{trendValue}</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;
