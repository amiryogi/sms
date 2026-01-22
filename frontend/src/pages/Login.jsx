import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, useLocation, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import {
  LogIn,
  Mail,
  Lock,
  AlertCircle,
  School,
  Phone,
  Facebook,
  Instagram,
  Youtube,
  Globe,
  Building2,
} from "lucide-react";
import { motion } from "framer-motion";
import { schoolService } from "../api/schoolService";

const resolveAssetUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const base = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/v1$/, "")
    : window.location.origin;
  return `${base}/${url.replace(/^\\?/, "").replace(/^\//, "").replace(/\\/g, "/")}`;
};

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState(null);
  const [loadingSchool, setLoadingSchool] = useState(false);

  const from = location.state?.from?.pathname || "/dashboard";

  // Get school code from URL params or environment variable
  // Usage: /login?school=DEMO001 or set VITE_DEFAULT_SCHOOL_CODE in .env
  const schoolCode =
    searchParams.get("school") ||
    import.meta.env.VITE_DEFAULT_SCHOOL_CODE ||
    "DEMO001";

  useEffect(() => {
    if (schoolCode) {
      fetchPublicSchoolInfo(schoolCode);
    }
  }, [schoolCode]);

  const fetchPublicSchoolInfo = async (code) => {
    setLoadingSchool(true);
    try {
      const response = await schoolService.getPublicSchoolByCode(code);
      setSchoolInfo(response.data.data);
    } catch (err) {
      console.error("Failed to fetch school info:", err);
      // Don't show error - just use default branding
    } finally {
      setLoadingSchool(false);
    }
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async (data) => {
    setIsLoading(true);
    setError("");
    try {
      await login(data);
      navigate(from, { replace: true });
    } catch (err) {
      setError(
        err.response?.data?.message ||
          "Login failed. Please check your credentials.",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const logoSrc = schoolInfo?.logoUrl
    ? resolveAssetUrl(schoolInfo.logoUrl)
    : null;
  const bannerSrc = schoolInfo?.bannerUrl
    ? resolveAssetUrl(schoolInfo.bannerUrl)
    : null;

  return (
    <div
      className="login-page"
      style={
        bannerSrc
          ? {
              backgroundImage: `linear-gradient(rgba(241,245,249,0.92), rgba(226,232,240,0.95)), url(${bannerSrc})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : {}
      }
    >
      <motion.div
        className="login-card"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <div className="login-header">
          <div className="logo-icon">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt="School Logo"
                style={{
                  width: 64,
                  height: 64,
                  objectFit: "contain",
                  borderRadius: 12,
                }}
              />
            ) : (
              <Building2 size={48} color="#6366f1" />
            )}
          </div>
          <h1>{schoolInfo?.name || "Welcome Back"}</h1>
          <p>
            {schoolInfo?.tagline || "Sign in to your School Management Portal"}
          </p>

          {/* School Contact Info */}
          {schoolInfo &&
            (schoolInfo.phone ||
              schoolInfo.landlineNumber ||
              schoolInfo.email) && (
              <div className="school-contact-info">
                {schoolInfo.landlineNumber && (
                  <span>
                    <Phone size={14} /> {schoolInfo.landlineNumber}
                  </span>
                )}
                {schoolInfo.phone && (
                  <span>
                    <Phone size={14} /> {schoolInfo.phone}
                  </span>
                )}
                {schoolInfo.email && (
                  <span>
                    <Mail size={14} /> {schoolInfo.email}
                  </span>
                )}
              </div>
            )}

          {/* Social Links */}
          {schoolInfo &&
            (schoolInfo.facebookUrl ||
              schoolInfo.instagramUrl ||
              schoolInfo.youtubeUrl) && (
              <div className="school-social-links">
                {schoolInfo.facebookUrl && (
                  <a
                    href={schoolInfo.facebookUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Facebook"
                  >
                    <Facebook size={20} />
                  </a>
                )}
                {schoolInfo.instagramUrl && (
                  <a
                    href={schoolInfo.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Instagram"
                  >
                    <Instagram size={20} />
                  </a>
                )}
                {schoolInfo.youtubeUrl && (
                  <a
                    href={schoolInfo.youtubeUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="YouTube"
                  >
                    <Youtube size={20} />
                  </a>
                )}
                {schoolInfo.website && (
                  <a
                    href={schoolInfo.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Website"
                  >
                    <Globe size={20} />
                  </a>
                )}
              </div>
            )}
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
                {...register("email", { required: "Email is required" })}
              />
            </div>
            {errors.email && (
              <span className="error-text">{errors.email.message}</span>
            )}
          </div>

          <div className="input-group">
            <label htmlFor="password">Password</label>
            <div className="input-with-icon">
              <Lock size={18} className="icon" />
              <input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register("password", { required: "Password is required" })}
              />
            </div>
            {errors.password && (
              <span className="error-text">{errors.password.message}</span>
            )}
          </div>

          <button type="submit" className="login-submit" disabled={isLoading}>
            {isLoading ? (
              <div className="spinner"></div>
            ) : (
              <>
                <LogIn size={18} />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>
            © {new Date().getFullYear()}{" "}
            {schoolInfo?.name || "K-12 School Management System"}
          </p>
          {schoolInfo?.address && (
            <p className="school-address">{schoolInfo.address}</p>
          )}
        </div>
      </motion.div>

      <style>{`
        .login-page {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%);
          padding: 1rem;
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
        .login-header h1 { font-size: 1.5rem; font-weight: 800; color: #1e293b; margin-bottom: 0.5rem; }
        .login-header p { color: #64748b; font-size: 0.95rem; margin: 0; }
        .school-contact-info {
          display: flex;
          flex-wrap: wrap;
          justify-content: center;
          gap: 1rem;
          margin-top: 0.75rem;
          font-size: 0.8rem;
          color: #64748b;
        }
        .school-contact-info span {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        .school-social-links {
          display: flex;
          justify-content: center;
          gap: 0.75rem;
          margin-top: 1rem;
        }
        .school-social-links a {
          color: #6366f1;
          padding: 0.5rem;
          border-radius: 50%;
          background: #f1f5f9;
          transition: all 0.2s;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .school-social-links a:hover {
          background: #6366f1;
          color: white;
        }
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
        .login-footer .school-address { margin-top: 0.25rem; font-size: 0.75rem; }
        .spinner {
          width: 20px; height: 20px; border: 2px solid white; border-bottom-color: transparent;
          border-radius: 50%; animation: rotation 1s linear infinite;
        }
        @keyframes rotation {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default Login;
