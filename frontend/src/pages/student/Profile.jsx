import React from "react";
import { useAuth } from "../../context/AuthContext";
import { PageHeader, PageShell } from "../../components/ui";
import ProfileView from "../../components/portal/ProfileView";
import useStudentOverview from "../../components/portal/useStudentOverview";

/** The signed-in student's own record, read-only. */
const Profile = () => {
  const { user } = useAuth();
  const { data, error } = useStudentOverview(user?.student?.id);
  return (
    <PageShell>
      <PageHeader title="My profile" description="Your details as the school has them." />
      <ProfileView overview={data} error={error} />
    </PageShell>
  );
};

export default Profile;
