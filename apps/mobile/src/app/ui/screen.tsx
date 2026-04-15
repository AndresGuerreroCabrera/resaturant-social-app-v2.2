import type { ReactNode } from "react";
import { ScrollView, StyleSheet, View } from "react-native";

import { theme } from "../theme";

interface ScreenProps {
  children: ReactNode;
}

export function Screen({ children }: ScreenProps) {
  return (
    <ScrollView
      style={styles.root}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.stack}>{children}</View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: theme.colors.background
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.xl
  },
  stack: {
    gap: theme.spacing.lg
  }
});
