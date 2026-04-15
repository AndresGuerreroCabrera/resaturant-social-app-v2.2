import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

import { theme } from "../theme";

interface ActionButtonProps {
  label: string;
  leadingIcon?: ReactNode;
  variant?: "primary" | "secondary" | "ghost";
  disabled?: boolean;
  onPress?: () => void;
}

export function ActionButton({
  label,
  leadingIcon,
  variant = "primary",
  disabled = false,
  onPress
}: ActionButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        variant === "primary" && styles.primary,
        variant === "secondary" && styles.secondary,
        variant === "ghost" && styles.ghost,
        pressed && styles.pressed,
        disabled && styles.disabled
      ]}
    >
      <View style={styles.content}>
        {leadingIcon}
        <Text
          style={[
            styles.label,
            variant === "secondary" && styles.secondaryLabel,
            variant === "ghost" && styles.ghostLabel
          ]}
        >
          {label}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: 52,
    borderRadius: theme.radius.md,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: theme.spacing.md
  },
  primary: {
    backgroundColor: theme.colors.primary
  },
  secondary: {
    backgroundColor: theme.colors.surfaceMuted,
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  ghost: {
    backgroundColor: "transparent",
    borderWidth: 1,
    borderColor: theme.colors.border
  },
  pressed: {
    opacity: 0.84
  },
  disabled: {
    opacity: 0.48
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.xs
  },
  label: {
    color: "#fffaf4",
    fontSize: 15,
    fontWeight: "700"
  },
  secondaryLabel: {
    color: theme.colors.ink
  },
  ghostLabel: {
    color: theme.colors.muted
  }
});
