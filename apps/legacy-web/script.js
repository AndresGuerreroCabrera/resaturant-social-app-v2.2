const switches = document.querySelectorAll(".segmented-switch");

switches.forEach((switchElement) => {
  const options = switchElement.querySelectorAll(".switch-option");

  options.forEach((option, index) => {
    option.addEventListener("click", () => {
      switchElement.dataset.activeIndex = String(index);

      options.forEach((button, buttonIndex) => {
        const isActive = buttonIndex === index;
        button.classList.toggle("is-active", isActive);
        button.setAttribute("aria-pressed", String(isActive));
      });
    });
  });
});

const body = document.body;
const currentTheme = body?.dataset.pageTheme || "light";
const previousTheme = window.sessionStorage.getItem("savory_previous_theme");

function buildAuthRedirectUrl() {
  const authUrl = new URL("auth.html", window.location.href);
  authUrl.searchParams.set(
    "redirect",
    `${window.location.pathname}${window.location.search}${window.location.hash}`
  );
  return authUrl.href;
}

function getThemeOverlay(theme) {
  if (theme === "dark") {
    return "radial-gradient(circle at top, rgba(120, 96, 170, 0.26), transparent 32%), linear-gradient(180deg, rgba(27, 23, 33, 0.94) 0%, rgba(17, 16, 21, 0.98) 100%)";
  }

  return "radial-gradient(circle at top, rgba(255, 201, 182, 0.34), transparent 34%), linear-gradient(180deg, rgba(255, 247, 241, 0.96) 0%, rgba(243, 237, 229, 0.98) 100%)";
}

function getThemeFromHref(href) {
  try {
    const url = new URL(href, window.location.href);
    const pathname = url.pathname.toLowerCase();
    return pathname.endsWith("/deseados.html") ||
      pathname.endsWith("deseados.html") ||
      pathname.endsWith("/recommendations.html") ||
      pathname.endsWith("recommendations.html")
      ? "dark"
      : "light";
  } catch {
    return currentTheme;
  }
}

if (body && previousTheme) {
  body.style.setProperty("--entry-overlay", getThemeOverlay(previousTheme));
  body.classList.add("is-entering");

  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => {
      body.classList.remove("is-entering");
    });
  });

  window.sessionStorage.removeItem("savory_previous_theme");
}

document.querySelectorAll('a[href]').forEach((link) => {
  link.addEventListener("click", (event) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    const href = link.getAttribute("href");

    if (!href || href.startsWith("#") || link.target === "_blank" || link.hasAttribute("download")) {
      return;
    }

    const url = new URL(href, window.location.href);

    if (url.origin !== window.location.origin || url.pathname === window.location.pathname) {
      return;
    }

    event.preventDefault();

    const nextTheme = getThemeFromHref(url.href);
    window.sessionStorage.setItem("savory_previous_theme", currentTheme);
    body.style.setProperty("--exit-overlay", getThemeOverlay(nextTheme));
    body.classList.add("is-transitioning");

    window.setTimeout(() => {
      window.location.href = url.href;
    }, 260);
  });
});

function getAvatarInitials(username) {
  const cleanUsername = String(username || "").trim();

  if (!cleanUsername) {
    return "SV";
  }

  return cleanUsername
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || "")
    .join("")
    .slice(0, 2);
}

async function syncUserAvatarUI() {
  if (window.SAVORY_DB?.ready) {
    await window.SAVORY_DB.ready;
  }

  const currentUser = window.SAVORY_DB?.getCurrentUser?.() || null;

  document.querySelectorAll("[data-user-avatar]").forEach((avatarElement) => {
    avatarElement.dataset.avatarStyle = currentUser?.avatar || "chef";

    const initialsElement = avatarElement.querySelector("[data-avatar-initials]");

    if (initialsElement) {
      initialsElement.textContent = getAvatarInitials(currentUser?.username);
    }
  });

  document.querySelectorAll("[data-current-username]").forEach((usernameElement) => {
    usernameElement.textContent = currentUser?.username || "Invitado";
  });
}

syncUserAvatarUI();
window.SAVORY_syncUserAvatarUI = syncUserAvatarUI;
window.addEventListener("savory:db-change", () => {
  syncUserAvatarUI();
});

const homeSearchPage = document.querySelector("[data-home-search-page]");

async function enforceAuthenticatedHomeEntry() {
  if (!homeSearchPage || !window.SAVORY_DB?.ready) {
    return;
  }

  await window.SAVORY_DB.ready;

  if (
    window.SAVORY_DB.getStatus?.() === "ready" &&
    !window.SAVORY_DB.getCurrentUser?.()
  ) {
    window.location.replace(buildAuthRedirectUrl());
  }
}

enforceAuthenticatedHomeEntry();

if (homeSearchPage) {
  const HOME_DRAFT_KEY = "savory_home_draft";
  const DEFAULT_PRICE = "\u20ac";
  const DEFAULT_RATING = 0;
  const DEFAULT_COMMENT = "";
  const DEFAULT_HASHTAGS = [];
  const DEFAULT_SAVE_TARGET = "desired";
  const DEFAULT_CENTER = { lat: 40.4168, lng: -3.7038 };
  const MAP_MINIMAL_STYLES = [
    {
      featureType: "poi",
      stylers: [{ visibility: "off" }]
    },
    {
      featureType: "transit",
      stylers: [{ visibility: "off" }]
    },
    {
      featureType: "administrative.land_parcel",
      stylers: [{ visibility: "off" }]
    },
    {
      featureType: "administrative.neighborhood",
      stylers: [{ visibility: "off" }]
    },
    {
      featureType: "landscape",
      stylers: [{ visibility: "off" }]
    },
    {
      featureType: "water",
      stylers: [{ visibility: "off" }]
    },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#d2c8bb" }, { saturation: -100 }, { lightness: 10 }]
    },
    {
      featureType: "road",
      elementType: "labels.icon",
      stylers: [{ visibility: "off" }]
    },
    {
      featureType: "road",
      elementType: "labels.text.fill",
      stylers: [{ color: "#7b6a63" }]
    },
    {
      featureType: "road",
      elementType: "labels.text.stroke",
      stylers: [{ color: "#f7f1ea" }]
    },
    {
      featureType: "road.highway",
      elementType: "geometry",
      stylers: [{ color: "#c4b8a9" }]
    },
    {
      featureType: "road.arterial",
      elementType: "geometry",
      stylers: [{ color: "#d7cec1" }]
    }
  ];

  const searchInput = homeSearchPage.querySelector("#places-search-input");
  const resultsContainer = homeSearchPage.querySelector("#places-search-results");
  const statusElement = homeSearchPage.querySelector("#places-search-status");
  const mapVisibilitySwitch = homeSearchPage.querySelector(".visibility-switch");
  const mapVisibilityButtons = mapVisibilitySwitch?.querySelectorAll("[data-map-visibility]") || [];
  const saveTargetSwitch = homeSearchPage.querySelector("[data-add-target-switch]");
  const saveTargetButtons = saveTargetSwitch?.querySelectorAll(".switch-option") || [];
  const visibilitySwitch = homeSearchPage.querySelector("[data-add-visibility-switch]");
  const visibilityButtons = visibilitySwitch?.querySelectorAll(".switch-option") || [];
  const visibilityGroup = homeSearchPage.querySelector("#selected-place-visibility-group");
  const priceGroup = homeSearchPage.querySelector("#selected-place-price-group");
  const ratingGroup = homeSearchPage.querySelector("#selected-place-rating-group");
  const hashtagsGroup = homeSearchPage.querySelector("#selected-place-hashtags-group");
  const commentGroup = homeSearchPage.querySelector("#selected-place-comment-group");
  const mapElement = homeSearchPage.querySelector("#google-map");
  const sheetElement = homeSearchPage.querySelector("#selected-place-sheet");
  const sheetName = homeSearchPage.querySelector("#selected-place-name");
  const sheetAddress = homeSearchPage.querySelector("#selected-place-address");
  const closeSheetButton = homeSearchPage.querySelector("#close-selected-place-button");
  const cancelSheetButton = homeSearchPage.querySelector("#cancel-selected-place-button");
  const addSelectedPlaceButton = homeSearchPage.querySelector("#add-selected-place-button");
  const priceButtons = homeSearchPage.querySelectorAll("[data-place-price]");
  const ratingButtons = homeSearchPage.querySelectorAll("[data-place-rating]");
  const hashtagInput = homeSearchPage.querySelector("#places-hashtag-input");
  const addHashtagButton = homeSearchPage.querySelector("#places-add-hashtag-button");
  const selectedHashtags = homeSearchPage.querySelector("#places-selected-hashtags");
  const commentInput = homeSearchPage.querySelector("#places-comment-input");
  const homeSearchState = {
    debounceTimer: 0,
    requestId: 0,
    googleReady: false,
    map: null,
    mapMarkers: [],
    markerInfoWindow: null,
    placeClass: null,
    placesService: null,
    results: [],
    selectedPlace: null,
    selectedPlaceReadonly: false,
    selectedPrice: DEFAULT_PRICE,
    selectedRating: DEFAULT_RATING,
    comment: DEFAULT_COMMENT,
    hashtags: new Set(DEFAULT_HASHTAGS),
    saveTarget: DEFAULT_SAVE_TARGET,
    lastCenter: DEFAULT_CENTER
  };

  function setSearchStatus(message, tone = "muted") {
    if (!statusElement) {
      return;
    }

    statusElement.textContent = message;
    statusElement.dataset.tone = tone;
  }

  function normalizeHashtag(value) {
    const cleanValue = String(value || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/^#*/, "")
      .replace(/[^a-z0-9_-]+/g, "")
      .replace(/\s+/g, "");

    if (!cleanValue) {
      return "";
    }

    return `#${cleanValue}`;
  }

  function serializeLatLng(location) {
    if (!location) {
      return null;
    }

    const lat = typeof location.lat === "function" ? location.lat() : location.lat;
    const lng = typeof location.lng === "function" ? location.lng() : location.lng;

    if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
      return null;
    }

    return { lat, lng };
  }

  function getSaveVisibility() {
    const activeButton = visibilitySwitch?.querySelector(".switch-option.is-active");
    return activeButton?.dataset.saveVisibility === "publico" ? "publico" : "privado";
  }

  function getSaveTarget() {
    const activeButton = saveTargetSwitch?.querySelector(".switch-option.is-active");
    return activeButton?.dataset.saveTarget === "list" ? "list" : "desired";
  }

  function getMapVisibilityFilter() {
    const activeButton = mapVisibilitySwitch?.querySelector(".switch-option.is-active");
    const value = activeButton?.dataset.mapVisibility;
    return value === "privado" || value === "publico" ? value : "todos";
  }

  function syncSaveTargetUI() {
    const isListTarget = homeSearchState.saveTarget === "list";

    if (visibilityGroup) {
      visibilityGroup.hidden = !isListTarget;
    }

    if (priceGroup) {
      priceGroup.hidden = !isListTarget;
    }

    if (ratingGroup) {
      ratingGroup.hidden = !isListTarget;
    }

    if (hashtagsGroup) {
      hashtagsGroup.hidden = !isListTarget;
    }

    if (commentGroup) {
      commentGroup.hidden = !isListTarget;
    }
  }

  function setSaveTarget(target) {
    const nextTarget = target === "list" ? "list" : "desired";
    homeSearchState.saveTarget = nextTarget;

    saveTargetButtons.forEach((button, index) => {
      const isActive = button.dataset.saveTarget === nextTarget;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));

      if (isActive && saveTargetSwitch) {
        saveTargetSwitch.dataset.activeIndex = String(index);
      }
    });

    syncSaveTargetUI();
    refreshSelectedPlaceStatus();
    persistDraft();
  }

  function setSaveVisibility(visibility) {
    const nextVisibility = visibility === "publico" ? "publico" : "privado";

    visibilityButtons.forEach((button, index) => {
      const isActive = button.dataset.saveVisibility === nextVisibility;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));

      if (isActive && visibilitySwitch) {
        visibilitySwitch.dataset.activeIndex = String(index);
      }
    });
  }

  function setSelectedPrice(price) {
    homeSearchState.selectedPrice =
      price === "\u20ac\u20ac" || price === "\u20ac\u20ac\u20ac" ? price : DEFAULT_PRICE;

    priceButtons.forEach((button) => {
      const isActive = button.dataset.placePrice === homeSearchState.selectedPrice;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    persistDraft();
  }

  function setSelectedRating(rating) {
    homeSearchState.selectedRating = Number(rating) >= 1 && Number(rating) <= 5
      ? Number(rating)
      : DEFAULT_RATING;

    ratingButtons.forEach((button) => {
      const buttonRating = Number(button.dataset.placeRating);
      const isActive = buttonRating <= homeSearchState.selectedRating && homeSearchState.selectedRating > 0;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(buttonRating === homeSearchState.selectedRating));
    });

    persistDraft();
  }

  function setSelectedComment(comment) {
    homeSearchState.comment = String(comment || "").slice(0, 280);

    if (commentInput && commentInput.value !== homeSearchState.comment) {
      commentInput.value = homeSearchState.comment;
    }

    persistDraft();
  }

  function setSelectedPlaceReadonly(isReadonly) {
    homeSearchState.selectedPlaceReadonly = Boolean(isReadonly);

    saveTargetButtons.forEach((button) => {
      button.disabled = homeSearchState.selectedPlaceReadonly;
    });

    visibilityButtons.forEach((button) => {
      button.disabled = homeSearchState.selectedPlaceReadonly;
    });

    priceButtons.forEach((button) => {
      button.disabled = homeSearchState.selectedPlaceReadonly;
    });

    ratingButtons.forEach((button) => {
      button.disabled = homeSearchState.selectedPlaceReadonly;
    });

    if (hashtagInput) {
      hashtagInput.disabled = homeSearchState.selectedPlaceReadonly;
    }

    if (addHashtagButton) {
      addHashtagButton.disabled = homeSearchState.selectedPlaceReadonly;
    }

    if (commentInput) {
      commentInput.disabled = homeSearchState.selectedPlaceReadonly;
    }

    if (addSelectedPlaceButton) {
      addSelectedPlaceButton.disabled = homeSearchState.selectedPlaceReadonly;
      addSelectedPlaceButton.textContent = homeSearchState.selectedPlaceReadonly ? "Ya guardado" : "Anadir";
    }
  }

  function resetSelectedPlaceForm() {
    setSelectedPlaceReadonly(false);
    homeSearchState.hashtags = new Set(DEFAULT_HASHTAGS);
    setSelectedPrice(DEFAULT_PRICE);
    setSelectedRating(DEFAULT_RATING);
    setSelectedComment(DEFAULT_COMMENT);
    setSaveTarget(DEFAULT_SAVE_TARGET);
    setSaveVisibility("privado");
    renderSelectedHashtags();
  }

  function renderSelectedHashtags() {
    if (!selectedHashtags) {
      return;
    }

    if (homeSearchState.hashtags.size === 0) {
      selectedHashtags.innerHTML = "";
      return;
    }

    selectedHashtags.innerHTML = [...homeSearchState.hashtags]
      .map(
        (tag) => `
          <button class="filter-chip is-active selected-tag-chip" type="button" data-remove-place-hashtag="${tag}">
            <span>${tag}</span>
            <span aria-hidden="true">x</span>
          </button>
        `
      )
      .join("");
  }

  function addCustomHashtag(tagValue) {
    if (homeSearchState.selectedPlaceReadonly) {
      return;
    }

    const normalizedTag = normalizeHashtag(tagValue);

    if (!normalizedTag) {
      return;
    }

    homeSearchState.hashtags.add(normalizedTag);
    if (hashtagInput) {
      hashtagInput.value = "";
    }

    renderSelectedHashtags();
    persistDraft();
  }

  function removeCustomHashtag(tagValue) {
    if (homeSearchState.selectedPlaceReadonly) {
      return;
    }

    if (!tagValue) {
      return;
    }

    homeSearchState.hashtags.delete(tagValue);
    renderSelectedHashtags();
    persistDraft();
  }

  function clearSearchResults() {
    if (!resultsContainer) {
      return;
    }

    window.clearTimeout(homeSearchState.debounceTimer);
    homeSearchState.requestId += 1;
    homeSearchState.results = [];
    resultsContainer.innerHTML = "";
    resultsContainer.hidden = true;
    resultsContainer.removeAttribute("aria-busy");
  }

  function renderSearchResults(results) {
    if (!resultsContainer) {
      return;
    }

    resultsContainer.innerHTML = "";

    if (results.length === 0) {
      resultsContainer.hidden = true;
      return;
    }

    const fragment = document.createDocumentFragment();

    results.forEach((result) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "place-result-card";
      button.dataset.placeId = result.placeId;

      const copy = document.createElement("span");
      copy.className = "place-result-copy";

      const title = document.createElement("span");
      title.className = "place-result-title";
      title.textContent = result.name;

      const subtitle = document.createElement("span");
      subtitle.className = "place-result-subtitle";
      subtitle.textContent = result.address || "Pulsa para abrir la ficha";

      const action = document.createElement("span");
      action.className = "place-result-action";
      action.textContent = "Abrir";

      copy.append(title, subtitle);
      button.append(copy, action);
      fragment.appendChild(button);
    });

    resultsContainer.appendChild(fragment);
    resultsContainer.hidden = false;
  }

  function clearRestaurantMarkers() {
    homeSearchState.mapMarkers.forEach((marker) => marker.setMap(null));
    homeSearchState.mapMarkers = [];
  }

  function createPinIcon(color, shadowColor) {
    const svg = `
      <svg xmlns="http://www.w3.org/2000/svg" width="46" height="60" viewBox="0 0 46 60">
        <defs>
          <linearGradient id="pinGradient" x1="23" y1="7" x2="23" y2="43" gradientUnits="userSpaceOnUse">
            <stop offset="0" stop-color="${color}"/>
            <stop offset="1" stop-color="${shadowColor}"/>
          </linearGradient>
          <filter id="pinShadow" x="-40%" y="-30%" width="180%" height="190%">
            <feDropShadow dx="0" dy="8" stdDeviation="6" flood-color="rgba(43,29,23,0.24)"/>
          </filter>
        </defs>
        <path filter="url(#pinShadow)" fill="url(#pinGradient)" stroke="#fff7f2" stroke-width="2.4" d="M23 5C14 5 6.6 12 6.6 20.8c0 12.3 13 24.8 15 27.5.8 1 2 1 2.8 0 2-2.7 15-15.2 15-27.5C39.4 12 32 5 23 5Z"/>
        <circle cx="23" cy="21" r="10.2" fill="#fffaf6"/>
        <circle cx="23" cy="21" r="5.2" fill="${shadowColor}"/>
        <path d="M15.2 14.8c2.4-3.3 6.5-5.3 10.8-5.3" fill="none" stroke="rgba(255,255,255,0.72)" stroke-linecap="round" stroke-width="2"/>
      </svg>
    `;

    return {
      url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
      scaledSize: new window.google.maps.Size(46, 60),
      anchor: new window.google.maps.Point(23, 60)
    };
  }

  function openMarkerLabel(restaurant, marker) {
    if (!homeSearchState.map || !restaurant?.name || !window.google?.maps?.InfoWindow) {
      return;
    }

    if (!homeSearchState.markerInfoWindow) {
      homeSearchState.markerInfoWindow = new window.google.maps.InfoWindow({
        disableAutoPan: true,
        pixelOffset: new window.google.maps.Size(0, -26)
      });
    }

    const label = document.createElement("div");
    label.className = "map-pin-label";

    const dot = document.createElement("span");
    dot.className = "map-pin-label-dot";
    dot.setAttribute("aria-hidden", "true");

    const text = document.createElement("span");
    text.className = "map-pin-label-text";
    text.textContent = restaurant.name;

    label.append(dot, text);

    homeSearchState.markerInfoWindow.setContent(label);
    homeSearchState.markerInfoWindow.open({
      anchor: marker,
      map: homeSearchState.map
    });
  }

  function renderRestaurantMarkers() {
    if (!homeSearchState.map || !window.google?.maps?.Marker) {
      return;
    }

    clearRestaurantMarkers();

    const visibilityFilter = getMapVisibilityFilter();
    const restaurants = window.SAVORY_DB.getRestaurants().filter((restaurant) => {
      if (!restaurant.location) {
        return false;
      }

      return visibilityFilter === "todos" || restaurant.visibility === visibilityFilter;
    });

    homeSearchState.mapMarkers = restaurants.map((restaurant) => {
      const marker = new window.google.maps.Marker({
        map: homeSearchState.map,
        position: restaurant.location,
        title: restaurant.name,
        icon: createPinIcon(
          restaurant.visibility === "publico" ? "#6ea8ff" : "#ff8b69",
          restaurant.visibility === "publico" ? "#2f6ae6" : "#dc4f2d"
        )
      });

      marker.addListener("click", () => {
        openMarkerLabel(restaurant, marker);
      });

      return marker;
    });
  }

  function centerMap(location, zoom = 16) {
    const normalizedLocation = serializeLatLng(location);

    if (!homeSearchState.map || !normalizedLocation) {
      return;
    }

    homeSearchState.lastCenter = normalizedLocation;
    homeSearchState.map.panTo(normalizedLocation);
    homeSearchState.map.setZoom(zoom);
  }

  function getSelectedPlaceSummary() {
    const hashtags = [...homeSearchState.hashtags];
    const hashtagsLabel = hashtags.length > 0 ? hashtags.join(" ") : "sin hashtags";
    const ratingLabel = homeSearchState.selectedRating > 0
      ? `${homeSearchState.selectedRating} estrellas`
      : "sin puntuacion";
    return `${homeSearchState.selectedPrice}, ${ratingLabel} y ${hashtagsLabel}`;
  }

  function refreshSelectedPlaceStatus() {
    if (!homeSearchState.selectedPlace) {
      return;
    }

    if (homeSearchState.selectedPlaceReadonly) {
      setSearchStatus(`"${homeSearchState.selectedPlace.name}" ya esta guardado en tu mapa.`, "muted");
      return;
    }

    if (homeSearchState.saveTarget === "list") {
      setSearchStatus(`Revisa ${getSelectedPlaceSummary()} y anadelo a tu lista.`, "muted");
      return;
    }

    setSearchStatus(`Anadelo a deseados o cambia a "Ya he ido" para configurar precio y hashtags.`, "muted");
  }

  function persistDraft() {
    const draft = {
      search: searchInput?.value || "",
      saveTarget: homeSearchState.saveTarget,
      visibility: getSaveVisibility(),
      selectedPrice: homeSearchState.selectedPrice,
      selectedRating: homeSearchState.selectedRating,
      comment: homeSearchState.comment,
      hashtags: [...homeSearchState.hashtags],
      selectedPlace: homeSearchState.selectedPlace
        ? {
            placeId: homeSearchState.selectedPlace.placeId,
            name: homeSearchState.selectedPlace.name,
            address: homeSearchState.selectedPlace.address,
            location: serializeLatLng(homeSearchState.selectedPlace.location)
          }
        : null
    };

    window.localStorage.setItem(HOME_DRAFT_KEY, JSON.stringify(draft));
  }

  function loadDraft() {
    try {
      const savedValue = window.localStorage.getItem(HOME_DRAFT_KEY);

      if (!savedValue) {
        return null;
      }

      const parsedValue = JSON.parse(savedValue);
      return parsedValue && typeof parsedValue === "object" ? parsedValue : null;
    } catch {
      return null;
    }
  }

  function applyDraft() {
    const draft = loadDraft();

    if (!draft) {
      setSaveTarget(DEFAULT_SAVE_TARGET);
      setSelectedPrice(DEFAULT_PRICE);
      setSelectedRating(DEFAULT_RATING);
      setSelectedComment(DEFAULT_COMMENT);
      renderSelectedHashtags();
      setSaveVisibility("privado");
      return;
    }

    searchInput.value = String(draft.search || "");
    setSaveTarget(draft.saveTarget);
    setSaveVisibility(draft.visibility);
    setSelectedPrice(draft.selectedPrice);
    setSelectedRating(draft.selectedRating);
    setSelectedComment(draft.comment);
    homeSearchState.hashtags = new Set(
      Array.isArray(draft.hashtags)
        ? draft.hashtags.map(normalizeHashtag).filter(Boolean)
        : DEFAULT_HASHTAGS
    );
    renderSelectedHashtags();

    if (draft.selectedPlace?.name) {
      homeSearchState.selectedPlace = {
        placeId: String(draft.selectedPlace.placeId || ""),
        name: String(draft.selectedPlace.name || ""),
        address: String(draft.selectedPlace.address || ""),
        location: serializeLatLng(draft.selectedPlace.location)
      };
    }
  }

  function closeSelectedPlace(options = {}) {
    const { clearInput = false, keepMarker = true } = options;

    if (sheetElement) {
      sheetElement.hidden = true;
    }

    if (clearInput && searchInput) {
      searchInput.value = "";
    }

    homeSearchState.selectedPlace = null;
    setSelectedPlaceReadonly(false);

    persistDraft();
  }

  function openSelectedPlace(place, options = {}) {
    if (!place?.name) {
      return;
    }

    if (options.resetForm !== false) {
      resetSelectedPlaceForm();
    }

    homeSearchState.selectedPlace = {
      placeId: place.placeId || "",
      name: place.name,
      address: place.address || "",
      location: serializeLatLng(place.location)
    };

    if (sheetName) {
      sheetName.textContent = homeSearchState.selectedPlace.name;
    }

    if (sheetAddress) {
      sheetAddress.textContent = homeSearchState.selectedPlace.address || "Sin direccion disponible";
    }

    if (sheetElement) {
      sheetElement.hidden = false;
    }

    clearSearchResults();
    if (options.updateInput !== false && searchInput) {
      searchInput.value = homeSearchState.selectedPlace.name;
    }

    if (homeSearchState.selectedPlace.location) {
      centerMap(homeSearchState.selectedPlace.location, 17);
    }

    refreshSelectedPlaceStatus();
    persistDraft();
  }

  function openSavedRestaurantMarker(restaurant) {
    if (!restaurant?.name) {
      return;
    }

    setSaveTarget("list");
    setSaveVisibility(restaurant.visibility);
    setSelectedPrice(restaurant.price || DEFAULT_PRICE);
    setSelectedRating(restaurant.rating || DEFAULT_RATING);
    setSelectedComment(restaurant.comment || DEFAULT_COMMENT);
    homeSearchState.hashtags = new Set(Array.isArray(restaurant.hashtags) ? restaurant.hashtags : []);
    renderSelectedHashtags();
    setSelectedPlaceReadonly(true);

    openSelectedPlace(
      {
        placeId: restaurant.placeId,
        name: restaurant.name,
        address: restaurant.address,
        location: restaurant.location
      },
      {
        resetForm: false,
        updateInput: true
      }
    );
  }

  function normalizeNewPlace(place) {
    const name = place?.displayName?.text || "";
    const address = place?.formattedAddress || "";
    const location = serializeLatLng(place?.location);
    const placeId = place?.id || "";

    if (!name || !placeId) {
      return null;
    }

    return {
      placeId,
      name,
      address,
      location
    };
  }

  function normalizeLegacyPlace(place) {
    const name = String(place?.name || "").trim();
    const address = String(place?.formatted_address || place?.vicinity || "").trim();
    const location = serializeLatLng(place?.geometry?.location);
    const placeId = String(place?.place_id || "").trim();

    if (!name || !placeId) {
      return null;
    }

    return {
      placeId,
      name,
      address,
      location
    };
  }

  async function searchWithNewPlaces(query) {
    if (!homeSearchState.placeClass?.searchByText || !homeSearchState.map) {
      return [];
    }

    const response = await homeSearchState.placeClass.searchByText({
      textQuery: query,
      fields: ["displayName", "formattedAddress", "location", "id"],
      locationBias: homeSearchState.map.getCenter(),
      maxResultCount: 6,
      language: "es"
    });

    return (response?.places || [])
      .map(normalizeNewPlace)
      .filter(Boolean);
  }

  function searchWithLegacyPlaces(query) {
    return new Promise((resolve) => {
      if (!homeSearchState.placesService || !window.google?.maps?.places?.PlacesServiceStatus) {
        resolve([]);
        return;
      }

      homeSearchState.placesService.textSearch(
        {
          query,
          location: homeSearchState.map?.getCenter() || DEFAULT_CENTER,
          radius: 5000
        },
        (results, status) => {
          if (
            status !== window.google.maps.places.PlacesServiceStatus.OK ||
            !Array.isArray(results)
          ) {
            resolve([]);
            return;
          }

          resolve(results.map(normalizeLegacyPlace).filter(Boolean).slice(0, 6));
        }
      );
    });
  }

  async function performSearch(query, currentRequestId) {
    try {
      const trimmedQuery = query.trim();

      if (trimmedQuery.length < 2) {
        clearSearchResults();
        setSearchStatus("Escribe al menos 2 letras para buscar.");
        persistDraft();
        return;
      }

      if (!homeSearchState.googleReady) {
        setSearchStatus("Cargando Google Maps...");
        return;
      }

      resultsContainer?.setAttribute("aria-busy", "true");
      setSearchStatus("Buscando sitios...");

      let results = [];

      try {
        results = await searchWithNewPlaces(trimmedQuery);
      } catch {
        results = [];
      }

      if (results.length === 0) {
        results = await searchWithLegacyPlaces(trimmedQuery);
      }

      if (currentRequestId !== homeSearchState.requestId) {
        return;
      }

      resultsContainer?.removeAttribute("aria-busy");
      homeSearchState.results = results;
      renderSearchResults(results);
      persistDraft();

      if (results.length === 0) {
        setSearchStatus("No encontre sitios con ese nombre.");
        return;
      }

      setSearchStatus("Pulsa un resultado para abrir la ficha.", "muted");
    } catch {
      resultsContainer?.removeAttribute("aria-busy");
      setSearchStatus("No pude completar la busqueda en Google Maps.", "error");
    }
  }

  function scheduleSearch(query) {
    window.clearTimeout(homeSearchState.debounceTimer);
    homeSearchState.requestId += 1;
    const currentRequestId = homeSearchState.requestId;

    homeSearchState.debounceTimer = window.setTimeout(() => {
      performSearch(query, currentRequestId);
    }, 280);
  }

  function focusMapOnUser() {
    if (!navigator.geolocation) {
      centerMap(DEFAULT_CENTER, 14);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        centerMap(
          {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          },
          14
        );
      },
      () => {
        centerMap(DEFAULT_CENTER, 14);
      },
      {
        enableHighAccuracy: true,
        timeout: 6000
      }
    );
  }

  function getInitialMapCenter() {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve(DEFAULT_CENTER);
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        () => {
          resolve(DEFAULT_CENTER);
        },
        {
          enableHighAccuracy: true,
          timeout: 6000,
          maximumAge: 60000
        }
      );
    });
  }

  async function addSelectedPlace() {
    if (!homeSearchState.selectedPlace) {
      setSearchStatus("Primero abre un restaurante de la lista.", "error");
      return;
    }

    const saveTarget = getSaveTarget();

    if (saveTarget === "list" && homeSearchState.selectedRating < 1) {
      setSearchStatus("Elige una puntuacion de 1 a 5 estrellas antes de anadirlo a tu lista.", "error");
      ratingButtons[0]?.focus();
      return;
    }

    const savePayload = {
      name: homeSearchState.selectedPlace.name,
      address: homeSearchState.selectedPlace.address,
      placeId: homeSearchState.selectedPlace.placeId,
      location: serializeLatLng(homeSearchState.selectedPlace.location),
      source: "google-places"
    };
    const saveResult = saveTarget === "list"
      ? await window.SAVORY_DB?.addRestaurant?.({
          ...savePayload,
          price: homeSearchState.selectedPrice,
          rating: homeSearchState.selectedRating,
          comment: homeSearchState.comment,
          hashtags: [...homeSearchState.hashtags],
          visibility: getSaveVisibility()
        })
      : await window.SAVORY_DB?.addDesiredRestaurant?.(savePayload);

    if (!saveResult) {
      setSearchStatus("No pude guardar ese sitio.", "error");
      return;
    }

    if (saveResult.status === "auth-required") {
      setSearchStatus("Inicia sesion para guardar restaurantes en Supabase.", "error");
      return;
    }

    if (saveResult.status === "setup-required") {
      setSearchStatus("Primero tienes que ejecutar el esquema SQL de Supabase.", "error");
      return;
    }

    if (saveResult.status === "added") {
      const addedToLabel = saveTarget === "list" ? "tu lista" : "deseados";
      closeSelectedPlace({ clearInput: true, keepMarker: true });
      clearSearchResults();
      if (saveTarget === "list") {
        renderRestaurantMarkers();
      }
      setSearchStatus(`"${saveResult.restaurant.name}" se anadio a ${addedToLabel}.`);
      return;
    }

    if (saveResult.status === "exists-desired") {
      setSearchStatus(`"${homeSearchState.selectedPlace.name}" ya estaba en deseados.`, "error");
      return;
    }

    if (saveResult.status === "exists-list") {
      setSearchStatus(`"${homeSearchState.selectedPlace.name}" ya estaba en tu lista guardada.`, "error");
      return;
    }

    setSearchStatus("No pude guardar ese sitio.", "error");
  }

  applyDraft();

  priceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setSelectedPrice(button.dataset.placePrice || DEFAULT_PRICE);
    });
  });

  ratingButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setSelectedRating(button.dataset.placeRating || DEFAULT_RATING);
      refreshSelectedPlaceStatus();
    });
  });

  saveTargetButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setSaveTarget(button.dataset.saveTarget || DEFAULT_SAVE_TARGET);
    });
  });

  visibilityButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setSaveVisibility(button.dataset.saveVisibility || "privado");
      persistDraft();
      refreshSelectedPlaceStatus();
    });
  });

  mapVisibilityButtons.forEach((button) => {
    button.addEventListener("click", () => {
      renderRestaurantMarkers();
    });
  });

  selectedHashtags?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-place-hashtag]");

    if (!button) {
      return;
    }

    removeCustomHashtag(button.dataset.removePlaceHashtag || "");
  });

  addHashtagButton?.addEventListener("click", () => {
    addCustomHashtag(hashtagInput?.value || "");
  });

  hashtagInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    addCustomHashtag(hashtagInput.value);
  });

  commentInput?.addEventListener("input", (event) => {
    setSelectedComment(event.target.value || "");
  });

  resultsContainer?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-place-id]");

    if (!button) {
      return;
    }

    const selectedResult = homeSearchState.results.find(
      (result) => result.placeId === button.dataset.placeId
    );

    if (!selectedResult) {
      return;
    }

    openSelectedPlace(selectedResult);
  });

  searchInput?.addEventListener("input", (event) => {
    if (homeSearchState.selectedPlace && event.target.value.trim() !== homeSearchState.selectedPlace.name) {
      closeSelectedPlace({ keepMarker: false });
    }

    persistDraft();
    scheduleSearch(event.target.value);
  });

  searchInput?.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      clearSearchResults();
      closeSelectedPlace({ keepMarker: true });
      setSearchStatus("Busqueda cerrada.");
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      scheduleSearch(searchInput.value);
    }
  });

  closeSheetButton?.addEventListener("click", () => {
    closeSelectedPlace({ keepMarker: true });
    setSearchStatus("Ficha cerrada.");
  });

  cancelSheetButton?.addEventListener("click", () => {
    closeSelectedPlace({ keepMarker: true });
    setSearchStatus("Ficha cerrada.");
  });

  addSelectedPlaceButton?.addEventListener("click", () => {
    addSelectedPlace();
  });

  document.addEventListener("click", (event) => {
    const clickedInsideSearch =
      event.target.closest(".search-row") ||
      event.target.closest("#places-search-results") ||
      event.target.closest("#selected-place-sheet");

    if (!clickedInsideSearch) {
      clearSearchResults();
    }
  });

  window.initSavoryGooglePlacesSearch = async function initSavoryGooglePlacesSearch() {
    if (!mapElement || !searchInput) {
      return;
    }

    try {
      const { Map } = await window.google.maps.importLibrary("maps");
      const { Place } = await window.google.maps.importLibrary("places");
      const initialCenter = await getInitialMapCenter();

      homeSearchState.map = new Map(mapElement, {
        center: initialCenter,
        zoom: 14,
        disableDefaultUI: true,
        zoomControl: true,
        clickableIcons: false,
        gestureHandling: "greedy",
        styles: MAP_MINIMAL_STYLES
      });
      homeSearchState.lastCenter = initialCenter;
      homeSearchState.map.addListener("click", () => {
        homeSearchState.markerInfoWindow?.close();
      });

      homeSearchState.placeClass = Place;
      if (window.google.maps.places?.PlacesService) {
        homeSearchState.placesService = new window.google.maps.places.PlacesService(homeSearchState.map);
      }

      homeSearchState.googleReady = true;
      setSearchStatus("Busca un restaurante y abre su ficha para anadirlo.");
      await window.SAVORY_DB.ready;
      renderRestaurantMarkers();

      if (homeSearchState.selectedPlace) {
        openSelectedPlace(homeSearchState.selectedPlace, { updateInput: false, resetForm: false });
      } else if (searchInput.value.trim().length >= 2) {
        scheduleSearch(searchInput.value);
      }
    } catch {
      setSearchStatus("Google Maps no se pudo iniciar. Revisa la key y las APIs activadas.", "error");
    }
  };

  window.addEventListener("savory:db-change", () => {
    if (homeSearchState.googleReady) {
      renderRestaurantMarkers();
    }
  });
}
