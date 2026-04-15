import type { ReactNode } from "react";
import { StyleSheet, View, type ViewStyle } from "react-native";

import { theme } from "../theme";

interface PanelProps {
  children: ReactNode;
  style?: ViewStyle;
}

export function Panel({ children, style }: PanelProps) {
  return <View style={[styles.panel, style]}>{children}</View>;
}

const styles = StyleSheet.create({
  panel: {
    borderRadius: theme.radius.lg,
    backgroundColor: theme.colors.surface,
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.lg,
    gap: theme.spacing.sm,
    shadowColor: "#2b1e14",
    shadowOpacity: 0.06,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 3
  }
});
