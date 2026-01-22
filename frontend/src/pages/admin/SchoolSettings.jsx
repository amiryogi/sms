import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../../context/AuthContext";
import { schoolService } from "../../api/schoolService";
import {
  Building2,
  Save,
  Upload,
  Image,
  Phone,
  Mail,
  Globe,
  MapPin,
  Facebook,
  Instagram,
  Youtube,
  User,
  Calendar,
  Loader2,
  Check,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

const resolveAssetUrl = (url) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  const base = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace(/\/api\/v1$/, "")
    : window.location.origin;
  return `${base}/${url.replace(/^\\?/, "").replace(/^\//, "").replace(/\\/g, "/")}`;
};

const SchoolSettings = () => {
  const { refreshUser } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [message, setMessage] = useState({ type: "", text: "" });
  const [fieldErrors, setFieldErrors] = useState({});

  const messageRef = useRef(null);

  const logoInputRef = useRef(null);
  const bannerInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: "",
    address: "",
    phone: "",
    email: "",
    tagline: "",
    website: "",
    landlineNumber: "",
    facebookUrl: "",
    instagramUrl: "",
    youtubeUrl: "",
    principalName: "",
    establishedYear: "",
  });

  const [schoolInfo, setSchoolInfo] = useState(null);

  useEffect(() => {
    fetchSchoolSettings();
  }, []);

  const fetchSchoolSettings = async () => {
    setLoading(true);
    try {
      const response = await schoolService.getMySchool();
      const school = response.data.data;
      setSchoolInfo(school);
      setFormData({
        name: school.name || "",
        address: school.address || "",
        phone: school.phone || "",
        email: school.email || "",
        tagline: school.tagline || "",
        website: school.website || "",
        landlineNumber: school.landlineNumber || "",
        facebookUrl: school.facebookUrl || "",
        instagramUrl: school.instagramUrl || "",
        youtubeUrl: school.youtubeUrl || "",
        principalName: school.principalName || "",
        establishedYear: school.establishedYear || "",
      });
    } catch (error) {
      console.error("Error fetching school settings:", error);
      setMessage({ type: "error", text: "Failed to load school settings" });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear field error when user starts typing
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage({ type: "", text: "" });
    setFieldErrors({});

    try {
      const response = await schoolService.updateSchool(formData);
      setSchoolInfo(response.data.data);
      setMessage({
        type: "success",
        text: "School settings updated successfully!",
      });
      // Refresh user context to update sidebar school name
      if (refreshUser) refreshUser();

      // Scroll to top to show success message
      setTimeout(() => {
        messageRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 100);

      // Auto-clear success message after 5 seconds
      setTimeout(() => {
        setMessage({ type: "", text: "" });
      }, 5000);
    } catch (error) {
      console.error("Error updating school settings:", error);

      // Parse validation errors from backend
      const backendErrors = error.response?.data?.errors;
      if (backendErrors && Array.isArray(backendErrors)) {
        const newFieldErrors = {};
        backendErrors.forEach((err) => {
          if (err.field) {
            newFieldErrors[err.field] = err.message;
          }
        });
        setFieldErrors(newFieldErrors);
        setMessage({
          type: "error",
          text: `Validation failed: Please fix ${backendErrors.length} error(s) highlighted below`,
        });
      } else {
        setMessage({
          type: "error",
          text:
            error.response?.data?.message || "Failed to update school settings",
        });
      }
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setMessage({
        type: "error",
        text: "Please select an image file for the logo",
      });
      return;
    }

    // Validate file size (2MB max)
    if (file.size > 2 * 1024 * 1024) {
      setMessage({ type: "error", text: "Logo image must be less than 2MB" });
      return;
    }

    setUploadingLogo(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await schoolService.uploadLogo(file);
      setSchoolInfo((prev) => ({
        ...prev,
        logoUrl: response.data.data.logoUrl,
      }));
      setMessage({ type: "success", text: "Logo uploaded successfully!" });
      if (refreshUser) refreshUser();
    } catch (error) {
      console.error("Error uploading logo:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to upload logo",
      });
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = "";
    }
  };

  const handleBannerUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setMessage({
        type: "error",
        text: "Please select an image file for the banner",
      });
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ type: "error", text: "Banner image must be less than 5MB" });
      return;
    }

    setUploadingBanner(true);
    setMessage({ type: "", text: "" });

    try {
      const response = await schoolService.uploadBanner(file);
      setSchoolInfo((prev) => ({
        ...prev,
        bannerUrl: response.data.data.bannerUrl,
      }));
      setMessage({ type: "success", text: "Banner uploaded successfully!" });
    } catch (error) {
      console.error("Error uploading banner:", error);
      setMessage({
        type: "error",
        text: error.response?.data?.message || "Failed to upload banner",
      });
    } finally {
      setUploadingBanner(false);
      if (bannerInputRef.current) bannerInputRef.current.value = "";
    }
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="loading-state">
          <Loader2 className="spinner" size={32} />
          <p>Loading school settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div>
          <h1>
            <Building2 className="inline-icon" /> School Settings
          </h1>
          <p className="text-muted">
            Manage your school's branding, contact information, and social media
            links
          </p>
        </div>
      </div>

      {message.text && (
        <div
          ref={messageRef}
          className={`alert ${message.type === "error" ? "alert-error" : "alert-success"}`}
        >
          {message.type === "error" ? (
            <AlertCircle size={18} />
          ) : (
            <Check size={18} />
          )}
          <span>{message.text}</span>
          {message.type === "success" && (
            <button
              type="button"
              className="alert-close"
              onClick={() => setMessage({ type: "", text: "" })}
              aria-label="Dismiss"
            >
              ×
            </button>
          )}
        </div>
      )}

      <div className="school-settings-grid">
        {/* Logo & Banner Section */}
        <div className="card">
          <h3 className="card-title">
            <Image size={20} /> Branding
          </h3>

          <div className="branding-section">
            {/* Logo Upload */}
            <div className="upload-section">
              <label className="upload-label">School Logo</label>
              <p className="upload-hint">
                Recommended: 200x200px, PNG or JPG, max 2MB
              </p>

              <div className="logo-preview-container">
                {schoolInfo?.logoUrl ? (
                  <img
                    src={resolveAssetUrl(schoolInfo.logoUrl)}
                    alt="School Logo"
                    className="logo-preview"
                  />
                ) : (
                  <div className="logo-placeholder">
                    <Building2 size={48} />
                    <span>No logo uploaded</span>
                  </div>
                )}
              </div>

              <input
                type="file"
                ref={logoInputRef}
                accept="image/*"
                onChange={handleLogoUpload}
                style={{ display: "none" }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => logoInputRef.current?.click()}
                disabled={uploadingLogo}
              >
                {uploadingLogo ? (
                  <>
                    <Loader2 className="spinner" size={16} /> Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={16} /> Upload Logo
                  </>
                )}
              </button>
            </div>

            {/* Banner Upload */}
            <div className="upload-section">
              <label className="upload-label">School Banner</label>
              <p className="upload-hint">
                Recommended: 1200x300px, PNG or JPG, max 5MB
              </p>

              <div className="banner-preview-container">
                {schoolInfo?.bannerUrl ? (
                  <img
                    src={resolveAssetUrl(schoolInfo.bannerUrl)}
                    alt="School Banner"
                    className="banner-preview"
                  />
                ) : (
                  <div className="banner-placeholder">
                    <Image size={32} />
                    <span>No banner uploaded</span>
                  </div>
                )}
              </div>

              <input
                type="file"
                ref={bannerInputRef}
                accept="image/*"
                onChange={handleBannerUpload}
                style={{ display: "none" }}
              />
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => bannerInputRef.current?.click()}
                disabled={uploadingBanner}
              >
                {uploadingBanner ? (
                  <>
                    <Loader2 className="spinner" size={16} /> Uploading...
                  </>
                ) : (
                  <>
                    <Upload size={16} /> Upload Banner
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* School Information Form */}
        <div className="card">
          <h3 className="card-title">
            <Building2 size={20} /> School Information
          </h3>

          <form onSubmit={handleSubmit}>
            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="name">
                  <Building2 size={16} /> School Name *
                </label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  placeholder="Enter school name"
                  className={fieldErrors.name ? "input-error" : ""}
                />
                {fieldErrors.name && (
                  <span className="field-error">{fieldErrors.name}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="tagline">Tagline / Motto</label>
                <input
                  type="text"
                  id="tagline"
                  name="tagline"
                  value={formData.tagline}
                  onChange={handleChange}
                  placeholder="e.g., Education for Excellence"
                  className={fieldErrors.tagline ? "input-error" : ""}
                />
                {fieldErrors.tagline && (
                  <span className="field-error">{fieldErrors.tagline}</span>
                )}
              </div>

              <div className="form-group full-width">
                <label htmlFor="address">
                  <MapPin size={16} /> Address
                </label>
                <textarea
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  rows={2}
                  placeholder="Enter full address"
                  className={fieldErrors.address ? "input-error" : ""}
                />
                {fieldErrors.address && (
                  <span className="field-error">{fieldErrors.address}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="phone">
                  <Phone size={16} /> Mobile Number
                </label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="e.g., 9841234567"
                  className={fieldErrors.phone ? "input-error" : ""}
                />
                {fieldErrors.phone && (
                  <span className="field-error">{fieldErrors.phone}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="landlineNumber">
                  <Phone size={16} /> Landline Number
                </label>
                <input
                  type="tel"
                  id="landlineNumber"
                  name="landlineNumber"
                  value={formData.landlineNumber}
                  onChange={handleChange}
                  placeholder="e.g., 01-4123456"
                  className={fieldErrors.landlineNumber ? "input-error" : ""}
                />
                {fieldErrors.landlineNumber && (
                  <span className="field-error">
                    {fieldErrors.landlineNumber}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="email">
                  <Mail size={16} /> Email Address
                </label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g., info@school.edu.np"
                  className={fieldErrors.email ? "input-error" : ""}
                />
                {fieldErrors.email && (
                  <span className="field-error">{fieldErrors.email}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="website">
                  <Globe size={16} /> Website
                </label>
                <input
                  type="url"
                  id="website"
                  name="website"
                  value={formData.website}
                  onChange={handleChange}
                  placeholder="e.g., https://www.school.edu.np"
                  className={fieldErrors.website ? "input-error" : ""}
                />
                {fieldErrors.website && (
                  <span className="field-error">{fieldErrors.website}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="principalName">
                  <User size={16} /> Principal Name
                </label>
                <input
                  type="text"
                  id="principalName"
                  name="principalName"
                  value={formData.principalName}
                  onChange={handleChange}
                  placeholder="e.g., Mr. Ram Prasad Sharma"
                  className={fieldErrors.principalName ? "input-error" : ""}
                />
                {fieldErrors.principalName && (
                  <span className="field-error">
                    {fieldErrors.principalName}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="establishedYear">
                  <Calendar size={16} /> Established Year
                </label>
                <input
                  type="number"
                  id="establishedYear"
                  name="establishedYear"
                  value={formData.establishedYear}
                  onChange={handleChange}
                  min="1800"
                  max={new Date().getFullYear()}
                  placeholder="e.g., 1990"
                  className={fieldErrors.establishedYear ? "input-error" : ""}
                />
                {fieldErrors.establishedYear && (
                  <span className="field-error">
                    {fieldErrors.establishedYear}
                  </span>
                )}
              </div>
            </div>

            <h4 className="section-title">
              <ExternalLink size={18} /> Social Media Links
            </h4>

            <div className="form-grid">
              <div className="form-group">
                <label htmlFor="facebookUrl">
                  <Facebook size={16} /> Facebook
                </label>
                <input
                  type="url"
                  id="facebookUrl"
                  name="facebookUrl"
                  value={formData.facebookUrl}
                  onChange={handleChange}
                  placeholder="https://facebook.com/yourschool"
                  className={fieldErrors.facebookUrl ? "input-error" : ""}
                />
                {fieldErrors.facebookUrl && (
                  <span className="field-error">{fieldErrors.facebookUrl}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="instagramUrl">
                  <Instagram size={16} /> Instagram
                </label>
                <input
                  type="url"
                  id="instagramUrl"
                  name="instagramUrl"
                  value={formData.instagramUrl}
                  onChange={handleChange}
                  placeholder="https://instagram.com/yourschool"
                  className={fieldErrors.instagramUrl ? "input-error" : ""}
                />
                {fieldErrors.instagramUrl && (
                  <span className="field-error">
                    {fieldErrors.instagramUrl}
                  </span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="youtubeUrl">
                  <Youtube size={16} /> YouTube
                </label>
                <input
                  type="url"
                  id="youtubeUrl"
                  name="youtubeUrl"
                  value={formData.youtubeUrl}
                  onChange={handleChange}
                  placeholder="https://youtube.com/@yourschool"
                  className={fieldErrors.youtubeUrl ? "input-error" : ""}
                />
                {fieldErrors.youtubeUrl && (
                  <span className="field-error">{fieldErrors.youtubeUrl}</span>
                )}
              </div>
            </div>

            <div className="form-actions">
              <button
                type="submit"
                className="btn btn-primary"
                disabled={saving}
              >
                {saving ? (
                  <>
                    <Loader2 className="spinner" size={16} /> Saving...
                  </>
                ) : (
                  <>
                    <Save size={16} /> Save Changes
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Preview Card */}
        <div className="card">
          <h3 className="card-title">Preview</h3>
          <p className="text-muted" style={{ marginBottom: "1rem" }}>
            This is how your school info will appear on login page and report
            cards
          </p>

          <div className="school-preview">
            {schoolInfo?.bannerUrl && (
              <div className="preview-banner">
                <img src={resolveAssetUrl(schoolInfo.bannerUrl)} alt="Banner" />
              </div>
            )}

            <div className="preview-header">
              {schoolInfo?.logoUrl ? (
                <img
                  src={resolveAssetUrl(schoolInfo.logoUrl)}
                  alt="Logo"
                  className="preview-logo"
                />
              ) : (
                <div className="preview-logo-placeholder">
                  <Building2 size={32} />
                </div>
              )}

              <div className="preview-info">
                <h2>{formData.name || "School Name"}</h2>
                {formData.tagline && (
                  <p className="preview-tagline">{formData.tagline}</p>
                )}
                {formData.address && (
                  <p className="preview-address">{formData.address}</p>
                )}

                <div className="preview-contact">
                  {formData.phone && (
                    <span>
                      <Phone size={14} /> {formData.phone}
                    </span>
                  )}
                  {formData.landlineNumber && (
                    <span>
                      <Phone size={14} /> {formData.landlineNumber}
                    </span>
                  )}
                  {formData.email && (
                    <span>
                      <Mail size={14} /> {formData.email}
                    </span>
                  )}
                </div>

                {(formData.facebookUrl ||
                  formData.instagramUrl ||
                  formData.youtubeUrl) && (
                  <div className="preview-social">
                    {formData.facebookUrl && (
                      <a
                        href={formData.facebookUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Facebook size={18} />
                      </a>
                    )}
                    {formData.instagramUrl && (
                      <a
                        href={formData.instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Instagram size={18} />
                      </a>
                    )}
                    {formData.youtubeUrl && (
                      <a
                        href={formData.youtubeUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Youtube size={18} />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        .school-settings-grid {
          display: grid;
          gap: 1.5rem;
        }
        
        .card-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-size: 1.1rem;
          font-weight: 600;
          margin-bottom: 1.5rem;
          padding-bottom: 0.75rem;
          border-bottom: 1px solid var(--border);
        }
        
        .branding-section {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 2rem;
        }
        
        .upload-section {
          display: flex;
          flex-direction: column;
          gap: 0.75rem;
        }
        
        .upload-label {
          font-weight: 600;
          color: var(--text);
        }
        
        .upload-hint {
          font-size: 0.8rem;
          color: var(--text-muted);
          margin: 0;
        }
        
        .logo-preview-container {
          width: 150px;
          height: 150px;
          border: 2px dashed var(--border);
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-secondary);
        }
        
        .logo-preview {
          width: 100%;
          height: 100%;
          object-fit: contain;
          padding: 0.5rem;
        }
        
        .logo-placeholder, .banner-placeholder {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 0.5rem;
          color: var(--text-muted);
          font-size: 0.85rem;
        }
        
        .banner-preview-container {
          width: 100%;
          max-width: 400px;
          height: 100px;
          border: 2px dashed var(--border);
          border-radius: 12px;
          overflow: hidden;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-secondary);
        }
        
        .banner-preview {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .form-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 1rem;
        }
        
        .form-group.full-width {
          grid-column: 1 / -1;
        }
        
        .form-group label {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          font-weight: 500;
          margin-bottom: 0.5rem;
          color: var(--text);
        }
        
        .form-group input,
        .form-group textarea {
          width: 100%;
          padding: 0.75rem;
          border: 1px solid var(--border);
          border-radius: 8px;
          font-size: 0.95rem;
          transition: border-color 0.2s;
        }
        
        .form-group input:focus,
        .form-group textarea:focus {
          outline: none;
          border-color: var(--primary);
        }
        
        /* Field error styles */
        .form-group input.input-error,
        .form-group textarea.input-error {
          border-color: #dc2626;
          background-color: #fef2f2;
        }
        
        .form-group input.input-error:focus,
        .form-group textarea.input-error:focus {
          border-color: #dc2626;
          box-shadow: 0 0 0 2px rgba(220, 38, 38, 0.2);
        }
        
        .field-error {
          display: block;
          color: #dc2626;
          font-size: 0.8rem;
          margin-top: 0.35rem;
          font-weight: 500;
        }
        
        .section-title {
          display: flex;
          align-items: center;
          gap: 0.5rem;
          margin: 1.5rem 0 1rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border);
          font-size: 1rem;
          color: var(--text);
        }
        
        .form-actions {
          margin-top: 1.5rem;
          padding-top: 1rem;
          border-top: 1px solid var(--border);
          display: flex;
          justify-content: flex-end;
        }
        
        .alert {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          padding: 1rem;
          border-radius: 8px;
          margin-bottom: 1.5rem;
          position: relative;
          animation: slideIn 0.3s ease-out;
        }
        
        @keyframes slideIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .alert-success {
          background: #dcfce7;
          color: #166534;
          border: 1px solid #86efac;
        }
        
        .alert-error {
          background: #fee2e2;
          color: #991b1b;
          border: 1px solid #fca5a5;
        }
        
        .alert-close {
          position: absolute;
          right: 0.75rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          font-size: 1.5rem;
          line-height: 1;
          cursor: pointer;
          color: inherit;
          opacity: 0.6;
          padding: 0 0.25rem;
        }
        
        .alert-close:hover {
          opacity: 1;
        }
        
        /* Preview styles */
        .school-preview {
          border: 1px solid var(--border);
          border-radius: 12px;
          overflow: hidden;
          background: white;
        }
        
        .preview-banner {
          width: 100%;
          height: 80px;
          overflow: hidden;
        }
        
        .preview-banner img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        
        .preview-header {
          display: flex;
          gap: 1rem;
          padding: 1rem;
          align-items: flex-start;
        }
        
        .preview-logo {
          width: 60px;
          height: 60px;
          object-fit: contain;
          border-radius: 8px;
          border: 1px solid var(--border);
        }
        
        .preview-logo-placeholder {
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--bg-secondary);
          border-radius: 8px;
          color: var(--text-muted);
        }
        
        .preview-info h2 {
          font-size: 1.1rem;
          margin: 0 0 0.25rem;
          color: var(--text);
        }
        
        .preview-tagline {
          font-style: italic;
          color: var(--text-muted);
          font-size: 0.85rem;
          margin: 0 0 0.5rem;
        }
        
        .preview-address {
          font-size: 0.85rem;
          color: var(--text-muted);
          margin: 0 0 0.5rem;
        }
        
        .preview-contact {
          display: flex;
          flex-wrap: wrap;
          gap: 0.75rem;
          font-size: 0.8rem;
          color: var(--text-muted);
        }
        
        .preview-contact span {
          display: flex;
          align-items: center;
          gap: 0.25rem;
        }
        
        .preview-social {
          display: flex;
          gap: 0.75rem;
          margin-top: 0.75rem;
        }
        
        .preview-social a {
          color: var(--primary);
          transition: color 0.2s;
        }
        
        .preview-social a:hover {
          color: var(--primary-dark);
        }
        
        .loading-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 1rem;
          padding: 4rem;
          color: var(--text-muted);
        }
        
        .spinner {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default SchoolSettings;
