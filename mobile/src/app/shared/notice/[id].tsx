import { useLocalSearchParams } from "expo-router";
import { NoticeDetail } from "@/features/notices/NoticesView";

export default function NoticeRoute() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <NoticeDetail id={Number(id)} />;
}
