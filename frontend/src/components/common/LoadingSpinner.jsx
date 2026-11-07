import React from "react";
import Spinner, { LoadingBlock } from "../ui/Spinner";

const SIZES = { sm: 18, md: 24, lg: 36 };

/** Kept for compatibility; prefer ui/LoadingBlock. */
const LoadingSpinner = ({ size = "md", text = "" }) =>
  text ? (
    <LoadingBlock text={text} />
  ) : (
    <div className="flex items-center justify-center py-6">
      <Spinner size={SIZES[size] || 24} className="text-brand-600" label="Loading" />
    </div>
  );

export default LoadingSpinner;
