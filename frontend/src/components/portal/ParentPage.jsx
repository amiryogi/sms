import React from "react";
import { PageHeader } from "../ui";
import ChildSwitcher from "./ChildSwitcher";
import useChildren from "./useChildren";

/**
 * Frame for every parent-portal page: a header, the child switcher, then
 * `render(child, family)` for the chosen child. The view is keyed by the
 * child's id, so switching children never shows the previous child's data.
 */
const ParentPage = ({ icon, title, description, maxWidth = "max-w-6xl", render }) => {
  const family = useChildren();
  return (
    <div className={`mx-auto ${maxWidth} space-y-6`}>
      <PageHeader icon={icon} title={title} description={description} className="mb-2 print:hidden" />
      <ChildSwitcher {...family} />
      {family.child && <React.Fragment key={family.child.id}>{render(family.child, family)}</React.Fragment>}
    </div>
  );
};

export default ParentPage;
