const friendListPage = document.querySelector("[data-friend-list-page]");

if (friendListPage && window.SAVORY_DB) {
  const requestedUserId = new URLSearchParams(window.location.search).get("user");
  const backLink = friendListPage.querySelector("#friend-list-back");
  const filtersPanel = friendListPage.querySelector("[data-filters-panel]");
  const filtersToggle = friendListPage.querySelector("#friend-filters-toggle");
  const titleElement = friendListPage.querySelector("#friend-list-title");
  const copyElement = friendListPage.querySelector("#friend-list-copy");
  const resultsHeading = friendListPage.querySelector("#friend-results-heading");
  const resultsCount = friendListPage.querySelector("#friend-results-count");
  const feedbackElement = friendListPage.querySelector("#friend-list-feedback");
  const listElement = friendListPage.querySelector("#friend-restaurants-list");
  const searchInput = friendListPage.querySelector("#friend-restaurant-search");
  const priceButtons = friendListPage.querySelectorAll("[data-price-filter]");
  const ratingButtons = friendListPage.querySelectorAll("[data-rating-filter]");
  const hashtagFilters = friendListPage.querySelector("#friend-hashtag-filters");
  const selectedHashtags = friendListPage.querySelector("#friend-selected-hashtags");
  const hashtagSuggestions = friendListPage.querySelector("#friend-hashtag-suggestions");
  const hashtagInput = friendListPage.querySelector("#friend-hashtag-input");
  const addHashtagButton = friendListPage.querySelector("#friend-add-hashtag-button");

  const state = {
    viewedUser: null,
    restaurants: [],
    price: "todos",
    rating: "todos",
    hashtags: new Set(),
    search: ""
  };

  function normalizeText(value) {
    return String(value || "")
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "");
  }

  function normalizeHashtag(value) {
    const cleanValue = normalizeText(value).replace(/^#*/, "").replace(/\s+/g, "");

    if (!cleanValue) {
      return "";
    }

    return `#${cleanValue}`;
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function escapeHtmlWithBreaks(value) {
    return escapeHtml(value).replace(/\n/g, "<br>");
  }

  function getRatingMarkup(rating) {
    const normalizedRating = Number(rating);

    if (!Number.isFinite(normalizedRating) || normalizedRating < 1) {
      return '<span class="rating-display rating-display-empty">Sin puntuacion</span>';
    }

    const stars = Array.from({ length: 5 }, (_item, index) =>
      `<span class="rating-star${index < normalizedRating ? " is-filled" : ""}">&#9733;</span>`
    ).join("");

    return `<span class="rating-display" aria-label="${normalizedRating} de 5 estrellas">${stars}</span>`;
  }

  function setFeedback(message = "", tone = "muted") {
    feedbackElement.textContent = message;
    feedbackElement.dataset.tone = tone;
  }

  function renderHashtagFilters() {
    const allHashtags = [...new Set(state.restaurants.flatMap((restaurant) => restaurant.hashtags || []))].sort();

    hashtagFilters.innerHTML = allHashtags
      .map(
        (tag) => `
          <button class="filter-chip ${state.hashtags.has(tag) ? "is-active" : ""}" type="button" data-hashtag-filter="${escapeHtml(tag)}" aria-pressed="${state.hashtags.has(tag)}">
            ${escapeHtml(tag)}
          </button>
        `
      )
      .join("");

    hashtagSuggestions.innerHTML = allHashtags
      .map((tag) => `<option value="${escapeHtml(tag)}"></option>`)
      .join("");
  }

  function renderSelectedHashtags() {
    if (state.hashtags.size === 0) {
      selectedHashtags.innerHTML = "";
      return;
    }

    selectedHashtags.innerHTML = [...state.hashtags]
      .map(
        (tag) => `
          <button class="filter-chip is-active selected-tag-chip" type="button" data-remove-hashtag="${escapeHtml(tag)}">
            <span>${escapeHtml(tag)}</span>
            <span aria-hidden="true">x</span>
          </button>
        `
      )
      .join("");
  }

  function syncHashtagUi() {
    renderHashtagFilters();
    renderSelectedHashtags();
  }

  function addHashtag(tagValue) {
    const normalizedTag = normalizeHashtag(tagValue);

    if (!normalizedTag) {
      return;
    }

    state.hashtags.add(normalizedTag);
    hashtagInput.value = "";
    syncHashtagUi();
    renderRestaurants();
  }

  function renderHeader() {
    if (!requestedUserId) {
      titleElement.textContent = "Lista publica no disponible";
      copyElement.textContent = "Necesito un perfil para poder cargar sus restaurantes publicos.";
      resultsHeading.textContent = "Restaurantes publicos";
      backLink.href = "profile.html";
      return;
    }

    if (!state.viewedUser) {
      titleElement.textContent = "Perfil no encontrado";
      copyElement.textContent = "No he podido encontrar este perfil o ya no esta disponible.";
      resultsHeading.textContent = "Restaurantes publicos";
      backLink.href = "profile.html";
      return;
    }

    titleElement.textContent = `Lista publica de ${state.viewedUser.username}`;
    copyElement.textContent = "Explora todos los restaurantes que esta persona ha compartido de forma publica.";
    resultsHeading.textContent = `Restaurantes publicos de ${state.viewedUser.username}`;
    backLink.href = `profile.html?user=${encodeURIComponent(state.viewedUser.id)}`;
  }

  function renderRestaurants() {
    const filteredRestaurants = state.restaurants.filter((restaurant) => {
      const matchesPrice = state.price === "todos" || restaurant.price === state.price;
      const matchesRating =
        state.rating === "todos" || Number(restaurant.rating) === Number(state.rating);
      const matchesHashtags =
        state.hashtags.size === 0 ||
        [...state.hashtags].every((tag) => (restaurant.hashtags || []).includes(tag));
      const matchesSearch =
        state.search.length === 0 ||
        normalizeText(restaurant.name).includes(normalizeText(state.search));

      return matchesPrice && matchesRating && matchesHashtags && matchesSearch;
    });

    resultsCount.textContent = `${filteredRestaurants.length} resultado${filteredRestaurants.length === 1 ? "" : "s"}`;

    if (!requestedUserId) {
      listElement.innerHTML = `
        <article class="empty-state friend-list-empty-state">
          <h3>Falta el perfil</h3>
          <p>Abre esta pagina desde el perfil de un amigo para ver su lista publica.</p>
        </article>
      `;
      return;
    }

    if (!state.viewedUser) {
      listElement.innerHTML = `
        <article class="empty-state friend-list-empty-state">
          <h3>No he encontrado este perfil</h3>
          <p>Vuelve al perfil principal y prueba con otro usuario.</p>
        </article>
      `;
      return;
    }

    if (filteredRestaurants.length === 0) {
      const emptyMessage = state.restaurants.length === 0
        ? `${state.viewedUser.username} todavia no tiene restaurantes publicos.`
        : "No hay restaurantes publicos con esos filtros.";

      listElement.innerHTML = `
        <article class="empty-state friend-list-empty-state">
          <h3>No hay resultados</h3>
          <p>${escapeHtml(emptyMessage)}</p>
        </article>
      `;
      return;
    }

    listElement.innerHTML = filteredRestaurants
      .map((restaurant) => {
        const hashtagsMarkup = (restaurant.hashtags || []).length > 0
          ? restaurant.hashtags
            .map((tag) => `<span class="tag-badge">${escapeHtml(tag)}</span>`)
            .join("")
          : '<span class="tag-badge tag-badge-muted">Sin hashtags</span>';
        const commentMarkup = restaurant.comment
          ? `
            <section class="restaurant-meta-box restaurant-meta-box-full">
              <span class="meta-label">Comentario</span>
              <p class="restaurant-comment">${escapeHtmlWithBreaks(restaurant.comment)}</p>
            </section>
          `
          : "";

        return `
          <article class="restaurant-card friend-restaurant-card">
            <div class="restaurant-card-header">
              <div>
                <h3>${escapeHtml(restaurant.name)}</h3>
                <p class="restaurant-subtitle">Guardado en su lista publica</p>
                <p class="restaurant-address">${escapeHtml(restaurant.address || "Sin direccion guardada")}</p>
              </div>
              <span class="scope-pill">Publico</span>
            </div>

            <div class="restaurant-meta-grid">
              <section class="restaurant-meta-box">
                <span class="meta-label">Precio promedio</span>
                <span class="price-badge">${escapeHtml(restaurant.price || "€")}</span>
              </section>

              <section class="restaurant-meta-box">
                <span class="meta-label">Puntuacion</span>
                ${getRatingMarkup(restaurant.rating)}
              </section>

              <section class="restaurant-meta-box">
                <span class="meta-label">Hashtags</span>
                <div class="tag-row">${hashtagsMarkup}</div>
              </section>

              ${commentMarkup}
            </div>
          </article>
        `;
      })
      .join("");
  }

  async function loadFriendList() {
    try {
      state.viewedUser = requestedUserId
        ? await window.SAVORY_DB.getUserById(requestedUserId)
        : null;
      state.restaurants = state.viewedUser
        ? await window.SAVORY_DB.getUserRestaurants(state.viewedUser.id, { publicOnly: true })
        : [];
      setFeedback(state.viewedUser ? "Filtra por nombre, precio o hashtags." : "", "muted");
    } catch {
      state.viewedUser = null;
      state.restaurants = [];
      setFeedback("No he podido cargar esta lista publica desde Supabase.", "error");
    }

    renderHeader();
    syncHashtagUi();
    renderRestaurants();
  }

  filtersToggle?.addEventListener("click", () => {
    const isExpanded = filtersToggle.getAttribute("aria-expanded") === "true";
    filtersToggle.setAttribute("aria-expanded", String(!isExpanded));
    filtersPanel?.classList.toggle("is-collapsed", isExpanded);
  });

  priceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextPrice = button.dataset.priceFilter || "todos";

      priceButtons.forEach((priceButton) => {
        const isActive = priceButton === button;
        priceButton.classList.toggle("is-active", isActive);
        priceButton.setAttribute("aria-pressed", String(isActive));
      });

      state.price = nextPrice;
      renderRestaurants();
    });
  });

  ratingButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const nextRating = button.dataset.ratingFilter || "todos";

      ratingButtons.forEach((ratingButton) => {
        const isActive = ratingButton === button;
        ratingButton.classList.toggle("is-active", isActive);
        ratingButton.setAttribute("aria-pressed", String(isActive));
      });

      state.rating = nextRating;
      renderRestaurants();
    });
  });

  searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim();
    renderRestaurants();
  });

  hashtagFilters.addEventListener("click", (event) => {
    const button = event.target.closest("[data-hashtag-filter]");

    if (!button) {
      return;
    }

    const tag = button.dataset.hashtagFilter;

    if (state.hashtags.has(tag)) {
      state.hashtags.delete(tag);
    } else {
      state.hashtags.add(tag);
    }

    syncHashtagUi();
    renderRestaurants();
  });

  selectedHashtags.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-hashtag]");

    if (!button) {
      return;
    }

    state.hashtags.delete(button.dataset.removeHashtag);
    syncHashtagUi();
    renderRestaurants();
  });

  addHashtagButton.addEventListener("click", () => {
    addHashtag(hashtagInput.value);
  });

  hashtagInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    addHashtag(hashtagInput.value);
  });

  window.addEventListener("savory:db-change", () => {
    loadFriendList();
  });

  (async () => {
    await window.SAVORY_DB.ready;
    await loadFriendList();
  })();
}
