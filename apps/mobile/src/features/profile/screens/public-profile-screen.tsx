import { useLocalSearchParams } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { mapMobileBackendError } from "../../../api/backend/errors";
import { theme } from "../../../app/theme";
import { Panel } from "../../../app/ui/panel";
import { Screen } from "../../../app/ui/screen";
import { ProfileSummaryCard } from "../components/profile-summary-card";
import { usePublicProfileQuery } from "../data/use-public-profile-query";

export function PublicProfileScreen() {
  const params = useLocalSearchParams<{ userId?: string | string[] }>();
  const profileUserId =
    typeof params.userId === "string" ? params.userId : params.userId?.[0] ?? null;
  const profileQuery = usePublicProfileQuery(profileUserId, {
    enabled: Boolean(profileUserId)
  });
  const mappedError = profileQuery.error
    ? mapMobileBackendError(profileQuery.error)
    : null;

  return (
    <Screen>
      <Panel>
        <Text style={styles.kicker}>Public profile</Text>
        <Text style={styles.title}>This surface only reads public data.</Text>
        <Text style={styles.body}>
          It uses the shared mobile data layer and the public profile query,
          never the private owner snapshot.
        </Text>
      </Panel>

      <Panel>
        {profileQuery.isLoading ? (
          <Text style={styles.body}>Loading public profile...</Text>
        ) : null}
        {!profileUserId ? (
          <Text style={styles.errorText}>Missing public profile user id.</Text>
        ) : null}
        {mappedError ? (
          <Text style={styles.errorText}>{mappedError.message}</Text>
        ) : null}
        {profileQuery.data ? (
          <ProfileSummaryCard
            publicProfile={profileQuery.data.publicProfile}
            publicStats={profileQuery.data.publicStats}
          />
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
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.muted
  },
  errorText: {
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.danger
  }
});
