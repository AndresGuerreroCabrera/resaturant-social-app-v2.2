import { StyleSheet, Text } from "react-native";

import { theme } from "../../../app/theme";
import { ActionButton } from "../../../app/ui/action-button";
import { Panel } from "../../../app/ui/panel";
import { Screen } from "../../../app/ui/screen";

interface AccessGateErrorScreenProps {
  message: string;
  onRetry: () => void;
  onClearSession: () => Promise<void>;
}

export function AccessGateErrorScreen({
  message,
  onRetry,
  onClearSession
}: AccessGateErrorScreenProps) {
  return (
    <Screen>
      <Panel>
        <Text style={styles.kicker}>Mobile bootstrap blocked</Text>
        <Text style={styles.title}>The app could not restore your profile.</Text>
        <Text style={styles.body}>
          The local session was restored, but the profile bootstrap failed before
          the authenticated shell could decide whether onboarding is complete.
        </Text>
        <Text style={styles.errorText}>{message}</Text>
        <ActionButton label="Retry profile bootstrap" onPress={onRetry} />
        <ActionButton
          label="Clear local session"
          onPress={onClearSession}
          variant="secondary"
        />
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
    color: theme.colors.warning
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
