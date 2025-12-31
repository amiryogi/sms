import React from 'react';
import { Upload } from 'lucide-react';

export const Input = ({ 
  label, 
  error, 
  icon: Icon, 
  register, 
  name, 
  ...props 
}) => {
  return (
    <div className="form-group">
      {label && <label htmlFor={name}>{label}</label>}
      <div className={`input-wrapper ${Icon ? 'has-icon' : ''}`}>
        {Icon && <Icon size={18} className="input-icon" />}
        <input id={name} {...(register ? register(name) : {})} {...props} />
      </div>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
};

export const Select = ({ 
  label, 
  error, 
  options, 
  register, 
  name, 
  placeholder = 'Select...', 
  ...props 
}) => {
  return (
    <div className="form-group">
      {label && <label htmlFor={name}>{label}</label>}
      <select id={name} {...(register ? register(name) : {})} {...props}>
        <option value="">{placeholder}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
};

export const Textarea = ({ 
  label, 
  error, 
  register, 
  name, 
  ...props 
}) => {
  return (
    <div className="form-group">
      {label && <label htmlFor={name}>{label}</label>}
      <textarea id={name} {...(register ? register(name) : {})} {...props} />
      {error && <span className="form-error">{error}</span>}
    </div>
  );
};

export const FileUpload = ({ 
  label, 
  error, 
  onChange, 
  accept, 
  multiple = false,
  files = [],
}) => {
  const handleChange = (e) => {
    if (onChange) {
      onChange(e.target.files);
    }
  };

  return (
    <div className="form-group">
      {label && <label>{label}</label>}
      <div className="file-upload-wrapper">
        <input
          type="file"
          onChange={handleChange}
          accept={accept}
          multiple={multiple}
          className="file-input-hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="file-upload-label">
          <Upload size={20} />
          <span>Click to upload or drag and drop</span>
        </label>
        {files.length > 0 && (
          <div className="file-list">
            {Array.from(files).map((file, i) => (
              <span key={i} className="file-item">{file.name}</span>
            ))}
          </div>
        )}
      </div>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
};

export const Button = ({ 
  children, 
  variant = 'primary', 
  loading = false, 
  icon: Icon,
  ...props 
}) => {
  return (
    <button className={`btn btn-${variant}`} disabled={loading} {...props}>
      {loading ? (
        <div className="btn-spinner"></div>
      ) : (
        <>
          {Icon && <Icon size={18} />}
          {children}
        </>
      )}
    </button>
  );
};

export const FormRow = ({ children }) => {
  return <div className="form-row">{children}</div>;
};
