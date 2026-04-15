import {
  RECOMMENDATION_CYCLE_TIMEZONE,
  RECOMMENDATION_WEEKLY_LIMIT
} from "@savory/domain";
import { StyleSheet, Text, View } from "react-native";

import { theme } from "../../../app/theme";
import { Panel } from "../../../app/ui/panel";
import { Screen } from "../../../app/ui/screen";

export function RecommendationsScreen() {
  return (
    <Screen>
      <Panel>
        <Text style={styles.kicker}>Social core</Text>
        <Text style={styles.title}>
          Recommendation rules are fixed before UI flows.
        </Text>
        <Text style={styles.body}>
          This mobile scaffold does not re-implement business logic. It only
          reflects the constraints that already live in the domain and backend
          planning.
        </Text>
      </Panel>

      <Panel>
        <Text style={styles.sectionTitle}>Rules already closed</Text>
        <View style={styles.ruleList}>
          <RuleItem
            label={`Maximum ${RECOMMENDATION_WEEKLY_LIMIT} posts per user and ISO week`}
          />
          <RuleItem
            label={`Cycle timezone fixed to ${RECOMMENDATION_CYCLE_TIMEZONE}`}
          />
          <RuleItem label="A recommendation can only be published from a public visited entry" />
          <RuleItem label="Reactions come from another authenticated user, never from the author" />
          <RuleItem label="Reputation comes from events and summaries, not client counters" />
        </View>
      </Panel>

      <Panel>
        <Text style={styles.sectionTitle}>What stays pending</Text>
        <Text style={styles.body}>
          The real publish and react flows will land only after `apps/api`
          exposes authenticated endpoints and query surfaces. Until then, this
          tab is intentionally descriptive rather than interactive.
        </Text>
      </Panel>
    </Screen>
  );
}

function RuleItem({ label }: { label: string }) {
  return (
    <View style={styles.ruleItem}>
      <View style={styles.ruleDot} />
      <Text style={styles.ruleText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  kicker: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: theme.colors.accent
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
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.ink
  },
  ruleList: {
    gap: 12
  },
  ruleItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12
  },
  ruleDot: {
    width: 10,
    height: 10,
    marginTop: 6,
    borderRadius: 999,
    backgroundColor: theme.colors.primary
  },
  ruleText: {
    flex: 1,
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.ink
  }
});
