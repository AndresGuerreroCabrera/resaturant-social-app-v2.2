import type { ComponentProps } from "react";
import type { RecommendationFeedItemDto } from "@savory/contracts";
import Feather from "@expo/vector-icons/Feather";
import { StyleSheet, Text, View } from "react-native";

import { theme } from "../../../app/theme";
import { Panel } from "../../../app/ui/panel";
import { Screen } from "../../../app/ui/screen";
import { env } from "../../../config/env";
import { useAuthSession } from "../../auth/auth-session";
import { useRecommendationFeedQuery } from "../data/use-recommendation-feed-query";

export function HomeScreen() {
  const { session } = useAuthSession();
  const feedQuery = useRecommendationFeedQuery();

  return (
    <Screen>
      <Panel>
        <Text style={styles.kicker}>Savory v2 mobile</Text>
        <Text style={styles.title}>
          A clean shell around the future API boundary.
        </Text>
        <Text style={styles.body}>
          The mobile app already depends on shared contracts and an
          authenticated client. Real network flows remain gated behind
          `apps/api`.
        </Text>
      </Panel>

      <View style={styles.row}>
        <StatusPanel icon="smartphone" label="App env" value={env.appEnv} />
        <StatusPanel
          icon="shield"
          label="Session"
          value={session?.userId ?? "local only"}
        />
      </View>

      <Panel>
        <Text style={styles.sectionTitle}>Recommendation feed</Text>
        <Text style={styles.caption}>
          This query already runs through React Query. Until the API runtime is
          available, it serves contract-validated stub data.
        </Text>

        {feedQuery.isLoading ? (
          <Text style={styles.caption}>Loading stub feed...</Text>
        ) : null}

        {feedQuery.error ? (
          <Text style={styles.errorText}>{feedQuery.error.message}</Text>
        ) : null}

        {feedQuery.data?.items.map((item) => (
          <FeedCard item={item} key={item.recommendation.id} />
        ))}
      </Panel>
    </Screen>
  );
}

function StatusPanel({
  icon,
  label,
  value
}: {
  icon: ComponentProps<typeof Feather>["name"];
  label: string;
  value: string;
}) {
  return (
    <View style={styles.statusPanel}>
      <Feather color={theme.colors.primary} name={icon} size={18} />
      <Text style={styles.statusLabel}>{label}</Text>
      <Text style={styles.statusValue}>{value}</Text>
    </View>
  );
}

function FeedCard({ item }: { item: RecommendationFeedItemDto }) {
  return (
    <View style={styles.feedCard}>
      <View style={styles.feedHeader}>
        <Text style={styles.feedHandle}>@{item.author.handle}</Text>
        <Text style={styles.feedMeta}>
          {item.authorStats?.expertiseLevelLabel ?? "Member"}
        </Text>
      </View>
      <Text style={styles.feedPlace}>{item.place.name}</Text>
      <Text style={styles.feedNote}>{item.recommendation.snapshot.note}</Text>
      <View style={styles.feedFooter}>
        <Text style={styles.feedTag}>
          {item.recommendation.snapshot.tags.join(" / ")}
        </Text>
        <Text style={styles.feedReaction}>
          {item.viewerReaction ?? "pending"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.3,
    color: theme.colors.accent
  },
  title: {
    marginTop: 12,
    fontSize: 30,
    lineHeight: 36,
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
    gap: theme.spacing.md
  },
  statusPanel: {
    flex: 1,
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: 8
  },
  statusLabel: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    color: theme.colors.muted
  },
  statusValue: {
    fontSize: 15,
    fontWeight: "600",
    color: theme.colors.ink
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.ink
  },
  caption: {
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.muted
  },
  errorText: {
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.danger
  },
  feedCard: {
    borderRadius: theme.radius.md,
    backgroundColor: "#fffcf8",
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: 8
  },
  feedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center"
  },
  feedHandle: {
    fontSize: 14,
    fontWeight: "700",
    color: theme.colors.primary
  },
  feedMeta: {
    fontSize: 13,
    color: theme.colors.muted
  },
  feedPlace: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.ink
  },
  feedNote: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.ink
  },
  feedFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  feedTag: {
    flex: 1,
    fontSize: 13,
    color: theme.colors.muted
  },
  feedReaction: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.accent,
    textTransform: "uppercase"
  }
});
