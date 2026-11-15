import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { NoAccess } from "@/features/auth/StartupScreens";
import { PREF_KEYS, readJson } from "@/lib/storage";
import { homeAreaFor } from "@/utils/roles";

/** Where the app opens: onboarding once, sign-in, the forced password change, or the user's home area. */
export default function Index() {
  const { status, user } = useAuth();
  const [onboardingDone, setOnboardingDone] = useState<boolean | null>(null);

  useEffect(() => {
    readJson<boolean>(PREF_KEYS.onboardingDone, false).then(setOnboardingDone);
  }, []);

  if (status !== "signedIn" || !user) {
    if (onboardingDone === null) return null;
    return <Redirect href={onboardingDone ? "/login" : "/onboarding"} />;
  }
  if (user.mustChangePassword) return <Redirect href="/change-password" />;

  const area = homeAreaFor(user.roles);
  if (!area) return <NoAccess />;
  return <Redirect href={`/${area}`} />;
}
