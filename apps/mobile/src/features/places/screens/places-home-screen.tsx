import { useDeferredValue, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View
} from "react-native";

import type {
  PlaceSearchResultDto,
  ResolvedPlaceResponse,
  UserPlaceEntryDto
} from "@savory/contracts";
import type { UserPlaceList, Visibility } from "@savory/domain";

import { mapMobileBackendError } from "../../../api/backend/errors";
import { theme } from "../../../app/theme";
import { ActionButton } from "../../../app/ui/action-button";
import { Panel } from "../../../app/ui/panel";
import { Screen } from "../../../app/ui/screen";
import { usePlaceSearchQuery } from "../data/use-place-search-query";
import { useMyUserPlaceEntriesQuery } from "../data/use-my-user-place-entries-query";
import { useResolvePlaceMutation } from "../data/use-resolve-place-mutation";
import { useSavePlaceToWishlistMutation } from "../data/use-save-place-to-wishlist-mutation";
import { useMarkPlaceVisitedMutation } from "../data/use-mark-place-visited-mutation";

export function PlacesHomeScreen() {
  const [searchInput, setSearchInput] = useState("");
  const [selectedPlace, setSelectedPlace] = useState<ResolvedPlaceResponse | null>(
    null
  );
  const [visitVisibility, setVisitVisibility] =
    useState<Visibility>("private");
  const [activityMessage, setActivityMessage] = useState<string | null>(null);
  const deferredSearchInput = useDeferredValue(searchInput);
  const normalizedSearchQuery = deferredSearchInput.trim();

  const searchQuery = usePlaceSearchQuery(normalizedSearchQuery);
  const wishlistQuery = useMyUserPlaceEntriesQuery("wishlist");
  const visitedQuery = useMyUserPlaceEntriesQuery("visited");
  const hiddenQuery = useMyUserPlaceEntriesQuery("hidden");

  const resolveMutation = useResolvePlaceMutation();
  const saveWishlistMutation = useSavePlaceToWishlistMutation();
  const markVisitedMutation = useMarkPlaceVisitedMutation();

  const combinedEntries = useMemo(() => {
    return [
      ...(wishlistQuery.data?.entries ?? []),
      ...(visitedQuery.data?.entries ?? []),
      ...(hiddenQuery.data?.entries ?? [])
    ];
  }, [hiddenQuery.data?.entries, visitedQuery.data?.entries, wishlistQuery.data?.entries]);

  const selectedEntry =
    selectedPlace == null
      ? null
      : combinedEntries.find((entry) => entry.placeId === selectedPlace.place.id) ??
        null;
  const combinedError =
    searchQuery.error ??
    wishlistQuery.error ??
    visitedQuery.error ??
    hiddenQuery.error ??
    resolveMutation.error ??
    saveWishlistMutation.error ??
    markVisitedMutation.error;
  const mappedError = combinedError ? mapMobileBackendError(combinedError) : null;
  const isMutationPending =
    resolveMutation.isPending ||
    saveWishlistMutation.isPending ||
    markVisitedMutation.isPending;
  const isEntriesLoading =
    wishlistQuery.isLoading || visitedQuery.isLoading || hiddenQuery.isLoading;

  async function handleResolveResult(result: PlaceSearchResultDto) {
    try {
      const resolved = await resolveMutation.mutateAsync({
        place:
          result.kind === "canonical"
            ? {
                kind: "canonical",
                placeId: result.place.id
              }
            : {
                kind: "external",
                externalPlace: result.externalPlace
              }
      });

      setSelectedPlace(resolved);
      setActivityMessage(describeResolution(resolved));
    } catch {
      // Mutation errors are rendered from React Query state.
    }
  }

  async function handleSaveWishlist() {
    if (!selectedPlace) {
      return;
    }

    try {
      const response = await saveWishlistMutation.mutateAsync({
        place: {
          kind: "canonical",
          placeId: selectedPlace.place.id
        }
      });

      setSelectedPlace({
        place: response.entry.place,
        resolution: response.placeResolution
      });
      setActivityMessage(describeWishlistAction(response.action));
    } catch {
      // Mutation errors are rendered from React Query state.
    }
  }

  async function handleMarkVisited(entryOverride?: UserPlaceEntryDto) {
    const entry = entryOverride ?? selectedEntry;

    if (!entry && !selectedPlace) {
      setActivityMessage("Resolve a place first or select one of your saved entries.");
      return;
    }

    try {
      const response = await markVisitedMutation.mutateAsync(
        entry
          ? {
              target: "entry",
              userPlaceEntryId: entry.id,
              visibility: visitVisibility
            }
          : {
              target: "place",
              place: {
                kind: "canonical",
                placeId: selectedPlace?.place.id ?? ""
              },
              visibility: visitVisibility
            }
      );

      setSelectedPlace({
        place: response.entry.place,
        resolution: response.placeResolution ?? selectedPlace?.resolution ?? "canonical_reused"
      });
      setActivityMessage(describeVisitedAction(response.action, visitVisibility));
    } catch {
      // Mutation errors are rendered from React Query state.
    }
  }

  function handleSelectEntry(entry: UserPlaceEntryDto) {
    setSelectedPlace({
      place: entry.place,
      resolution: "canonical_reused"
    });
    setVisitVisibility(entry.status === "visited" ? entry.visibility : "private");
    setActivityMessage(
      `Selected ${entry.place.name} from your ${entry.isHidden ? "hidden " : ""}${entry.status} list.`
    );
  }

  return (
    <Screen>
      <Panel>
        <Text style={styles.kicker}>Core place flow</Text>
        <Text style={styles.title}>
          Search, resolve and store your relationship with places.
        </Text>
        <Text style={styles.body}>
          This tab now covers the unified `UserPlaceEntry` flow on mobile
          without bypassing the backend boundary. Today it runs honestly on the
          stub adapter while `apps/api` still lacks HTTP runtime.
        </Text>
      </Panel>

      <Panel>
        <Text style={styles.sectionTitle}>Search places</Text>
        <Text style={styles.caption}>
          Search runs through the mobile data layer. Selecting a result resolves
          or creates the canonical place before personal list actions happen.
        </Text>
        <TextInput
          autoCapitalize="words"
          autoCorrect={false}
          placeholder="Search for a restaurant or cafe"
          placeholderTextColor="#95897d"
          style={styles.input}
          value={searchInput}
          onChangeText={setSearchInput}
        />

        {normalizedSearchQuery.length < 2 ? (
          <Text style={styles.caption}>
            Type at least 2 characters to search the stub catalog.
          </Text>
        ) : null}

        {searchQuery.isLoading ? (
          <View style={styles.inlineLoading}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.caption}>Searching canonical and external places...</Text>
          </View>
        ) : null}

        {normalizedSearchQuery.length >= 2 &&
        !searchQuery.isLoading &&
        searchQuery.data?.results.length === 0 ? (
          <Text style={styles.caption}>
            No matching places were found for this query.
          </Text>
        ) : null}

        {searchQuery.data?.results.map((result) => (
          <SearchResultCard
            key={
              result.kind === "canonical"
                ? result.place.id
                : result.externalPlace.providerPlaceId
            }
            result={result}
            isPending={resolveMutation.isPending}
            onResolve={handleResolveResult}
          />
        ))}
      </Panel>

      <Panel>
        <Text style={styles.sectionTitle}>Selected place</Text>
        {selectedPlace ? (
          <>
            <View style={styles.selectedCard}>
              <View style={styles.selectedHeader}>
                <Text style={styles.selectedName}>{selectedPlace.place.name}</Text>
                <Text style={styles.selectedBadge}>
                  {selectedPlace.resolution.replace(/_/g, " ")}
                </Text>
              </View>
              <Text style={styles.caption}>
                {selectedPlace.place.address.formattedAddress ?? "No address yet"}
              </Text>
              {selectedEntry ? (
                <EntryStatusBlock entry={selectedEntry} />
              ) : (
                <Text style={styles.caption}>
                  You do not have a personal entry for this place yet.
                </Text>
              )}
            </View>

            <View style={styles.visibilityRow}>
              <Text style={styles.visibilityLabel}>Visited visibility</Text>
              <View style={styles.visibilityButtons}>
                <VisibilityChip
                  label="Private"
                  selected={visitVisibility === "private"}
                  onPress={() => setVisitVisibility("private")}
                />
                <VisibilityChip
                  label="Public"
                  selected={visitVisibility === "public"}
                  onPress={() => setVisitVisibility("public")}
                />
              </View>
            </View>

            <ActionButton
              disabled={isMutationPending}
              label={
                saveWishlistMutation.isPending
                  ? "Saving..."
                  : "Save to wishlist"
              }
              onPress={() => {
                void handleSaveWishlist();
              }}
            />
            <ActionButton
              disabled={isMutationPending}
              label={
                markVisitedMutation.isPending
                  ? "Updating visited..."
                  : selectedEntry?.status === "wishlist"
                    ? "Promote to visited"
                    : "Mark visited"
              }
              onPress={() => {
                void handleMarkVisited();
              }}
              variant="secondary"
            />
            <ActionButton
              label="Clear selected place"
              onPress={() => {
                setSelectedPlace(null);
                setActivityMessage(null);
              }}
              variant="ghost"
            />
          </>
        ) : (
          <Text style={styles.caption}>
            Resolve a place from search results to act on wishlist or visited.
          </Text>
        )}

        {activityMessage ? (
          <Text style={styles.successText}>{activityMessage}</Text>
        ) : null}
        {mappedError ? <Text style={styles.errorText}>{mappedError.message}</Text> : null}
      </Panel>

      <Panel>
        <Text style={styles.sectionTitle}>My place states</Text>
        <Text style={styles.caption}>
          These sections come from `listMyUserPlaceEntries` and reflect the
          system lists derived from `UserPlaceEntry`.
        </Text>

        {isEntriesLoading ? (
          <View style={styles.inlineLoading}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text style={styles.caption}>Loading your personal place states...</Text>
          </View>
        ) : null}

        <UserPlaceListSection
          entries={wishlistQuery.data?.entries ?? []}
          emptyLabel="Your wishlist is still empty."
          list="wishlist"
          onMarkVisited={handleMarkVisited}
          onSelect={handleSelectEntry}
        />
        <UserPlaceListSection
          entries={visitedQuery.data?.entries ?? []}
          emptyLabel="You have not marked any visited place yet."
          list="visited"
          onMarkVisited={handleMarkVisited}
          onSelect={handleSelectEntry}
        />
        {(hiddenQuery.data?.entries?.length ?? 0) > 0 ? (
          <UserPlaceListSection
            entries={hiddenQuery.data?.entries ?? []}
            emptyLabel="No hidden entries."
            list="hidden"
            onMarkVisited={handleMarkVisited}
            onSelect={handleSelectEntry}
          />
        ) : null}
      </Panel>
    </Screen>
  );
}

function SearchResultCard({
  result,
  isPending,
  onResolve
}: {
  result: PlaceSearchResultDto;
  isPending: boolean;
  onResolve: (result: PlaceSearchResultDto) => Promise<void>;
}) {
  const title = result.kind === "canonical" ? result.place.name : result.externalPlace.name;
  const address =
    result.kind === "canonical"
      ? result.place.address.formattedAddress
      : result.externalPlace.address.formattedAddress;

  return (
    <View style={styles.resultCard}>
      <View style={styles.resultHeader}>
        <Text style={styles.resultTitle}>{title}</Text>
        <Text style={styles.resultKind}>{result.kind}</Text>
      </View>
      <Text style={styles.caption}>{address ?? "No formatted address"}</Text>
      <ActionButton
        disabled={isPending}
        label={isPending ? "Resolving..." : "Resolve place"}
        onPress={() => {
          void onResolve(result);
        }}
        variant="secondary"
      />
    </View>
  );
}

function UserPlaceListSection({
  list,
  entries,
  emptyLabel,
  onSelect,
  onMarkVisited
}: {
  list: UserPlaceList;
  entries: readonly UserPlaceEntryDto[];
  emptyLabel: string;
  onSelect: (entry: UserPlaceEntryDto) => void;
  onMarkVisited: (entry: UserPlaceEntryDto) => Promise<void>;
}) {
  return (
    <View style={styles.listSection}>
      <Text style={styles.listTitle}>
        {list.charAt(0).toUpperCase() + list.slice(1)} ({entries.length})
      </Text>
      {entries.length === 0 ? (
        <Text style={styles.caption}>{emptyLabel}</Text>
      ) : (
        entries.map((entry) => (
          <UserPlaceEntryCard
            entry={entry}
            key={entry.id}
            onMarkVisited={onMarkVisited}
            onSelect={onSelect}
          />
        ))
      )}
    </View>
  );
}

function UserPlaceEntryCard({
  entry,
  onSelect,
  onMarkVisited
}: {
  entry: UserPlaceEntryDto;
  onSelect: (entry: UserPlaceEntryDto) => void;
  onMarkVisited: (entry: UserPlaceEntryDto) => Promise<void>;
}) {
  return (
    <View style={styles.entryCard}>
      <View style={styles.entryHeader}>
        <Text style={styles.entryPlace}>{entry.place.name}</Text>
        <Text style={styles.entryMeta}>
          {entry.status}
          {entry.status === "visited" ? ` | ${entry.visibility}` : ""}
          {entry.isHidden ? " | hidden" : ""}
        </Text>
      </View>
      <Text style={styles.caption}>
        {entry.place.address.formattedAddress ?? "No address"}
      </Text>
      {entry.note ? <Text style={styles.entryNote}>{entry.note}</Text> : null}
      <View style={styles.entryActions}>
        <ActionButton
          label="Select"
          onPress={() => onSelect(entry)}
          variant="secondary"
        />
        {entry.status === "wishlist" ? (
          <ActionButton
            label="Mark visited"
            onPress={() => {
              void onMarkVisited(entry);
            }}
            variant="ghost"
          />
        ) : null}
      </View>
    </View>
  );
}

function VisibilityChip({
  label,
  selected,
  onPress
}: {
  label: string;
  selected: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.visibilityChip, selected && styles.visibilityChipSelected]}
    >
      <Text
        style={[
          styles.visibilityChipLabel,
          selected && styles.visibilityChipLabelSelected
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function EntryStatusBlock({ entry }: { entry: UserPlaceEntryDto }) {
  return (
    <View style={styles.statusBlock}>
      <Text style={styles.statusTitle}>Current personal state</Text>
      <Text style={styles.caption}>
        Status: {entry.status}
        {entry.status === "visited" ? ` | visibility: ${entry.visibility}` : ""}
        {entry.isHidden ? " | hidden from default lists" : ""}
      </Text>
      {entry.tags.length > 0 ? (
        <Text style={styles.caption}>Tags: {entry.tags.join(", ")}</Text>
      ) : null}
      {entry.note ? <Text style={styles.entryNote}>{entry.note}</Text> : null}
    </View>
  );
}

function describeResolution(resolved: ResolvedPlaceResponse) {
  if (resolved.resolution === "created") {
    return `${resolved.place.name} was created as a new canonical place.`;
  }

  if (resolved.resolution === "provider_reused") {
    return `${resolved.place.name} reused an existing canonical place from provider data.`;
  }

  return `${resolved.place.name} was already canonical and ready to use.`;
}

function describeWishlistAction(action: string) {
  if (action === "created_wishlist") {
    return "The place was added to your wishlist.";
  }

  if (action === "updated_wishlist") {
    return "Your wishlist entry was refreshed.";
  }

  return "You already had this place marked as visited, so no wishlist downgrade happened.";
}

function describeVisitedAction(action: string, visibility: Visibility) {
  if (action === "created_visited") {
    return `A visited entry was created with ${visibility} visibility.`;
  }

  if (action === "promoted_from_wishlist") {
    return `Your wishlist entry was promoted to visited with ${visibility} visibility.`;
  }

  return `Your visited entry was updated with ${visibility} visibility.`;
}

const styles = StyleSheet.create({
  kicker: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    color: theme.colors.primary
  },
  title: {
    marginTop: 12,
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700",
    color: theme.colors.ink
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.ink
  },
  body: {
    fontSize: 15,
    lineHeight: 22,
    color: theme.colors.muted
  },
  caption: {
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.muted
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
  inlineLoading: {
    flexDirection: "row",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  resultCard: {
    borderRadius: theme.radius.md,
    backgroundColor: "#fffcf8",
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm
  },
  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  resultTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.ink
  },
  resultKind: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    color: theme.colors.accent
  },
  selectedCard: {
    borderRadius: theme.radius.md,
    backgroundColor: "#fffcf8",
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm
  },
  selectedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  selectedName: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    color: theme.colors.ink
  },
  selectedBadge: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    color: theme.colors.primary
  },
  visibilityRow: {
    gap: theme.spacing.xs
  },
  visibilityLabel: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    color: theme.colors.muted
  },
  visibilityButtons: {
    flexDirection: "row",
    gap: theme.spacing.sm
  },
  visibilityChip: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: theme.radius.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.surfaceMuted
  },
  visibilityChipSelected: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary
  },
  visibilityChipLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: theme.colors.ink
  },
  visibilityChipLabelSelected: {
    color: "#fffaf4"
  },
  statusBlock: {
    gap: 6
  },
  statusTitle: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    color: theme.colors.muted
  },
  successText: {
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.accent
  },
  errorText: {
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.danger
  },
  listSection: {
    gap: theme.spacing.sm
  },
  listTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.ink
  },
  entryCard: {
    borderRadius: theme.radius.md,
    backgroundColor: "#fffcf8",
    borderWidth: 1,
    borderColor: theme.colors.border,
    padding: theme.spacing.md,
    gap: theme.spacing.sm
  },
  entryHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: theme.spacing.sm
  },
  entryPlace: {
    flex: 1,
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.ink
  },
  entryMeta: {
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    color: theme.colors.primary
  },
  entryNote: {
    fontSize: 14,
    lineHeight: 21,
    color: theme.colors.ink
  },
  entryActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: theme.spacing.sm
  }
});
