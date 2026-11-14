import { Linking, View } from "react-native";
import { Stack } from "expo-router";
import Constants from "expo-constants";
import { Globe, Mail, MapPin, Phone } from "lucide-react-native";
import { AppText, Card, Divider, ListItem, Screen, SectionHeader } from "@/components/ui";
import { useUser } from "@/contexts/AuthContext";
import { APP_ENV } from "@/config/env";

/** The school's contact details and what the app keeps on this phone. */
export default function AboutScreen() {
  const { school } = useUser();
  const contacts = [
    school.address ? { icon: MapPin, title: school.address, url: null } : null,
    school.phone ? { icon: Phone, title: school.phone, url: `tel:${school.phone.replace(/\s+/g, "")}` } : null,
    school.email ? { icon: Mail, title: school.email, url: `mailto:${school.email}` } : null,
    school.website ? { icon: Globe, title: school.website, url: /^https?:\/\//.test(school.website) ? school.website : `https://${school.website}` } : null,
  ].filter((c): c is NonNullable<typeof c> => c !== null);

  return (
    <Screen>
      <Stack.Screen options={{ title: "About" }} />
      <AppText variant="title">{school.name}</AppText>
      {school.tagline ? <AppText variant="muted">{school.tagline}</AppText> : null}

      {contacts.length ? (
        <>
          <SectionHeader title="Contact the school" />
          <Card className="p-0">
            {contacts.map((c, i) => (
              <View key={c.title}>
                {i > 0 ? <Divider className="ml-16" /> : null}
                <ListItem title={c.title} icon={c.icon} onPress={c.url ? () => Linking.openURL(c.url!) : undefined} />
              </View>
            ))}
          </Card>
        </>
      ) : null}

      <SectionHeader title="Your data on this phone" />
      <Card className="gap-2">
        <AppText variant="body">
          Your sign-in is kept in the phone&apos;s secure storage. To work without a connection, the app keeps a copy of what
          you last viewed (dashboards, notices, results, fees). Signing out deletes all of it from this phone.
        </AppText>
        <AppText variant="body">
          Attendance, marks and payments are only ever sent while you are online, and the app never sends them without you.
        </AppText>
      </Card>

      <AppText variant="caption" className="mt-6 text-center">
        Vidyalaya SMS {Constants.expoConfig?.version ?? ""}
        {APP_ENV !== "production" ? ` (${APP_ENV})` : ""}
      </AppText>
    </Screen>
  );
}
