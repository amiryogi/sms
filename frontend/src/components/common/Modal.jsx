import React from "react";
import Dialog from "../ui/Dialog";

/**
 * Legacy modal API ({ isOpen, onClose, title, size, children }) on top of the
 * accessible ui/Dialog: Esc closes, focus is trapped, full-screen on phones.
 * Pages put their own action buttons inside `children` (usually a
 * `.modal-actions` row at the end of a form).
 */
const Modal = ({ isOpen, onClose, title, children, size = "md", description }) => (
  <Dialog open={Boolean(isOpen)} onClose={onClose} title={title} description={description} size={size}>
    {children}
  </Dialog>
);

export default Modal;
