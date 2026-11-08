import React from "react";
import { UserRound } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { PageHeader } from "../../components/ui";
import ProfileView from "../../components/portal/ProfileView";
import useStudentOverview from "../../components/portal/useStudentOverview";

/** The signed-in student's own record, read-only. */
const Profile = () => {
  const { user } = useAuth();
  const { data, error } = useStudentOverview(user?.student?.id);
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader icon={UserRound} title="My profile" description="Your details as the school has them." />
      <ProfileView overview={data} error={error} />
    </div>
  );
};

export default Profile;
