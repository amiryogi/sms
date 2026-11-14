import type { ReactNode } from "react";
import { UserX } from "lucide-react-native";
import { EmptyState, Screen } from "@/components/ui";
import { useUser } from "@/contexts/AuthContext";

/** The signed-in student's own id (from the profile), or a clear message if the account has no student record. */
export const StudentGate = ({ children }: { children: (studentId: number) => ReactNode }) => {
  const user = useUser();
  const id = user.student?.id;
  if (!id) {
    return (
      <Screen>
        <EmptyState icon={UserX} title="No student record" message="This account isn't linked to a student. Ask the school office." />
      </Screen>
    );
  }
  return <>{children(id)}</>;
};
