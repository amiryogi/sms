import React from "react";
import { Badge } from "../ui";
import { FEE_STATUS, APPROVAL_STATUS } from "./financeLabels";

/** Status of a fee, installment or account (paid / partial / pending / overdue / cancelled / none). */
export const FeeStatusBadge = ({ status, overdue = false, className }) => {
  const meta = FEE_STATUS[overdue && status !== "paid" && status !== "cancelled" ? "overdue" : status] || FEE_STATUS.pending;
  return (
    <Badge tone={meta.tone} dot className={className}>
      {meta.label}
    </Badge>
  );
};

/** Status of a discount or reversal request. */
export const ApprovalBadge = ({ status, className }) => {
  const meta = APPROVAL_STATUS[status] || APPROVAL_STATUS.PENDING;
  return (
    <Badge tone={meta.tone} dot className={className}>
      {meta.label}
    </Badge>
  );
};

export default FeeStatusBadge;
