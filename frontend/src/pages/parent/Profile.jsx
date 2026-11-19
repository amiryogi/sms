import React from "react";
import ParentPage from "../../components/portal/ParentPage";
import ProfileView from "../../components/portal/ProfileView";
import useStudentOverview from "../../components/portal/useStudentOverview";

const ChildProfile = ({ studentId }) => {
  const { data, error } = useStudentOverview(studentId);
  return <ProfileView overview={data} error={error} />;
};

/** A linked child's school record, read-only. */
const ParentChildProfile = () => (
  <ParentPage title="Child's profile" description="Your child's details as the school has them." render={(child) => <ChildProfile studentId={child.id} />} />
);

export default ParentChildProfile;
