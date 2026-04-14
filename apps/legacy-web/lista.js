const listPage = document.querySelector("[data-list-page]");

if (listPage && window.SAVORY_DB) {
  const filtersPanel = listPage.querySelector("[data-filters-panel]");
  const filtersToggle = listPage.querySelector("#filters-toggle");
  const visibilityButtons = listPage.querySelectorAll("[data-visibility-filter]");
  const priceButtons = listPage.querySelectorAll("[data-price-filter]");
  const ratingButtons = listPage.querySelectorAll("[data-rating-filter]");
  const hashtagFilters = listPage.querySelector("#hashtag-filters");
  const selectedHashtags = listPage.querySelector("#selected-hashtags");
  const hashtagSuggestions = listPage.querySelector("#hashtag-suggestions");
  const hashtagInput = listPage.querySelector("#hashtag-input");
  const addHashtagButton = listPage.querySelector("#add-hashtag-button");
  const resultsCount = listPage.querySelector("#results-count");
  const listFeedback = listPage.querySelector("#list-feedback");
  const listContainer = listPage.querySelector("#restaurants-list");
  const searchInput = listPage.querySelector("#restaurant-search");

  const state = {
    visibility: "todos",
    price: "todos",
    rating: "todos",
    hashtags: new Set(),
    search: ""
  };

  function normalizeText(value) {
    return value
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

  function renderHashtagFilters() {
    const restaurants = window.SAVORY_DB.getRestaurants();
    const allHashtags = [...new Set(restaurants.flatMap((restaurant) => restaurant.hashtags || []))].sort();

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

  function getVisibilityLabel(visibility) {
    return visibility === "privado" ? "Privado" : "Publico";
  }

  function getSubtitle(visibility) {
    return visibility === "privado" ? "Guardado en tu lista privada" : "Guardado en tu lista publica";
  }

  function setFeedback(message, tone = "muted") {
    listFeedback.textContent = message;
    listFeedback.dataset.tone = tone;
  }

  function renderRestaurants() {
    const restaurants = window.SAVORY_DB.getRestaurants();
    const currentUser = window.SAVORY_DB.getCurrentUser();
    const weeklyCount = currentUser
      ? window.SAVORY_DB.getCurrentWeekRecommendationCount(currentUser.id)
      : 0;
    const filteredRestaurants = restaurants.filter((restaurant) => {
      const matchesVisibility =
        state.visibility === "todos" || restaurant.visibility === state.visibility;
      const matchesPrice = state.price === "todos" || restaurant.price === state.price;
      const matchesRating =
        state.rating === "todos" || Number(restaurant.rating) === Number(state.rating);
      const matchesHashtags =
        state.hashtags.size === 0 ||
        [...state.hashtags].every((tag) => restaurant.hashtags.includes(tag));
      const matchesSearch =
        state.search.length === 0 ||
        normalizeText(restaurant.name).includes(normalizeText(state.search));

      return matchesVisibility && matchesPrice && matchesRating && matchesHashtags && matchesSearch;
    });

    resultsCount.textContent = `${filteredRestaurants.length} resultado${filteredRestaurants.length === 1 ? "" : "s"}`;

    if (filteredRestaurants.length === 0) {
      listContainer.innerHTML = `
        <article class="empty-state">
          <h3>No hay restaurantes con esos filtros</h3>
          <p>Prueba otra combinacion de precio, hashtags o nombre.</p>
        </article>
      `;
      return;
    }

    listContainer.innerHTML = filteredRestaurants
      .map((restaurant) => {
        const isPrivate = restaurant.visibility === "privado";
        const isPublished = window.SAVORY_DB.isRestaurantPublishedByCurrentUser(restaurant.id);
        const publishLabel = !currentUser
          ? "Inicia sesion"
          : isPublished
            ? "Publicado"
            : weeklyCount >= 3
              ? "Limite 3/semana"
              : "Publicar";
        const publishToneClass = isPublished
          ? "is-published"
          : !currentUser || weeklyCount >= 3
            ? "is-disabled"
            : "";
        const hashtagsMarkup = restaurant.hashtags
          .map((tag) => `<span class="tag-badge">${escapeHtml(tag)}</span>`)
          .join("");
        const commentMarkup = restaurant.comment
          ? `
            <section class="restaurant-meta-box restaurant-meta-box-full">
              <span class="meta-label">Comentario</span>
              <p class="restaurant-comment">${escapeHtmlWithBreaks(restaurant.comment)}</p>
            </section>
          `
          : "";

        return `
          <article class="restaurant-card">
            <div class="restaurant-card-header">
              <div>
                <h3>${escapeHtml(restaurant.name)}</h3>
                <p class="restaurant-subtitle">${getSubtitle(restaurant.visibility)}</p>
                <p class="restaurant-address">${escapeHtml(restaurant.address || "Sin direccion guardada")}</p>
              </div>
              <span class="scope-pill ${isPrivate ? "is-private" : ""}">${getVisibilityLabel(restaurant.visibility)}</span>
            </div>

            <div class="restaurant-meta-grid">
              <section class="restaurant-meta-box">
                <span class="meta-label">Precio promedio</span>
                <span class="price-badge">${escapeHtml(restaurant.price)}</span>
              </section>

              <section class="restaurant-meta-box">
                <span class="meta-label">Puntuacion</span>
                ${getRatingMarkup(restaurant.rating)}
              </section>

              <section class="restaurant-meta-box">
                <span class="meta-label">Hashtags</span>
                <div class="tag-row">${hashtagsMarkup}</div>
                <div class="restaurant-card-actions">
                  <button
                    class="publish-restaurant-button ${publishToneClass}"
                    type="button"
                    data-publish-restaurant-id="${restaurant.id}"
                    ${!currentUser || isPublished || weeklyCount >= 3 ? "disabled" : ""}
                  >
                    ${publishLabel}
                  </button>
                </div>
              </section>

              ${commentMarkup}
            </div>
          </article>
        `;
      })
      .join("");
  }

  function syncHashtagUI() {
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
    syncHashtagUI();
    renderRestaurants();
  }

  filtersToggle.addEventListener("click", () => {
    const isExpanded = filtersToggle.getAttribute("aria-expanded") === "true";
    filtersToggle.setAttribute("aria-expanded", String(!isExpanded));
    filtersPanel.classList.toggle("is-collapsed", isExpanded);
  });

  visibilityButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.visibility = button.dataset.visibilityFilter || "todos";
      renderRestaurants();
    });
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

    syncHashtagUI();
    renderRestaurants();
  });

  selectedHashtags.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-hashtag]");

    if (!button) {
      return;
    }

    state.hashtags.delete(button.dataset.removeHashtag);
    syncHashtagUI();
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

  searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim();
    renderRestaurants();
  });

  listContainer.addEventListener("click", async (event) => {
    const publishButton = event.target.closest("[data-publish-restaurant-id]");

    if (!publishButton) {
      return;
    }

    const restaurantId = Number(publishButton.dataset.publishRestaurantId);
    const result = await window.SAVORY_DB.publishRecommendation({ restaurantId });

    if (result.status === "auth-required") {
      setFeedback("Inicia sesion para publicar recomendaciones.", "error");
      renderRestaurants();
      return;
    }

    if (result.status === "already-published") {
      setFeedback("Ese restaurante ya esta publicado en recomendaciones.", "success");
      renderRestaurants();
      return;
    }

    if (result.status === "weekly-limit") {
      setFeedback("Ya has publicado 3 recomendaciones esta semana.", "error");
      renderRestaurants();
      return;
    }

    if (result.status === "not-found") {
      setFeedback("No he encontrado ese restaurante en tu lista.", "error");
      return;
    }

    if (result.status === "setup-required") {
      setFeedback("Primero tienes que crear las tablas y policies en Supabase.", "error");
      return;
    }

    setFeedback(`"${result.recommendation.restaurantName}" ya esta publicado.`, "success");
    renderRestaurants();
  });

  window.addEventListener("savory:db-change", () => {
    syncHashtagUI();
    renderRestaurants();
  });

  (async () => {
    await window.SAVORY_DB.ready;
    syncHashtagUI();
    setFeedback("Publica tus restaurantes directamente desde cada tarjeta.");
    renderRestaurants();
  })();
}
