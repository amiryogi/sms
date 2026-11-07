import React, { useState } from "react";
import { Upload } from "lucide-react";
import { Avatar, toast } from "../ui";
import { uploadService } from "../../api/uploadService";

/**
 * Profile photo with an upload button. Calls onChange(url) after a successful
 * upload; the page saves that url with the rest of its form.
 */
const AvatarUpload = ({ url, name, onChange, disabled = false }) => {
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const res = await uploadService.uploadAvatar(file);
      const uploaded = res?.data?.url || res?.url || res?.data?.data?.url;
      if (uploaded) onChange?.(uploaded);
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not upload the photo");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <Avatar src={url} name={name} size="xl" />
      {!disabled && (
        <div>
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-slate-700 ring-1 ring-slate-300 ring-inset transition-colors hover:bg-slate-50 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-brand-600">
            <Upload size={15} aria-hidden="true" />
            {uploading ? "Uploading…" : url ? "Change photo" : "Upload photo"}
            <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="sr-only" onChange={handleFile} disabled={uploading} />
          </label>
          <p className="mt-1 text-xs text-slate-500">JPG, PNG or WebP.</p>
        </div>
      )}
    </div>
  );
};

export default AvatarUpload;
