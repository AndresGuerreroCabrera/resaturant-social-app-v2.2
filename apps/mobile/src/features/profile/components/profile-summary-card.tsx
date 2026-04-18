import { StyleSheet, Text, View } from "react-native";

import type {
  PrivateProfileDto,
  PublicProfileDto,
  PublicProfileStatsDto
} from "@savory/contracts";

import { theme } from "../../../app/theme";

interface ProfileSummaryCardProps {
  publicProfile: PublicProfileDto;
  publicStats: PublicProfileStatsDto;
  privateProfile?: PrivateProfileDto;
}

export function ProfileSummaryCard({
  publicProfile,
  publicStats,
  privateProfile
}: ProfileSummaryCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.displayName}>{publicProfile.displayName}</Text>
      <Text style={styles.handle}>@{publicProfile.handle}</Text>
      <Text style={styles.bio}>
        {publicProfile.bio ?? "This profile has not added a bio yet."}
      </Text>

      <View style={styles.statsRow}>
        <Stat label="Visited" value={String(publicStats.publicVisitedCount)} />
        <Stat
          label="Published"
          value={String(publicStats.publishedRecommendationCount)}
        />
        <Stat
          label="Accepted"
          value={String(publicStats.acceptedRecommendationCount)}
        />
      </View>

      <Text style={styles.meta}>
        Reputation: {publicStats.reputationScore} |{" "}
        {publicStats.expertiseLevelLabel ?? "Member"}
      </Text>

      {privateProfile ? (
        <Text style={styles.meta}>
          Onboarding:{" "}
          {privateProfile.onboardingCompletedAt
            ? `completed at ${privateProfile.onboardingCompletedAt}`
            : "pending"}
        </Text>
      ) : null}
    </View>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.radius.md,
    backgroundColor: "#fffcf8",
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm
  },
  displayName: {
    fontSize: 22,
    fontWeight: "700",
    color: theme.colors.ink
  },
  handle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.primary
  },
  bio: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.ink
  },
  statsRow: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  stat: {
    flex: 1,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    alignItems: "center",
    gap: 4
  },
  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.ink
  },
  statLabel: {
    fontSize: 12,
    textTransform: "uppercase",
    color: theme.colors.muted
  },
  meta: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.muted
  }
});
