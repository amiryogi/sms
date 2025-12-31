import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { LogIn, Mail, Lock, AlertCircle, School } from 'lucide-react';
import { motion } from 'framer-motion';

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const from = location.state?.from?.pathname || '/dashboard';

  const { register, handleSubmit, formState: { errors } } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError('');
    try {
      await login(data);
      navigate(from, { replace: true });
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <motion.div 
        className="login-card"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="login-header">
          <div className="logo-icon">
            <School size={40} color="#6366f1" />
          </div>
          <h1>Welcome Back</h1>
          <p>Sign in to your School Management Portal</p>
        </div>

        {error && (
          <div className="error-alert">
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="login-form">
          <div className="input-group">
            <label htmlFor="email">Email Address</label>
            <div className="input-with-icon">
              <Mail size={18} className="icon" />
              <input 
                id="email"
                type="email" 
                placeholder="admin@school.com"
                {...register('email', { required: 'Email is required' })}
              />
            </div>
            {errors.email && <span className="error-text">{errors.email.message}</span>}
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="icon" />
              <input 
                id="password"
                type="password" 
                placeholder="••••••••"
                {...register('password', { required: 'Password is required' })}
              />
            </div>
            {errors.password && <span className="error-text">{errors.password.message}</span>}
          </div>

          <button type="submit" className="login-submit" disabled={isLoading}>
            {isLoading ? <div className="spinner"></div> : (
              <>
                <LogIn size={18} />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>© 2025 K-12 School Management System</p>
        </div>
      </motion.div>

      <style>{`
        .login-page {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
        }
        .login-card {
          background: white;
          padding: 2.5rem;
          border-radius: 20px;
          box-shadow: 0 10px 25px -5px rgba(0,0,0,0.1);
          width: 100%;
          max-width: 440px;
        }
        .login-header { text-align: center; margin-bottom: 2rem; }
        .logo-icon { margin-bottom: 1rem; display: flex; justify-content: center; }
        .login-header h1 { font-size: 1.75rem; font-weight: 800; color: #1e293b; margin-bottom: 0.5rem; }
        .login-header p { color: #64748b; font-size: 0.95rem; }
        .input-group { margin-bottom: 1.25rem; }
        .input-group label { display: block; font-size: 0.9rem; font-weight: 600; color: #475569; margin-bottom: 0.5rem; }
        .input-with-icon { position: relative; }
        .input-with-icon .icon { position: absolute; left: 12px; top: 12px; color: #94a3b8; }
        .input-with-icon input {
          width: 100%; padding: 0.75rem 0.75rem 0.75rem 2.5rem;
          border: 1px solid #e2e8f0; border-radius: 10px; font-size: 1rem;
          transition: border-color 0.2s;
        }
        .input-with-icon input:focus { outline: none; border-color: #6366f1; }
        .error-alert {
          background: #fef2f2; color: #b91c1c; padding: 0.75rem; border-radius: 8px;
          display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1.5rem; font-size: 0.9rem;
        }
        .error-text { color: #dc2626; font-size: 0.8rem; margin-top: 0.25rem; }
        .login-submit {
          width: 100%; background: #6366f1; color: white; border: none; padding: 0.85rem;
          border-radius: 10px; font-weight: 600; cursor: pointer; transition: background 0.2s;
          display: flex; align-items: center; justify-content: center; gap: 0.5rem;
        }
        .login-submit:hover { background: #4f46e5; }
        .login-submit:disabled { opacity: 0.7; cursor: not-allowed; }
        .login-footer { margin-top: 2rem; text-align: center; font-size: 0.8rem; color: #94a3b8; }
        .spinner {
          width: 20px; height: 20px; border: 2px solid white; border-bottom-color: transparent;
          border-radius: 50%; animation: rotation 1s linear infinite;
        }
      `}</style>
    </div>
  );
};

export default Login;
