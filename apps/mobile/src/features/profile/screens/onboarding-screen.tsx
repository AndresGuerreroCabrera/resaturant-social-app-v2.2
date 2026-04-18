import { router } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, TextInput } from "react-native";

import { isValidProfileHandle, normalizeProfileHandle } from "@savory/domain";

import { mapMobileBackendError } from "../../../api/backend/errors";
import { theme } from "../../../app/theme";
import { ActionButton } from "../../../app/ui/action-button";
import { LoadingScreen } from "../../../app/ui/loading-screen";
import { Panel } from "../../../app/ui/panel";
import { Screen } from "../../../app/ui/screen";
import { useAuthSession } from "../../auth/auth-session";
import { useCreateOrUpdateProfileMutation } from "../data/use-create-or-update-profile-mutation";
import { useMyProfileQuery } from "../data/use-my-profile-query";

export function OnboardingScreen() {
  const { clearSession } = useAuthSession();
  const profileQuery = useMyProfileQuery();
  const profileMutation = useCreateOrUpdateProfileMutation();
  const mappedError = profileQuery.error
    ? mapMobileBackendError(profileQuery.error)
    : profileMutation.error
      ? mapMobileBackendError(profileMutation.error)
      : null;
  const hasInitializedForm = useRef(false);
  const [displayName, setDisplayName] = useState("");
  const [handle, setHandle] = useState("");
  const [bio, setBio] = useState("");

  useEffect(() => {
    if (!profileQuery.data || hasInitializedForm.current) {
      return;
    }

    setDisplayName(profileQuery.data.publicProfile.displayName);
    setHandle(profileQuery.data.publicProfile.handle);
    setBio(profileQuery.data.publicProfile.bio ?? "");
    hasInitializedForm.current = true;
  }, [profileQuery.data]);

  if (profileQuery.isLoading && !profileQuery.data) {
    return <LoadingScreen label="Preparing your onboarding profile..." />;
  }

  const trimmedDisplayName = displayName.trim();
  const normalizedHandle = normalizeProfileHandle(handle);
  const trimmedBio = bio.trim();
  const handleLooksValid = isValidProfileHandle(normalizedHandle);
  const canSubmit =
    trimmedDisplayName.length > 0 &&
    normalizedHandle.length > 0 &&
    handleLooksValid &&
    !profileMutation.isPending;

  async function handleCompleteOnboarding() {
    if (!canSubmit) {
      return;
    }

    try {
      await profileMutation.mutateAsync({
        publicProfile: {
          displayName: trimmedDisplayName,
          handle: normalizedHandle,
          bio: trimmedBio || null
        },
        privateProfile: {
          onboardingCompletedAt: new Date().toISOString()
        }
      });

      router.replace("/(app)/profile");
    } catch {
      // The mutation error is rendered from React Query state below.
    }
  }

  async function handleResetSession() {
    await clearSession();
    router.replace("/(auth)/sign-in");
  }

  return (
    <Screen>
      <Panel>
        <Text style={styles.kicker}>Minimal onboarding</Text>
        <Text style={styles.title}>Finish your profile before entering v2.</Text>
        <Text style={styles.body}>
          This step stays inside the mobile data layer and uses a stubbed
          profile command until the real `apps/api` runtime is available.
        </Text>
      </Panel>

      <Panel>
        <Text style={styles.sectionTitle}>Public profile basics</Text>
        <TextInput
          autoCapitalize="words"
          autoCorrect={false}
          placeholder="Display name"
          placeholderTextColor="#95897d"
          style={styles.input}
          value={displayName}
          onChangeText={setDisplayName}
        />
        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Handle"
          placeholderTextColor="#95897d"
          style={styles.input}
          value={handle}
          onChangeText={setHandle}
        />
        {!handleLooksValid && normalizedHandle.length > 0 ? (
          <Text style={styles.warningText}>
            Handles may only contain lowercase letters, numbers, dots,
            underscores and hyphens.
          </Text>
        ) : null}
        <TextInput
          multiline
          placeholder="Short bio"
          placeholderTextColor="#95897d"
          style={[styles.input, styles.textArea]}
          textAlignVertical="top"
          value={bio}
          onChangeText={setBio}
        />
        {mappedError ? (
          <Text style={styles.errorText}>{mappedError.message}</Text>
        ) : null}
        <ActionButton
          disabled={!canSubmit}
          label={
            profileMutation.isPending ? "Saving profile..." : "Complete onboarding"
          }
          onPress={handleCompleteOnboarding}
        />
        <ActionButton
          label="Clear local session"
          onPress={handleResetSession}
          variant="ghost"
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
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
  },
  textArea: {
    minHeight: 120,
    paddingTop: theme.spacing.md
  },
  warningText: {
    fontSize: 13,
    lineHeight: 20,
    color: theme.colors.warning
  },
  errorText: {
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.danger
  }
});
