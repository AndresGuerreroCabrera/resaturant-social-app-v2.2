const profilePage = document.querySelector("[data-profile-page]");

if (profilePage && window.SAVORY_DB) {
  const requestedUserId = new URLSearchParams(window.location.search).get("user");
  const avatarElement = profilePage.querySelector("#profile-avatar");
  const backLink = profilePage.querySelector("#profile-back-link");
  const kickerElement = profilePage.querySelector("#profile-kicker");
  const nameElement = profilePage.querySelector("#profile-name");
  const noteElement = profilePage.querySelector("#profile-note");
  const sessionLink = profilePage.querySelector("#profile-session-link");
  const addFriendButton = profilePage.querySelector("#profile-add-friend-button");
  const expertiseTitle = profilePage.querySelector("#profile-expertise-title");
  const expertiseCopy = profilePage.querySelector("#profile-expertise-copy");
  const expertiseRating = profilePage.querySelector("#profile-expertise-rating");
  const expertiseLikes = profilePage.querySelector("#profile-expertise-likes");
  const expertiseProgress = profilePage.querySelector("#profile-expertise-progress");
  const expertiseNext = profilePage.querySelector("#profile-expertise-next");
  const restaurantsTitle = profilePage.querySelector("#profile-restaurants-title");
  const listLink = profilePage.querySelector("#profile-list-link");
  const restaurantsList = profilePage.querySelector("#profile-restaurants-list");
  const friendsTitle = profilePage.querySelector("#profile-friends-title");
  const friendsSection = profilePage.querySelector("#profile-friends-section");
  const searchToggle = profilePage.querySelector("#profile-search-toggle");
  const searchSection = profilePage.querySelector("#profile-friends-search");
  const searchInput = profilePage.querySelector("#profile-friend-search-input");
  const searchButton = profilePage.querySelector("#profile-friend-search-button");
  const friendsFeedback = profilePage.querySelector("#profile-friends-feedback");
  const searchResults = profilePage.querySelector("#profile-search-results");
  const friendsGrid = profilePage.querySelector("#profile-friends-grid");

  const state = {
    searchOpen: false,
    searchQuery: "",
    currentUser: null,
    viewedUser: null,
    viewedRestaurants: [],
    viewedFriends: [],
    searchMatches: []
  };

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function setFriendsFeedback(message = "", tone = "muted") {
    friendsFeedback.textContent = message;
    friendsFeedback.dataset.tone = tone;
  }

  function getProfileContext() {
    const isOwnProfile = requestedUserId
      ? Boolean(state.currentUser && String(state.currentUser.id) === String(requestedUserId))
      : true;
    const viewedUser = isOwnProfile ? state.currentUser : state.viewedUser;

    return {
      currentUser: state.currentUser,
      viewedUser,
      isOwnProfile,
      isGuestOwnProfile: isOwnProfile && !viewedUser,
      isMissingProfile: Boolean(requestedUserId) && !isOwnProfile && !viewedUser
    };
  }

  function renderHero(context) {
    const viewedUser = context.viewedUser;
    const isFriendProfile = Boolean(viewedUser && !context.isOwnProfile);
    const isAlreadyFriend = Boolean(
      context.currentUser &&
      viewedUser &&
      window.SAVORY_DB.areUsersFriends(context.currentUser.id, viewedUser.id)
    );

    avatarElement.dataset.avatarStyle = viewedUser?.avatar || "chef";

    if (context.isMissingProfile) {
      kickerElement.textContent = "Perfil";
      nameElement.textContent = "Perfil no encontrado";
      noteElement.textContent = "Ese usuario ya no existe o no se pudo cargar.";
      sessionLink.hidden = false;
      sessionLink.textContent = "Volver al acceso";
      addFriendButton.hidden = true;
      return;
    }

    if (context.isGuestOwnProfile) {
      kickerElement.textContent = "Tu perfil";
      nameElement.textContent = "Invitado";
      noteElement.textContent = "Inicia sesion para guardar amigos, ver tu expertise y seguir tus visitas.";
      sessionLink.hidden = false;
      sessionLink.textContent = "Log in / Sign Up";
      addFriendButton.hidden = true;
      return;
    }

    kickerElement.textContent = isFriendProfile ? "Perfil de amigo" : "Tu perfil";
    nameElement.textContent = viewedUser.username;
    noteElement.textContent = isFriendProfile
      ? "Solo se muestran sus ultimos restaurantes publicos y su expertise actual."
      : "Tu expertise sube cuando otras personas guardan tus recomendaciones.";

    sessionLink.hidden = isFriendProfile;
    sessionLink.textContent = context.isOwnProfile ? "Gestionar cuenta" : "Log in / Sign Up";

    addFriendButton.hidden = !isFriendProfile || !context.currentUser;
    addFriendButton.disabled = isAlreadyFriend;
    addFriendButton.textContent = isAlreadyFriend ? "Ya es tu amigo" : "Anadir amigo";
  }

  function renderExpertise(context) {
    const summary = window.SAVORY_DB.getExpertiseSummary(context.viewedUser || null);

    expertiseTitle.textContent = `Nivel ${summary.level} · ${summary.label}`;
    expertiseRating.textContent = String(summary.rating);
    expertiseLikes.textContent = String(summary.acceptedCount);
    expertiseProgress.style.width = `${Math.round(summary.progress * 100)}%`;

    if (context.isGuestOwnProfile) {
      expertiseCopy.textContent = "Cuando crees una cuenta, empezarás aquí y subirás con tus recomendaciones.";
      expertiseNext.textContent = "Tu nivel inicial sera expertise basico.";
      return;
    }

    expertiseCopy.textContent = context.isOwnProfile
      ? "Cada swipe a la derecha en tus recomendaciones suma expertise segun una logica tipo ELO."
      : "Este nivel sube cuando otras personas guardan sus recomendaciones.";

    expertiseNext.textContent = summary.nextLevel
      ? `Te faltan ${Math.max(0, summary.nextLevel.minRating - summary.rating)} puntos para nivel ${summary.nextLevel.level}.`
      : "Ya has alcanzado el nivel mas alto.";
  }

  function renderRestaurants(context) {
    const restaurants = state.viewedRestaurants;

    restaurantsTitle.textContent = context.isOwnProfile
      ? "Tus ultimos restaurantes visitados"
      : `Ultimos restaurantes publicos de ${context.viewedUser?.username || "este perfil"}`;

    if (context.isMissingProfile || context.isGuestOwnProfile || !context.viewedUser) {
      listLink.hidden = true;
    } else if (context.isOwnProfile) {
      listLink.hidden = false;
      listLink.textContent = "Ir a mi lista";
      listLink.href = "lista.html";
    } else {
      listLink.hidden = false;
      listLink.textContent = "Ir a la lista";
      listLink.href = `friend-list.html?user=${encodeURIComponent(context.viewedUser.id)}`;
    }

    if (context.isMissingProfile) {
      restaurantsList.innerHTML = `
        <article class="empty-state profile-empty-state">
          <h3>No he encontrado este perfil</h3>
          <p>Prueba a volver al perfil principal o a buscar otro usuario.</p>
        </article>
      `;
      return;
    }

    if (context.isGuestOwnProfile) {
      restaurantsList.innerHTML = `
        <article class="empty-state profile-empty-state">
          <h3>Aun no tienes historial</h3>
          <p>En cuanto entres con tu cuenta, aqui veras tus ultimos restaurantes visitados.</p>
        </article>
      `;
      return;
    }

    if (restaurants.length === 0) {
      restaurantsList.innerHTML = `
        <article class="empty-state profile-empty-state">
          <h3>${context.isOwnProfile ? "Todavia no has guardado visitas" : "Todavia no tiene restaurantes publicos"}</h3>
          <p>${context.isOwnProfile ? "Cuando marques restaurantes como visitados, apareceran aqui." : "Cuando comparta visitas publicas, apareceran aqui."}</p>
        </article>
      `;
      return;
    }

    restaurantsList.innerHTML = restaurants
      .map((restaurant) => {
        const hashtagsMarkup = (restaurant.hashtags || []).length > 0
          ? (restaurant.hashtags || [])
            .map((tag) => `<span class="tag-badge">${escapeHtml(tag)}</span>`)
            .join("")
          : '<span class="tag-badge tag-badge-muted">Sin hashtags</span>';

        return `
          <article class="profile-restaurant-card">
            <div class="profile-restaurant-card-top">
              <div>
                <h3>${escapeHtml(restaurant.name)}</h3>
                <p class="restaurant-address">${escapeHtml(restaurant.address || "Sin direccion guardada")}</p>
              </div>
              <span class="price-badge">${escapeHtml(restaurant.price || "€")}</span>
            </div>

            <div class="tag-row">${hashtagsMarkup}</div>
          </article>
        `;
      })
      .join("");
  }

  function renderFriendsGrid(context) {
    if (context.isMissingProfile) {
      friendsTitle.textContent = "Amigos";
      friendsGrid.innerHTML = "";
      return;
    }

    friendsTitle.textContent = context.isOwnProfile
      ? "Tu circulo foodie"
      : `Amigos de ${context.viewedUser?.username || "este perfil"}`;

    if (!context.viewedUser) {
      friendsGrid.innerHTML = `
        <article class="empty-state profile-empty-state">
          <h3>Tu red saldra aqui</h3>
          <p>Busca perfiles por nombre y ve anadiendo amigos cuando quieras.</p>
        </article>
      `;
      return;
    }

    if (state.viewedFriends.length === 0) {
      friendsGrid.innerHTML = `
        <article class="empty-state profile-empty-state">
          <h3>${context.isOwnProfile ? "Todavia no tienes amigos anadidos" : "Todavia no tiene amigos visibles"}</h3>
          <p>${context.isOwnProfile ? "Usa el buscador para encontrar perfiles por nombre." : "Cuando este perfil anada amigos, apareceran aqui."}</p>
        </article>
      `;
      return;
    }

    friendsGrid.innerHTML = state.viewedFriends
      .map((friend) => `
        <a class="profile-friend-card" href="profile.html?user=${friend.id}" aria-label="Ver el perfil de ${escapeHtml(friend.username)}">
          <span class="avatar-badge profile-friend-avatar" data-avatar-style="${escapeHtml(friend.avatar || "chef")}" aria-hidden="true"></span>
          <span class="profile-friend-name">${escapeHtml(friend.username)}</span>
        </a>
      `)
      .join("");
  }

  function renderSearchResults(context) {
    const canSearch = context.isOwnProfile && Boolean(context.currentUser);

    if (!canSearch || !state.searchOpen) {
      searchResults.hidden = true;
      searchResults.innerHTML = "";
      return;
    }

    if (!state.searchQuery) {
      searchResults.hidden = true;
      searchResults.innerHTML = "";
      return;
    }

    searchResults.hidden = false;

    if (state.searchMatches.length === 0) {
      searchResults.innerHTML = `
        <article class="empty-state profile-empty-state profile-search-empty">
          <h3>No he encontrado ningun perfil</h3>
          <p>Prueba con otro nombre de usuario.</p>
        </article>
      `;
      return;
    }

    searchResults.innerHTML = state.searchMatches
      .map((user) => {
        const isFriend = window.SAVORY_DB.areUsersFriends(context.currentUser.id, user.id);

        return `
          <article class="profile-search-card">
            <div class="profile-search-card-user">
              <span class="avatar-badge profile-search-avatar" data-avatar-style="${escapeHtml(user.avatar || "chef")}" aria-hidden="true"></span>
              <div>
                <strong>${escapeHtml(user.username)}</strong>
                <p>${isFriend ? "Ya forma parte de tus amigos" : "Puedes ver su perfil o anadirlo"}</p>
              </div>
            </div>

            <div class="profile-search-card-actions">
              <a class="profile-inline-chip" href="profile.html?user=${user.id}">Ver perfil</a>
              <button
                class="profile-inline-chip profile-inline-chip-primary"
                type="button"
                data-add-friend-id="${user.id}"
                ${isFriend ? "disabled" : ""}
              >
                ${isFriend ? "Amigo" : "Anadir"}
              </button>
            </div>
          </article>
        `;
      })
      .join("");
  }

  function renderSearchUI(context) {
    const canSearch = context.isOwnProfile && Boolean(context.currentUser);

    searchToggle.hidden = !canSearch;
    searchSection.hidden = !canSearch || !state.searchOpen;
    searchToggle.textContent = state.searchOpen ? "Cerrar buscador" : "Buscar amigos";

    if (!canSearch) {
      state.searchOpen = false;
      state.searchQuery = "";
      state.searchMatches = [];
      if (searchInput) {
        searchInput.value = "";
      }
      renderSearchResults(context);
    }
  }

  function renderProfile() {
    const context = getProfileContext();
    const isFriendProfile = Boolean(context.viewedUser && !context.isOwnProfile);

    if (backLink) {
      backLink.hidden = !isFriendProfile;
      backLink.href = "profile.html";
    }

    if (friendsSection) {
      friendsSection.hidden = !context.isOwnProfile;
    }

    renderHero(context);
    renderExpertise(context);
    renderRestaurants(context);
    renderFriendsGrid(context);
    renderSearchUI(context);
    renderSearchResults(context);
  }

  async function loadProfileData() {
    try {
      state.currentUser = window.SAVORY_DB.getCurrentUser();

      if (state.currentUser) {
        await window.SAVORY_DB.getUserFriends(state.currentUser.id);
      }

      const isOwnProfile = requestedUserId
        ? Boolean(state.currentUser && String(state.currentUser.id) === String(requestedUserId))
        : true;

      if (isOwnProfile) {
        state.viewedUser = state.currentUser;
        state.viewedRestaurants = state.currentUser
          ? await window.SAVORY_DB.getUserRestaurants(state.currentUser.id, {
            publicOnly: false,
            limit: 3
          })
          : [];
        state.viewedFriends = state.currentUser
          ? await window.SAVORY_DB.getUserFriends(state.currentUser.id)
          : [];
        renderProfile();
        return;
      }

      state.viewedUser = await window.SAVORY_DB.getUserById(requestedUserId);
      state.viewedRestaurants = state.viewedUser
        ? await window.SAVORY_DB.getUserRestaurants(state.viewedUser.id, {
          publicOnly: true,
          limit: 3
        })
        : [];
      state.viewedFriends = state.viewedUser
        ? await window.SAVORY_DB.getUserFriends(state.viewedUser.id)
        : [];
    } catch {
      state.viewedUser = null;
      state.viewedRestaurants = [];
      state.viewedFriends = [];
      setFriendsFeedback("No he podido cargar el perfil desde Supabase.", "error");
    }

    renderProfile();
  }

  async function runSearch() {
    state.searchQuery = searchInput.value.trim();

    if (!state.searchQuery) {
      state.searchMatches = [];
      renderProfile();
      return;
    }

    try {
      state.searchMatches = await window.SAVORY_DB.searchUsersByUsername(state.searchQuery, {
        excludeUserId: state.currentUser?.id,
        limit: 8
      });
    } catch {
      state.searchMatches = [];
      setFriendsFeedback("No he podido buscar perfiles en Supabase.", "error");
    }
    renderProfile();
  }

  addFriendButton?.addEventListener("click", async () => {
    const context = getProfileContext();

    if (!context.viewedUser) {
      return;
    }

    const result = await window.SAVORY_DB.addFriend(context.viewedUser.id);

    if (result.status === "auth-required") {
      setFriendsFeedback("Inicia sesion para poder anadir amigos.", "error");
      return;
    }

    if (result.status === "already-friends") {
      setFriendsFeedback(`${result.friend.username} ya esta en tus amigos.`, "success");
      await loadProfileData();
      return;
    }

    if (result.status === "setup-required") {
      setFriendsFeedback("Primero tienes que crear la tabla de friends en Supabase.", "error");
      return;
    }

    if (result.status === "added") {
      setFriendsFeedback(`${result.friend.username} ya forma parte de tus amigos.`, "success");
      await loadProfileData();
    }
  });

  searchToggle?.addEventListener("click", () => {
    state.searchOpen = !state.searchOpen;

    if (!state.searchOpen) {
      state.searchQuery = "";
      state.searchMatches = [];
      searchInput.value = "";
      setFriendsFeedback("");
    }

    renderProfile();

    if (state.searchOpen) {
      searchInput.focus();
    }
  });

  searchButton?.addEventListener("click", () => {
    runSearch();
  });

  searchInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    runSearch();
  });

  searchResults?.addEventListener("click", async (event) => {
    const addFriendTarget = event.target.closest("[data-add-friend-id]");

    if (!addFriendTarget) {
      return;
    }

    const friendId = addFriendTarget.dataset.addFriendId;
    const result = await window.SAVORY_DB.addFriend(friendId);

    if (result.status === "added") {
      setFriendsFeedback(`${result.friend.username} ya forma parte de tus amigos.`, "success");
    } else if (result.status === "already-friends") {
      setFriendsFeedback(`${result.friend.username} ya estaba en tus amigos.`, "success");
    } else if (result.status === "auth-required") {
      setFriendsFeedback("Inicia sesion para poder anadir amigos.", "error");
    }

    await loadProfileData();

    if (state.searchQuery) {
      state.searchMatches = await window.SAVORY_DB.searchUsersByUsername(state.searchQuery, {
        excludeUserId: state.currentUser?.id,
        limit: 8
      });
      renderProfile();
    }
  });

  window.addEventListener("savory:db-change", () => {
    loadProfileData();
  });

  (async () => {
    await window.SAVORY_DB.ready;
    await loadProfileData();
  })();
}
