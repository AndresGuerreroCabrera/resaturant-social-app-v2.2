(() => {
  const SUPABASE_URL = "https://sfjkcerlssdplvipftrs.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_63VVT-aCIe0Vmvkkj1_Jbg_7Iz9rHSu";
  const SUPABASE_JS_MODULE = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
  const STORAGE_KEYS = {
    guestRecommendationActions: "savory_guest_recommendation_actions"
  };

  const EXPERTISE_BASE_RATING = 1000;
  const EXPERTISE_LEVELS = [
    { level: 1, label: "Basico", minRating: 1000 },
    { level: 2, label: "Curioso", minRating: 1120 },
    { level: 3, label: "Foodie", minRating: 1260 },
    { level: 4, label: "Gourmet", minRating: 1420 },
    { level: 5, label: "Maestro", minRating: 1600 }
  ];

  const state = {
    client: null,
    initPromise: null,
    session: null,
    currentUser: null,
    restaurants: [],
    desiredRestaurants: [],
    recommendations: [],
    recommendationActions: [],
    profileCache: new Map(),
    friendsCache: new Map(),
    publicRestaurantsCache: new Map(),
    status: "idle",
    lastError: null
  };

  function clone(data) {
    return JSON.parse(JSON.stringify(data));
  }

  function delay(milliseconds) {
    return new Promise((resolve) => {
      window.setTimeout(resolve, milliseconds);
    });
  }

  function emitChange() {
    window.dispatchEvent(new CustomEvent("savory:db-change"));
  }

  function emitReady() {
    window.dispatchEvent(new CustomEvent("savory:db-ready"));
  }

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  }

  function normalizeUsernameKey(value) {
    return normalizeText(value)
      .replace(/[^a-z0-9_-]+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "");
  }

  function deriveAuthEmail(usernameNormalized) {
    return `${usernameNormalized}@savory.local`;
  }

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function isValidEmail(value) {
    const normalized = normalizeEmail(value);
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized);
  }

  function normalizeHashtag(value) {
    const cleanValue = normalizeText(value)
      .replace(/^#*/, "")
      .replace(/[^a-z0-9_-]+/g, "")
      .replace(/\s+/g, "");

    if (!cleanValue) {
      return "";
    }

    return `#${cleanValue}`;
  }

  function normalizePrice(value) {
    if (value === "\u20ac\u20ac" || value === "\u20ac\u20ac\u20ac") {
      return value;
    }

    if (value === "") {
      return "";
    }

    return "\u20ac";
  }

  function normalizeRating(value) {
    const numericValue = Math.round(Number(value));
    return Number.isFinite(numericValue) && numericValue >= 1 && numericValue <= 5
      ? numericValue
      : null;
  }

  function normalizeComment(value) {
    return String(value || "").replace(/\r\n/g, "\n").trim().slice(0, 280);
  }

  function normalizeAvatar(value) {
    return ["chef", "pizza", "burger", "candy", "taco"].includes(value) ? value : "chef";
  }

  function normalizeLocation(value) {
    const lat = Number(value?.lat);
    const lng = Number(value?.lng);

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    return { lat, lng };
  }

  function normalizeCount(value) {
    const numericValue = Math.round(Number(value));
    return Number.isFinite(numericValue) && numericValue >= 0 ? numericValue : 0;
  }

  function normalizeExpertiseRating(value) {
    const numericValue = Math.round(Number(value));
    return Number.isFinite(numericValue) && numericValue >= EXPERTISE_BASE_RATING
      ? numericValue
      : EXPERTISE_BASE_RATING;
  }

  function getExpertiseLevelFromRating(rating) {
    const normalizedRating = normalizeExpertiseRating(rating);

    return [...EXPERTISE_LEVELS]
      .reverse()
      .find((level) => normalizedRating >= level.minRating) || EXPERTISE_LEVELS[0];
  }

  function normalizeGuestActions(actions) {
    if (!Array.isArray(actions)) {
      return [];
    }

    return actions
      .map((action) => ({
        recommendationId: Number(action?.recommendationId),
        action: action?.action === "accepted" ? "accepted" : "rejected",
        createdAt: Number(action?.createdAt) || Date.now()
      }))
      .filter((action) => Number.isFinite(action.recommendationId));
  }

  function readGuestRecommendationActions() {
    try {
      const rawValue = window.localStorage.getItem(STORAGE_KEYS.guestRecommendationActions);
      return normalizeGuestActions(rawValue ? JSON.parse(rawValue) : []);
    } catch {
      return [];
    }
  }

  function writeGuestRecommendationActions(actions) {
    window.localStorage.setItem(
      STORAGE_KEYS.guestRecommendationActions,
      JSON.stringify(normalizeGuestActions(actions))
    );
  }

  function addGuestRecommendationAction(recommendationId, action) {
    const normalizedId = Number(recommendationId);

    if (!Number.isFinite(normalizedId)) {
      return;
    }

    const nextActions = [
      {
        recommendationId: normalizedId,
        action: action === "accepted" ? "accepted" : "rejected",
        createdAt: Date.now()
      },
      ...readGuestRecommendationActions().filter(
        (item) => Number(item.recommendationId) !== normalizedId
      )
    ];

    writeGuestRecommendationActions(nextActions);
  }

  function cacheProfile(profile) {
    if (!profile?.id) {
      return;
    }

    state.profileCache.set(String(profile.id), clone(profile));
  }

  function cacheFriends(userId, friends) {
    if (!userId) {
      return;
    }

    state.friendsCache.set(String(userId), clone(friends));
  }

  function cachePublicRestaurants(userId, restaurants) {
    if (!userId) {
      return;
    }

    state.publicRestaurantsCache.set(String(userId), clone(restaurants));
  }

  function normalizeProfileRow(row) {
    if (!row) {
      return null;
    }

    const profile = {
      id: row.id,
      username: String(row.username || "Invitado"),
      usernameNormalized: String(row.username_normalized || normalizeUsernameKey(row.username || "")),
      authEmail: String(row.auth_email || ""),
      avatar: normalizeAvatar(row.avatar),
      expertiseRating: normalizeExpertiseRating(row.expertise_rating),
      acceptedRecommendationCount: normalizeCount(row.accepted_recommendation_count),
      createdAt: row.created_at || null
    };

    cacheProfile(profile);
    return profile;
  }

  function normalizeRestaurantRow(row) {
    if (!row) {
      return null;
    }

    return {
      id: Number(row.id),
      userId: row.user_id,
      name: String(row.name || "").trim(),
      visibility: row.visibility === "publico" ? "publico" : "privado",
      price: row.price ? normalizePrice(row.price) : "",
      rating: normalizeRating(row.rating),
      comment: normalizeComment(row.comment),
      hashtags: Array.isArray(row.hashtags)
        ? [...new Set(row.hashtags.map(normalizeHashtag).filter(Boolean))]
        : [],
      placeId: String(row.place_id || ""),
      address: String(row.address || ""),
      location: normalizeLocation(row.location),
      source: String(row.source || "manual"),
      createdAt: row.created_at || null
    };
  }

  function normalizeRecommendationRow(row) {
    if (!row) {
      return null;
    }

    const owner = normalizeProfileRow(row.owner);

    return {
      id: Number(row.id),
      restaurantId: row.original_restaurant_id ? Number(row.original_restaurant_id) : null,
      restaurantName: String(row.restaurant_name || ""),
      placeId: String(row.place_id || ""),
      address: String(row.address || ""),
      location: normalizeLocation(row.location),
      price: normalizePrice(row.price),
      rating: normalizeRating(row.rating),
      comment: normalizeComment(row.comment),
      hashtags: Array.isArray(row.hashtags)
        ? [...new Set(row.hashtags.map(normalizeHashtag).filter(Boolean))]
        : [],
      ownerUserId: row.owner_user_id,
      ownerUsername: owner?.username || "Usuario",
      ownerAvatar: owner?.avatar || "chef",
      visibility: row.visibility === "publico" ? "publico" : "privado",
      createdAt: row.created_at || null
    };
  }

  function normalizeRecommendationActionRow(row) {
    if (!row) {
      return null;
    }

    return {
      id: Number(row.id),
      recommendationId: Number(row.recommendation_id),
      action: row.action === "accepted" ? "accepted" : "rejected",
      createdAt: row.created_at || null
    };
  }

  function getClient() {
    if (!state.client) {
      throw new Error("Supabase client not initialized yet.");
    }

    return state.client;
  }

  async function ensureReady() {
    if (!state.initPromise) {
      initialize();
    }

    return state.initPromise;
  }

  function buildCurrentUserComposite(profile) {
    if (!profile) {
      return null;
    }

    return {
      ...clone(profile),
      restaurants: clone(state.restaurants),
      desiredRestaurants: clone(state.desiredRestaurants),
      recommendationActions: clone(state.recommendationActions)
    };
  }

  function syncCurrentUserCache(profileOverride) {
    const profile = profileOverride || state.currentUser;

    if (!profile) {
      state.currentUser = null;
      return;
    }

    state.currentUser = buildCurrentUserComposite(profile);
    cacheProfile(state.currentUser);
  }

  function isSetupError(error) {
    const message = String(error?.message || "").toLowerCase();
    return (
      message.includes("does not exist") ||
      message.includes("relation") ||
      message.includes("schema cache") ||
      message.includes("column") ||
      message.includes("permission denied")
    );
  }

  function getSetupStatus(error) {
    return isSetupError(error) ? "setup-required" : "error";
  }

  function getSupabaseErrorMessage(error) {
    return String(error?.message || error?.error_description || "").trim();
  }

  function classifySignUpError(error) {
    const message = getSupabaseErrorMessage(error).toLowerCase();

    if (!message) {
      return "error";
    }

    if (message.includes("already registered")) {
      return "exists";
    }

    if (
      message.includes("password should be at least") ||
      message.includes("password is too weak") ||
      message.includes("weak password")
    ) {
      return "weak-password";
    }

    if (
      message.includes("error sending confirmation email") ||
      message.includes("email not confirmed") ||
      message.includes("confirm email")
    ) {
      return "confirmation-required";
    }

    if (
      message.includes("database error saving new user") ||
      message.includes("saving new user") ||
      message.includes("database error")
    ) {
      return "setup-required";
    }

    if (
      message.includes("signups not allowed") ||
      message.includes("signup is disabled") ||
      message.includes("signup disabled")
    ) {
      return "signup-disabled";
    }

    return "error";
  }

  function matchesRestaurant(existingRestaurant, candidateRestaurant) {
    if (!existingRestaurant || !candidateRestaurant) {
      return false;
    }

    if (
      existingRestaurant.placeId &&
      candidateRestaurant.placeId &&
      existingRestaurant.placeId === candidateRestaurant.placeId
    ) {
      return true;
    }

    return normalizeText(existingRestaurant.name) === normalizeText(candidateRestaurant.name);
  }

  async function importSupabaseClient() {
    const importedModule = await import(SUPABASE_JS_MODULE);
    return importedModule.createClient;
  }

  async function fetchProfileById(userId) {
    if (!userId) {
      return null;
    }

    const cachedProfile = state.profileCache.get(String(userId));

    if (cachedProfile) {
      return clone(cachedProfile);
    }

    const { data, error } = await getClient()
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return normalizeProfileRow(data);
  }

  async function waitForProfile(userId, attempts = 8) {
    for (let index = 0; index < attempts; index += 1) {
      const profile = await fetchProfileById(userId);

      if (profile) {
        return profile;
      }

      await delay(150);
    }

    return null;
  }

  async function ensureCurrentProfile(authUser) {
    if (!authUser?.id) {
      state.currentUser = null;
      return null;
    }

    let profile = await waitForProfile(authUser.id, 6);

    if (!profile) {
      const username = String(authUser.user_metadata?.username || authUser.email || "Usuario").trim();
      const usernameNormalized = normalizeUsernameKey(
        authUser.user_metadata?.username_normalized || username
      );
      const avatar = normalizeAvatar(authUser.user_metadata?.avatar);
      const authEmail = String(authUser.email || deriveAuthEmail(usernameNormalized));
      const { data, error } = await getClient()
        .from("profiles")
        .upsert(
          {
            id: authUser.id,
            username,
            username_normalized: usernameNormalized,
            auth_email: authEmail,
            avatar
          },
          {
            onConflict: "id"
          }
        )
        .select()
        .single();

      if (error) {
        throw error;
      }

      profile = normalizeProfileRow(data);
    }

    syncCurrentUserCache(profile);
    return profile;
  }

  async function loadRestaurantsForCurrentUser(userId) {
    if (!userId) {
      state.restaurants = [];
      syncCurrentUserCache();
      return [];
    }

    const { data, error } = await getClient()
      .from("restaurants")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    state.restaurants = (data || []).map(normalizeRestaurantRow).filter(Boolean);
    syncCurrentUserCache();
    return clone(state.restaurants);
  }

  async function loadDesiredRestaurantsForCurrentUser(userId) {
    if (!userId) {
      state.desiredRestaurants = [];
      syncCurrentUserCache();
      return [];
    }

    const { data, error } = await getClient()
      .from("desired_restaurants")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    state.desiredRestaurants = (data || []).map(normalizeRestaurantRow).filter(Boolean);
    syncCurrentUserCache();
    return clone(state.desiredRestaurants);
  }

  async function loadRecommendationActionsForCurrentUser(userId) {
    if (!userId) {
      state.recommendationActions = readGuestRecommendationActions();
      syncCurrentUserCache();
      return clone(state.recommendationActions);
    }

    const { data, error } = await getClient()
      .from("recommendation_actions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    state.recommendationActions = (data || [])
      .map(normalizeRecommendationActionRow)
      .filter(Boolean);
    syncCurrentUserCache();
    return clone(state.recommendationActions);
  }

  async function loadRecommendations() {
    const { data, error } = await getClient()
      .from("recommendations")
      .select(`
        id,
        original_restaurant_id,
        owner_user_id,
        restaurant_name,
        place_id,
        address,
        location,
        price,
        rating,
        comment,
        hashtags,
        visibility,
        created_at,
        owner:profiles!recommendations_owner_user_id_fkey (
          id,
          username,
          username_normalized,
          auth_email,
          avatar,
          expertise_rating,
          accepted_recommendation_count,
          created_at
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      throw error;
    }

    state.recommendations = (data || [])
      .map(normalizeRecommendationRow)
      .filter(Boolean);
    return clone(state.recommendations);
  }

  async function refreshState(sessionOverride = undefined) {
    const session = sessionOverride !== undefined
      ? sessionOverride
      : (await getClient().auth.getSession()).data.session;

    state.session = session || null;
    state.lastError = null;

    try {
      await loadRecommendations();

      if (session?.user?.id) {
        await ensureCurrentProfile(session.user);
        await Promise.all([
          loadRestaurantsForCurrentUser(session.user.id),
          loadDesiredRestaurantsForCurrentUser(session.user.id),
          loadRecommendationActionsForCurrentUser(session.user.id)
        ]);
      } else {
        state.currentUser = null;
        state.restaurants = [];
        state.desiredRestaurants = [];
        state.recommendationActions = readGuestRecommendationActions();
      }

      state.status = "ready";
    } catch (error) {
      state.lastError = error;
      state.status = "error";
      console.error("Supabase sync failed:", error);
    }

    emitChange();
  }

  function initialize() {
    if (state.initPromise) {
      return state.initPromise;
    }

    state.status = "loading";
    state.initPromise = (async () => {
      const createClient = await importSupabaseClient();
      state.client = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });

      const {
        data: { session }
      } = await state.client.auth.getSession();

      await refreshState(session);

      state.client.auth.onAuthStateChange((_event, nextSession) => {
        window.setTimeout(() => {
          refreshState(nextSession);
        }, 0);
      });

      emitReady();
      return window.SAVORY_DB;
    })().catch((error) => {
      state.status = "error";
      state.lastError = error;
      console.error("Supabase initialization failed:", error);
      emitReady();
      return window.SAVORY_DB;
    });

    return state.initPromise;
  }

  function getCurrentUser() {
    return state.currentUser ? clone(state.currentUser) : null;
  }

  function getRestaurants() {
    return clone(state.restaurants);
  }

  function getDesiredRestaurants() {
    return clone(state.desiredRestaurants);
  }

  function getRecommendations() {
    return clone(state.recommendations);
  }

  function getRecommendationActions() {
    return clone(state.recommendationActions);
  }

  function getVisibleRecommendations() {
    const currentUser = state.currentUser;
    const hiddenRecommendationIds = new Set(
      state.recommendationActions.map((action) => Number(action.recommendationId))
    );

    return state.recommendations.filter((recommendation) => {
      if (hiddenRecommendationIds.has(Number(recommendation.id))) {
        return false;
      }

      if (currentUser && String(recommendation.ownerUserId) === String(currentUser.id)) {
        return false;
      }

      return true;
    }).map(clone);
  }

  function getCurrentWeekRecommendationCount(userId) {
    const currentDate = new Date();
    const currentDay = currentDate.getDay();
    const diffToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    const startOfWeek = new Date(currentDate);
    startOfWeek.setHours(0, 0, 0, 0);
    startOfWeek.setDate(currentDate.getDate() + diffToMonday);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 7);

    return state.recommendations.filter((recommendation) => {
      if (String(recommendation.ownerUserId) !== String(userId)) {
        return false;
      }

      const recommendationDate = new Date(recommendation.createdAt || 0);
      return recommendationDate >= startOfWeek && recommendationDate < endOfWeek;
    }).length;
  }

  function isRestaurantPublishedByCurrentUser(restaurantId) {
    const currentUser = state.currentUser;

    if (!currentUser) {
      return false;
    }

    return state.recommendations.some(
      (recommendation) =>
        String(recommendation.ownerUserId) === String(currentUser.id) &&
        Number(recommendation.restaurantId) === Number(restaurantId)
    );
  }

  async function getUserById(userId) {
    await ensureReady();

    if (!userId) {
      return null;
    }

    if (state.currentUser && String(state.currentUser.id) === String(userId)) {
      return clone(state.currentUser);
    }

    return fetchProfileById(userId);
  }

  async function getUserRestaurants(userId, options = {}) {
    await ensureReady();

    if (!userId) {
      return [];
    }

    const isOwnProfile = state.currentUser && String(state.currentUser.id) === String(userId);

    if (isOwnProfile) {
      return clone(
        options.limit ? state.restaurants.slice(0, options.limit) : state.restaurants
      );
    }

    if (!options.publicOnly && state.publicRestaurantsCache.has(String(userId))) {
      const cachedRestaurants = state.publicRestaurantsCache.get(String(userId));
      return clone(options.limit ? cachedRestaurants.slice(0, options.limit) : cachedRestaurants);
    }

    let query = getClient()
      .from("restaurants")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (options.publicOnly !== false) {
      query = query.eq("visibility", "publico");
    }

    if (options.limit) {
      query = query.limit(options.limit);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const restaurants = (data || []).map(normalizeRestaurantRow).filter(Boolean);
    cachePublicRestaurants(userId, restaurants);
    return clone(restaurants);
  }

  async function getUserFriends(userId) {
    await ensureReady();

    if (!userId) {
      return [];
    }

    if (state.friendsCache.has(String(userId))) {
      return clone(state.friendsCache.get(String(userId)));
    }

    const { data, error } = await getClient()
      .from("friendships")
      .select(`
        friend_user_id,
        friend:profiles!friendships_friend_user_id_fkey (
          id,
          username,
          username_normalized,
          auth_email,
          avatar,
          expertise_rating,
          accepted_recommendation_count,
          created_at
        )
      `)
      .eq("user_id", userId);

    if (error) {
      throw error;
    }

    const friends = (data || [])
      .map((item) => normalizeProfileRow(item.friend))
      .filter(Boolean);
    cacheFriends(userId, friends);
    return clone(friends);
  }

  function areUsersFriends(leftUserId, rightUserId) {
    const friends = state.friendsCache.get(String(leftUserId)) || [];
    return friends.some((friend) => String(friend.id) === String(rightUserId));
  }

  async function searchUsersByUsername(query, options = {}) {
    await ensureReady();

    const normalizedQuery = normalizeUsernameKey(query);
    const excludedUserId = options?.excludeUserId;
    const limit = Math.max(1, Number(options?.limit) || 8);

    if (!normalizedQuery) {
      return [];
    }

    const { data, error } = await getClient()
      .from("profiles")
      .select("*")
      .ilike("username_normalized", `%${normalizedQuery}%`)
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data || [])
      .map(normalizeProfileRow)
      .filter(Boolean)
      .filter((profile) => String(profile.id) !== String(excludedUserId))
      .sort((leftProfile, rightProfile) => {
        const leftName = leftProfile.usernameNormalized;
        const rightName = rightProfile.usernameNormalized;
        const leftScore = leftName === normalizedQuery ? 0 : leftName.startsWith(normalizedQuery) ? 1 : 2;
        const rightScore = rightName === normalizedQuery ? 0 : rightName.startsWith(normalizedQuery) ? 1 : 2;

        if (leftScore !== rightScore) {
          return leftScore - rightScore;
        }

        return leftName.localeCompare(rightName);
      })
      .slice(0, limit)
      .map(clone);
  }

  async function addFriend(friendUserId) {
    await ensureReady();

    const currentUser = state.currentUser;
    const normalizedFriendId = String(friendUserId || "");

    if (!currentUser) {
      return { status: "auth-required" };
    }

    if (!normalizedFriendId) {
      return { status: "invalid" };
    }

    if (String(currentUser.id) === normalizedFriendId) {
      return { status: "self" };
    }

    const friend = await getUserById(normalizedFriendId);

    if (!friend) {
      return { status: "not-found" };
    }

    if (areUsersFriends(currentUser.id, normalizedFriendId)) {
      return { status: "already-friends", friend };
    }

    const { error } = await getClient()
      .from("friendships")
      .insert({
        user_id: currentUser.id,
        friend_user_id: normalizedFriendId
      });

    if (error) {
      return { status: getSetupStatus(error), error };
    }

    const currentFriends = state.friendsCache.get(String(currentUser.id)) || [];
    cacheFriends(currentUser.id, [friend, ...currentFriends.filter((item) => String(item.id) !== String(friend.id))]);

    const friendFriends = state.friendsCache.get(String(friend.id)) || [];
    cacheFriends(friend.id, [currentUser, ...friendFriends.filter((item) => String(item.id) !== String(currentUser.id))]);

    emitChange();
    return { status: "added", friend };
  }

  function getExpertiseSummary(userOrId) {
    const source = typeof userOrId === "object" && userOrId
      ? userOrId
      : state.profileCache.get(String(userOrId)) || state.currentUser;
    const rating = normalizeExpertiseRating(source?.expertiseRating ?? source?.expertise_rating);
    const acceptedCount = normalizeCount(
      source?.acceptedRecommendationCount ?? source?.accepted_recommendation_count
    );
    const currentLevel = getExpertiseLevelFromRating(rating);
    const nextLevel = EXPERTISE_LEVELS.find((level) => level.level === currentLevel.level + 1) || null;
    const progress = nextLevel
      ? Math.max(
        0,
        Math.min(
          1,
          (rating - currentLevel.minRating) / (nextLevel.minRating - currentLevel.minRating)
        )
      )
      : 1;

    return {
      rating,
      acceptedCount,
      level: currentLevel.level,
      label: currentLevel.label,
      progress,
      nextLevel: nextLevel
        ? {
          level: nextLevel.level,
          label: nextLevel.label,
          minRating: nextLevel.minRating
        }
        : null
    };
  }

  async function getUserByIdFromUsernameKey(usernameNormalized) {
    if (!usernameNormalized) {
      return null;
    }

    const { data, error } = await getClient()
      .from("profiles")
      .select("*")
      .eq("username_normalized", usernameNormalized)
      .maybeSingle();

    if (error) {
      return null;
    }

    return normalizeProfileRow(data);
  }

  async function signUpUser(userData) {
    await ensureReady();

    const username = String(userData?.username || "").trim();
    const password = String(userData?.password || "").trim();
    const authEmail = normalizeEmail(userData?.email);
    const avatar = normalizeAvatar(userData?.avatar);
    const usernameNormalized = normalizeUsernameKey(username);

    if (!username || !password || !usernameNormalized || !authEmail) {
      return { status: "invalid" };
    }

    if (!isValidEmail(authEmail)) {
      return {
        status: "invalid-email",
        error: new Error("Correo electronico no valido.")
      };
    }

    if (password.length < 6) {
      return {
        status: "weak-password",
        error: new Error("La contrasena debe tener al menos 6 caracteres.")
      };
    }

    const { data: existingProfiles, error: existingProfilesError } = await getClient()
      .from("profiles")
      .select("id")
      .eq("username_normalized", usernameNormalized)
      .limit(1);

    if (existingProfilesError) {
      return { status: getSetupStatus(existingProfilesError), error: existingProfilesError };
    }

    if ((existingProfiles || []).length > 0) {
      return { status: "exists" };
    }

    const { data, error } = await getClient().auth.signUp({
      email: authEmail,
      password,
      options: {
        data: {
          username,
          username_normalized: usernameNormalized,
          avatar
        }
      }
    });

    if (error) {
      const status = classifySignUpError(error);
      return { status, error };
    }

    await refreshState(data.session || null);

    if (!data.session) {
      return {
        status: "confirmation-required",
        user: {
          username,
          avatar
        }
      };
    }

    if (!getCurrentUser()) {
      return {
        status: "setup-required",
        error: state.lastError
      };
    }

    return {
      status: "created",
      user: getCurrentUser()
    };
  }

  async function logInUser(userData) {
    await ensureReady();

    const username = String(userData?.username || "").trim();
    const password = String(userData?.password || "").trim();
    const usernameNormalized = normalizeUsernameKey(username);

    if (!username || !password || !usernameNormalized) {
      return { status: "invalid" };
    }

    const existingProfile = await getUserByIdFromUsernameKey(usernameNormalized);
    const authEmail = normalizeEmail(existingProfile?.authEmail || deriveAuthEmail(usernameNormalized));
    const { data, error } = await getClient().auth.signInWithPassword({
      email: authEmail,
      password
    });

    if (error) {
      const errorMessage = String(error.message || "").toLowerCase();

      if (errorMessage.includes("email not confirmed")) {
        return { status: "confirmation-required", error };
      }

      return existingProfile
        ? { status: "wrong-password", error }
        : { status: "not-found", error };
    }

    await refreshState(data.session || null);

    if (!getCurrentUser()) {
      return {
        status: "setup-required",
        error: state.lastError
      };
    }

    return {
      status: "logged-in",
      user: getCurrentUser()
    };
  }

  async function logOutUser() {
    await ensureReady();
    await getClient().auth.signOut({ scope: "local" });
    state.currentUser = null;
    state.restaurants = [];
    state.desiredRestaurants = [];
    state.recommendationActions = readGuestRecommendationActions();
    emitChange();
  }

  function normalizeRestaurantInput(restaurantData) {
    return {
      name: String(restaurantData?.name || "").trim(),
      placeId: String(restaurantData?.placeId || ""),
      address: String(restaurantData?.address || "").trim(),
      location: normalizeLocation(restaurantData?.location),
      visibility: restaurantData?.visibility === "publico" ? "publico" : "privado",
      price: restaurantData?.price ? normalizePrice(restaurantData?.price) : "",
      rating: normalizeRating(restaurantData?.rating),
      comment: normalizeComment(restaurantData?.comment),
      hashtags: Array.isArray(restaurantData?.hashtags)
        ? [...new Set(restaurantData.hashtags.map(normalizeHashtag).filter(Boolean))]
        : [],
      source: String(restaurantData?.source || "manual")
    };
  }

  async function addRestaurant(restaurantData) {
    await ensureReady();

    const currentUser = state.currentUser;

    if (!currentUser) {
      return { status: "auth-required" };
    }

    const candidateRestaurant = normalizeRestaurantInput(restaurantData);

    if (!candidateRestaurant.name) {
      return { status: "invalid" };
    }

    const existingSavedRestaurant = state.restaurants.find((restaurant) =>
      matchesRestaurant(restaurant, candidateRestaurant)
    );

    if (existingSavedRestaurant) {
      return { status: "exists-list", restaurant: clone(existingSavedRestaurant) };
    }

    const existingDesiredRestaurant = state.desiredRestaurants.find((restaurant) =>
      matchesRestaurant(restaurant, candidateRestaurant)
    );

    if (existingDesiredRestaurant) {
      return { status: "exists-desired", restaurant: clone(existingDesiredRestaurant) };
    }

    const { data, error } = await getClient()
      .from("restaurants")
      .insert({
        user_id: currentUser.id,
        name: candidateRestaurant.name,
        visibility: candidateRestaurant.visibility,
        price: candidateRestaurant.price || "\u20ac",
        rating: candidateRestaurant.rating,
        comment: candidateRestaurant.comment,
        hashtags: candidateRestaurant.hashtags,
        place_id: candidateRestaurant.placeId,
        address: candidateRestaurant.address,
        location: candidateRestaurant.location,
        source: candidateRestaurant.source
      })
      .select()
      .single();

    if (error) {
      return { status: getSetupStatus(error), error };
    }

    const restaurant = normalizeRestaurantRow(data);
    state.restaurants = [restaurant, ...state.restaurants];
    syncCurrentUserCache();
    emitChange();
    return { status: "added", restaurant: clone(restaurant) };
  }

  async function addDesiredRestaurant(restaurantData) {
    await ensureReady();

    const currentUser = state.currentUser;

    if (!currentUser) {
      return { status: "auth-required" };
    }

    const allowExistingInList = Boolean(restaurantData?.allowExistingInList);
    const candidateRestaurant = normalizeRestaurantInput(restaurantData);

    if (!candidateRestaurant.name) {
      return { status: "invalid" };
    }

    const existingDesiredRestaurant = state.desiredRestaurants.find((restaurant) =>
      matchesRestaurant(restaurant, candidateRestaurant)
    );

    if (existingDesiredRestaurant) {
      return { status: "exists-desired", restaurant: clone(existingDesiredRestaurant) };
    }

    const existingSavedRestaurant = state.restaurants.find((restaurant) =>
      matchesRestaurant(restaurant, candidateRestaurant)
    );

    if (existingSavedRestaurant && !allowExistingInList) {
      return { status: "exists-list", restaurant: clone(existingSavedRestaurant) };
    }

    const { data, error } = await getClient()
      .from("desired_restaurants")
      .insert({
        user_id: currentUser.id,
        name: candidateRestaurant.name,
        visibility: candidateRestaurant.visibility,
        price: candidateRestaurant.price,
        rating: candidateRestaurant.rating,
        comment: candidateRestaurant.comment,
        hashtags: candidateRestaurant.hashtags,
        place_id: candidateRestaurant.placeId,
        address: candidateRestaurant.address,
        location: candidateRestaurant.location,
        source: candidateRestaurant.source
      })
      .select()
      .single();

    if (error) {
      return { status: getSetupStatus(error), error };
    }

    const restaurant = normalizeRestaurantRow(data);
    state.desiredRestaurants = [restaurant, ...state.desiredRestaurants];
    syncCurrentUserCache();
    emitChange();
    return { status: "added", restaurant: clone(restaurant) };
  }

  async function completeDesiredRestaurant(restaurantId, visitData) {
    await ensureReady();

    const currentUser = state.currentUser;

    if (!currentUser) {
      return { status: "auth-required" };
    }

    const desiredRestaurant = state.desiredRestaurants.find(
      (restaurant) => Number(restaurant.id) === Number(restaurantId)
    );

    if (!desiredRestaurant) {
      return { status: "not-found" };
    }

    const existingSavedRestaurant = state.restaurants.find((restaurant) =>
      matchesRestaurant(restaurant, desiredRestaurant)
    );

    if (existingSavedRestaurant) {
      return { status: "exists-list", restaurant: clone(existingSavedRestaurant) };
    }

    const payload = normalizeRestaurantInput({
      ...desiredRestaurant,
      visibility: visitData?.visibility,
      price: visitData?.price || desiredRestaurant.price || "\u20ac",
      rating: visitData?.rating,
      comment: visitData?.comment,
      hashtags: visitData?.hashtags || desiredRestaurant.hashtags || []
    });

    const { data, error } = await getClient()
      .from("restaurants")
      .insert({
        user_id: currentUser.id,
        name: desiredRestaurant.name,
        visibility: payload.visibility,
        price: payload.price || "\u20ac",
        rating: payload.rating,
        comment: payload.comment,
        hashtags: payload.hashtags,
        place_id: desiredRestaurant.placeId,
        address: desiredRestaurant.address,
        location: desiredRestaurant.location,
        source: desiredRestaurant.source
      })
      .select()
      .single();

    if (error) {
      return { status: getSetupStatus(error), error };
    }

    const deleteResult = await removeDesiredRestaurant(restaurantId, { silent: true });

    if (deleteResult.status === "error" || deleteResult.status === "setup-required") {
      return deleteResult;
    }

    const restaurant = normalizeRestaurantRow(data);
    state.restaurants = [restaurant, ...state.restaurants];
    syncCurrentUserCache();
    emitChange();
    return { status: "completed", restaurant: clone(restaurant) };
  }

  async function markDesiredAsVisited(restaurantId) {
    const desiredRestaurant = state.desiredRestaurants.find(
      (restaurant) => Number(restaurant.id) === Number(restaurantId)
    );

    if (!desiredRestaurant) {
      return { status: "not-found" };
    }

    return completeDesiredRestaurant(restaurantId, {
      visibility: "privado",
      price: desiredRestaurant.price || "\u20ac",
      rating: desiredRestaurant.rating,
      comment: desiredRestaurant.comment,
      hashtags: desiredRestaurant.hashtags || []
    });
  }

  async function removeDesiredRestaurant(restaurantId, options = {}) {
    await ensureReady();

    const currentUser = state.currentUser;

    if (!currentUser) {
      return { status: "auth-required" };
    }

    const { error } = await getClient()
      .from("desired_restaurants")
      .delete()
      .eq("id", Number(restaurantId))
      .eq("user_id", currentUser.id);

    if (error) {
      return { status: getSetupStatus(error), error };
    }

    state.desiredRestaurants = state.desiredRestaurants.filter(
      (restaurant) => Number(restaurant.id) !== Number(restaurantId)
    );
    syncCurrentUserCache();

    if (!options.silent) {
      emitChange();
    }

    return { status: "removed" };
  }

  async function publishRecommendation(recommendationData) {
    await ensureReady();

    const currentUser = state.currentUser;

    if (!currentUser) {
      return { status: "auth-required" };
    }

    const restaurantId = Number(recommendationData?.restaurantId);
    const restaurant = state.restaurants.find((item) => Number(item.id) === restaurantId);

    if (!restaurant) {
      return { status: "not-found" };
    }

    if (isRestaurantPublishedByCurrentUser(restaurant.id)) {
      return { status: "already-published" };
    }

    if (getCurrentWeekRecommendationCount(currentUser.id) >= 3) {
      return { status: "weekly-limit" };
    }

    const { data, error } = await getClient()
      .from("recommendations")
      .insert({
        original_restaurant_id: restaurant.id,
        owner_user_id: currentUser.id,
        restaurant_name: restaurant.name,
        place_id: restaurant.placeId,
        address: restaurant.address,
        location: restaurant.location,
        price: restaurant.price || "\u20ac",
        rating: restaurant.rating,
        comment: restaurant.comment,
        hashtags: restaurant.hashtags || [],
        visibility: restaurant.visibility
      })
      .select()
      .single();

    if (error) {
      return { status: getSetupStatus(error), error };
    }

    const recommendation = {
      id: Number(data.id),
      restaurantId: restaurant.id,
      restaurantName: restaurant.name,
      placeId: restaurant.placeId,
      address: restaurant.address,
      location: restaurant.location,
      price: restaurant.price || "\u20ac",
      rating: restaurant.rating,
      comment: restaurant.comment,
      hashtags: clone(restaurant.hashtags || []),
      ownerUserId: currentUser.id,
      ownerUsername: currentUser.username,
      ownerAvatar: currentUser.avatar,
      visibility: restaurant.visibility,
      createdAt: data.created_at || new Date().toISOString()
    };

    state.recommendations = [recommendation, ...state.recommendations];
    emitChange();
    return { status: "published", recommendation: clone(recommendation) };
  }

  async function saveRecommendationAction(recommendationId, action) {
    await ensureReady();

    const recommendation = state.recommendations.find(
      (item) => Number(item.id) === Number(recommendationId)
    );

    if (!recommendation) {
      return { status: "not-found" };
    }

    if (!state.currentUser) {
      addGuestRecommendationAction(recommendationId, action);
      state.recommendationActions = readGuestRecommendationActions();
      emitChange();
      return {
        status: "saved",
        recommendation,
        action: {
          recommendationId: Number(recommendationId),
          action,
          createdAt: Date.now()
        }
      };
    }

    const { data, error } = await getClient()
      .from("recommendation_actions")
      .insert({
        user_id: state.currentUser.id,
        recommendation_id: Number(recommendationId),
        action
      })
      .select()
      .single();

    if (error) {
      if (String(error.code || "") === "23505") {
        const existingAction = state.recommendationActions.find(
          (item) => Number(item.recommendationId) === Number(recommendationId)
        );
        return {
          status: "saved",
          recommendation,
          action: existingAction || {
            recommendationId: Number(recommendationId),
            action,
            createdAt: Date.now()
          }
        };
      }

      return { status: getSetupStatus(error), error };
    }

    const nextAction = normalizeRecommendationActionRow(data);
    state.recommendationActions = [
      nextAction,
      ...state.recommendationActions.filter(
        (item) => Number(item.recommendationId) !== Number(recommendationId)
      )
    ];
    syncCurrentUserCache();
    emitChange();
    return { status: "saved", recommendation, action: clone(nextAction) };
  }

  async function rejectRecommendation(recommendationId) {
    return saveRecommendationAction(recommendationId, "rejected");
  }

  async function acceptRecommendation(recommendationId) {
    if (!state.currentUser) {
      return { status: "auth-required" };
    }

    const actionResult = await saveRecommendationAction(recommendationId, "accepted");

    if (actionResult.status !== "saved") {
      return actionResult;
    }

    const recommendation = actionResult.recommendation;
    const desiredResult = await addDesiredRestaurant({
      name: recommendation.restaurantName,
      placeId: recommendation.placeId,
      address: recommendation.address,
      location: recommendation.location,
      price: recommendation.price,
      rating: recommendation.rating,
      comment: recommendation.comment,
      hashtags: recommendation.hashtags,
      visibility: "privado",
      source: "recommendation",
      allowExistingInList: true
    });

    return {
      status: "accepted",
      recommendation: clone(recommendation),
      desiredResult
    };
  }

  function saveRestaurants(restaurants) {
    state.restaurants = clone(Array.isArray(restaurants) ? restaurants : []);
    syncCurrentUserCache();
    emitChange();
  }

  function saveDesiredRestaurants(restaurants) {
    state.desiredRestaurants = clone(Array.isArray(restaurants) ? restaurants : []);
    syncCurrentUserCache();
    emitChange();
  }

  function getUsers() {
    return [...state.profileCache.values()].map(clone);
  }

  function saveUsers() {}

  function saveRecommendations(recommendations) {
    state.recommendations = clone(Array.isArray(recommendations) ? recommendations : []);
    emitChange();
  }

  window.SAVORY_DB = {
    ready: initialize(),
    ensureReady,
    getStatus: () => state.status,
    getLastError: () => state.lastError,
    refresh: async () => {
      await ensureReady();
      await refreshState();
    },
    getRestaurants,
    saveRestaurants,
    getDesiredRestaurants,
    saveDesiredRestaurants,
    getUsers,
    saveUsers,
    getCurrentUser,
    getUserById,
    getUserRestaurants,
    getUserFriends,
    searchUsersByUsername,
    addFriend,
    areUsersFriends,
    getExpertiseSummary,
    getRecommendations,
    saveRecommendations,
    getVisibleRecommendations,
    getRecommendationActions,
    publishRecommendation,
    isRestaurantPublishedByCurrentUser,
    rejectRecommendation,
    acceptRecommendation,
    getCurrentWeekRecommendationCount,
    signUpUser,
    logInUser,
    logOutUser,
    addRestaurant,
    addDesiredRestaurant,
    completeDesiredRestaurant,
    markDesiredAsVisited,
    removeDesiredRestaurant
  };
})();
