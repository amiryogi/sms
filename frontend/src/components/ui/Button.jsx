import React from "react";
import { cn } from "../../lib/cn";
import Spinner from "./Spinner";
import { VARIANTS, buttonClasses } from "./styles";

const ICON_SIZES = { xs: 14, sm: 14, md: 16, lg: 18 };

/**
 * Button. `icon` is a lucide component shown before the label; `loading`
 * shows a spinner and disables the button.
 */
export const Button = React.forwardRef(function Button(
  { variant = "primary", size = "md", icon: Icon, iconRight: IconRight, loading = false, className, children, disabled, type = "button", ...props },
  ref,
) {
  const iconSize = ICON_SIZES[size] || 16;
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClasses({ variant, size, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {loading ? <Spinner size={iconSize} /> : Icon ? <Icon size={iconSize} aria-hidden="true" /> : null}
      {children}
      {IconRight && !loading && <IconRight size={iconSize} aria-hidden="true" />}
    </button>
  );
});

const ICON_BUTTON_SIZES = { sm: "size-8 rounded-lg", md: "size-9 rounded-lg", lg: "size-10 rounded-xl" };

/** Square icon-only button. `label` is required: it becomes aria-label and the tooltip. */
export const IconButton = React.forwardRef(function IconButton(
  { icon, label, variant = "ghost", size = "md", className, type = "button", ...props },
  ref,
) {
  const Icon = icon;
  return (
    <button
      ref={ref}
      type={type}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 cursor-pointer items-center justify-center transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-600",
        "disabled:pointer-events-none disabled:opacity-50",
        VARIANTS[variant] || VARIANTS.ghost,
        ICON_BUTTON_SIZES[size] || ICON_BUTTON_SIZES.md,
        className,
      )}
      {...props}
    >
      <Icon size={size === "sm" ? 15 : 17} aria-hidden="true" />
    </button>
  );
});

export default Button;
