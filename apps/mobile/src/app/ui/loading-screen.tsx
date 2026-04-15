import { ActivityIndicator, StyleSheet, Text, View } from "react-native";

import { theme } from "../theme";

interface LoadingScreenProps {
  label: string;
}

export function LoadingScreen({ label }: LoadingScreenProps) {
  return (
    <View style={styles.root}>
      <ActivityIndicator color={theme.colors.primary} size="large" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background,
    alignItems: "center",
    justifyContent: "center",
    padding: theme.spacing.lg
  },
  label: {
    marginTop: theme.spacing.md,
    fontSize: 15,
    color: theme.colors.muted,
    textAlign: "center"
  }
});
