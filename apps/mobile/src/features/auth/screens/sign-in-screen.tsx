import { router } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, TextInput, View } from "react-native";

import { theme } from "../../../app/theme";
import { ActionButton } from "../../../app/ui/action-button";
import { Panel } from "../../../app/ui/panel";
import { Screen } from "../../../app/ui/screen";
import { env } from "../../../config/env";
import { useAuthSession } from "../auth-session";

export function SignInScreen() {
  const { saveSession } = useAuthSession();
  const [accessToken, setAccessToken] = useState("");
  const [userId, setUserId] = useState("");

  async function handleStoreSession() {
    const trimmedToken = accessToken.trim();

    if (!trimmedToken) {
      return;
    }

    await saveSession({
      accessToken: trimmedToken,
      userId: userId.trim() || null,
      issuedAt: new Date().toISOString()
    });

    router.replace("/(app)/home");
  }

  return (
    <Screen>
      <Panel>
        <Text style={styles.kicker}>Savory mobile</Text>
        <Text style={styles.title}>Expo shell ready for the v2 backend.</Text>
        <Text style={styles.body}>
          This app is already wired around the official boundary `apps/api`.
          Real sign-in stays pending until the backend runtime, token exchange
          and transport are fully available.
        </Text>
      </Panel>

      <Panel>
        <Text style={styles.sectionTitle}>Current mobile mode</Text>
        <View style={styles.list}>
          <Text style={styles.listItem}>App env: {env.appEnv}</Text>
          <Text style={styles.listItem}>
            API base URL: {env.apiBaseUrl ?? "not configured"}
          </Text>
          <Text style={styles.listItem}>
            Stub session input: {env.enableStubSession ? "enabled" : "disabled"}
          </Text>
        </View>
      </Panel>

      <Panel>
        <Text style={styles.sectionTitle}>Development session bootstrap</Text>
        <Text style={styles.body}>
          This stores a bearer token locally so the authenticated client can be
          exercised once `apps/api` is reachable.
        </Text>
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          editable={env.enableStubSession}
          placeholder="Paste a bearer token"
          placeholderTextColor="#95897d"
          style={styles.input}
          value={accessToken}
          onChangeText={setAccessToken}
        />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          editable={env.enableStubSession}
          placeholder="Optional user id"
          placeholderTextColor="#95897d"
          style={styles.input}
          value={userId}
          onChangeText={setUserId}
        />
        <ActionButton
          disabled={!env.enableStubSession || accessToken.trim().length === 0}
          label={
            env.enableStubSession
              ? "Store local session"
              : "Backend auth pending"
          }
          onPress={handleStoreSession}
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
    letterSpacing: 1.4,
    color: theme.colors.primary
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: theme.colors.ink
  },
  list: {
    gap: 8
  },
  listItem: {
    fontSize: 14,
    color: theme.colors.ink
  },
  input: {
    minHeight: 52,
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: theme.radius.md,
    paddingHorizontal: theme.spacing.md,
    backgroundColor: "#fffcf8",
    fontSize: 15,
    color: theme.colors.ink
  }
});
