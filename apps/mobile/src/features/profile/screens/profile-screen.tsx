import Feather from "@expo/vector-icons/Feather";
import { router } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

import { mapMobileBackendError } from "../../../api/backend/errors";
import { theme } from "../../../app/theme";
import { ActionButton } from "../../../app/ui/action-button";
import { Panel } from "../../../app/ui/panel";
import { Screen } from "../../../app/ui/screen";
import { env } from "../../../config/env";
import { useAuthSession } from "../../auth/auth-session";
import { useMyProfileQuery } from "../data/use-my-profile-query";

export function ProfileScreen() {
  const { session, clearSession } = useAuthSession();
  const profileQuery = useMyProfileQuery();
  const mappedError = profileQuery.error
    ? mapMobileBackendError(profileQuery.error)
    : null;

  async function handleSignOut() {
    await clearSession();
    router.replace("/(auth)/sign-in");
  }

  return (
    <Screen>
      <Panel>
        <Text style={styles.kicker}>Profile shell</Text>
        <Text style={styles.title}>Session-aware, but still backend-safe.</Text>
        <Text style={styles.body}>
          This screen already separates private session state from public
          profile data and keeps all future writes behind `apps/api`.
        </Text>
      </Panel>

      <Panel>
        <Text style={styles.sectionTitle}>Local session</Text>
        <View style={styles.row}>
          <Feather color={theme.colors.primary} name="lock" size={18} />
          <Text style={styles.value}>
            Access token: {session?.accessToken ? "stored" : "missing"}
          </Text>
        </View>
        <Text style={styles.body}>User id: {session?.userId ?? "unknown"}</Text>
        <Text style={styles.body}>
          API base URL: {env.apiBaseUrl ?? "not configured"}
        </Text>
        <ActionButton
          label="Clear local session"
          onPress={handleSignOut}
          variant="secondary"
        />
      </Panel>

      <Panel>
        <Text style={styles.sectionTitle}>My profile query</Text>
        {profileQuery.isLoading ? (
          <Text style={styles.body}>Loading profile snapshot...</Text>
        ) : null}
        {mappedError ? (
          <Text style={styles.errorText}>{mappedError.message}</Text>
        ) : null}
        {profileQuery.data ? (
          <>
            <Text style={styles.profileName}>
              {profileQuery.data.publicProfile.displayName}
            </Text>
            <Text style={styles.body}>
              @{profileQuery.data.publicProfile.handle}
            </Text>
            <Text style={styles.body}>
              {profileQuery.data.publicProfile.bio}
            </Text>
            <Text style={styles.body}>
              Reputation: {profileQuery.data.publicStats.reputationScore} (
              {profileQuery.data.publicStats.expertiseLevelLabel})
            </Text>
          </>
        ) : null}
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: theme.colors.primary
  },
  title: {
    marginTop: 12,
    fontSize: 28,
    lineHeight: 34,
    fontWeight: "700",
    color: theme.colors.ink
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: "700",
    color: theme.colors.ink
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.muted
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8
  },
  value: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.ink
  },
  profileName: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.ink
  },
  errorText: {
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.danger
  }
});
