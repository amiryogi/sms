import React from "react";
import { PageHeader, PageShell } from "../ui";
import ChildSwitcher from "./ChildSwitcher";
import useChildren from "./useChildren";

/**
 * Frame for every parent-portal page: a header, the child switcher, then
 * `render(child, family)` for the chosen child. The view is keyed by the
 * child's id, so switching children never shows the previous child's data.
 * The width and rhythm come from PageShell, like every other page.
 */
const ParentPage = ({ title, description, render }) => {
  const family = useChildren();
  return (
    <PageShell>
      <PageHeader title={title} description={description} className="mb-2 print:hidden" />
      <ChildSwitcher {...family} />
      {family.child && <React.Fragment key={family.child.id}>{render(family.child, family)}</React.Fragment>}
    </PageShell>
  );
};

export default ParentPage;
