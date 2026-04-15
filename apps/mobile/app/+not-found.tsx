import { router } from "expo-router";
import { StyleSheet, Text } from "react-native";

import { ActionButton } from "../src/app/ui/action-button";
import { Panel } from "../src/app/ui/panel";
import { Screen } from "../src/app/ui/screen";

export default function NotFoundScreen() {
  return (
    <Screen>
      <Panel>
        <Text style={styles.kicker}>Route not found</Text>
        <Text style={styles.title}>This screen has not been wired yet.</Text>
        <Text style={styles.body}>
          The mobile shell is ready, but this route is not part of the current
          migration scope.
        </Text>
        <ActionButton label="Go home" onPress={() => router.replace("/")} />
      </Panel>
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: {
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.2,
    textTransform: "uppercase",
    color: "#9b5837"
  },
  title: {
    marginTop: 12,
    fontSize: 28,
    fontWeight: "700",
    color: "#251d16"
  },
  body: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    color: "#6f655d"
  }
});
