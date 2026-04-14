const desiredPage = document.querySelector("[data-desired-page]");

if (desiredPage && window.SAVORY_DB) {
  const filtersPanel = desiredPage.querySelector("[data-filters-panel]");
  const filtersToggle = desiredPage.querySelector("#filters-toggle");
  const priceButtons = desiredPage.querySelectorAll("[data-price-filter]");
  const ratingButtons = desiredPage.querySelectorAll("[data-rating-filter]");
  const hashtagFilters = desiredPage.querySelector("#hashtag-filters");
  const selectedHashtags = desiredPage.querySelector("#selected-hashtags");
  const hashtagSuggestions = desiredPage.querySelector("#desired-hashtag-suggestions");
  const hashtagInput = desiredPage.querySelector("#hashtag-input");
  const addHashtagButton = desiredPage.querySelector("#add-hashtag-button");
  const resultsCount = desiredPage.querySelector("#results-count");
  const listContainer = desiredPage.querySelector("#desired-restaurants-list");
  const searchInput = desiredPage.querySelector("#restaurant-search");
  const visitModal = desiredPage.querySelector("#desired-visit-modal");
  const visitName = desiredPage.querySelector("#desired-visit-name");
  const closeVisitButton = desiredPage.querySelector("#close-desired-visit-button");
  const cancelVisitButton = desiredPage.querySelector("#cancel-desired-visit-button");
  const saveVisitButton = desiredPage.querySelector("#save-desired-visit-button");
  const visitVisibilitySwitch = desiredPage.querySelector("[data-desired-visit-visibility-switch]");
  const visitVisibilityButtons = visitVisibilitySwitch?.querySelectorAll(".switch-option") || [];
  const visitPriceButtons = desiredPage.querySelectorAll("[data-desired-visit-price]");
  const visitRatingButtons = desiredPage.querySelectorAll("[data-desired-visit-rating]");
  const visitPriceGroup = desiredPage.querySelector("#desired-visit-price-group");
  const visitRatingGroup = desiredPage.querySelector("#desired-visit-rating-group");
  const visitHashtagsGroup = desiredPage.querySelector("#desired-visit-hashtags-group");
  const visitCommentGroup = desiredPage.querySelector("#desired-visit-comment-group");
  const visitHashtagInput = desiredPage.querySelector("#desired-visit-hashtag-input");
  const visitAddHashtagButton = desiredPage.querySelector("#desired-visit-add-hashtag-button");
  const visitSelectedHashtags = desiredPage.querySelector("#desired-visit-selected-hashtags");
  const visitCommentInput = desiredPage.querySelector("#desired-visit-comment-input");

  const state = {
    price: "todos",
    rating: "todos",
    hashtags: new Set(),
    search: "",
    visitRestaurantId: null,
    visitNeedsDetails: false,
    visitVisibility: "privado",
    visitPrice: "\u20ac",
    visitRating: 0,
    visitComment: "",
    visitHashtags: new Set()
  };

  function setVisitModalOpen(isOpen) {
    document.body.classList.toggle("is-modal-open", Boolean(isOpen));
  }

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

  function getDesiredRestaurants() {
    return window.SAVORY_DB.getDesiredRestaurants();
  }

  function isOwnSelection(restaurant) {
    return restaurant.source === "google-places" &&
      !restaurant.price &&
      !restaurant.rating &&
      !restaurant.comment &&
      (!Array.isArray(restaurant.hashtags) || restaurant.hashtags.length === 0);
  }

  function renderHashtagFilters() {
    const restaurants = getDesiredRestaurants();
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

  function setVisitPrice(price) {
    state.visitPrice = price === "\u20ac\u20ac" || price === "\u20ac\u20ac\u20ac" ? price : "\u20ac";

    visitPriceButtons.forEach((button) => {
      const isActive = button.dataset.desiredVisitPrice === state.visitPrice;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function setVisitRating(rating) {
    state.visitRating = Number(rating) >= 1 && Number(rating) <= 5 ? Number(rating) : 0;

    visitRatingButtons.forEach((button) => {
      const buttonRating = Number(button.dataset.desiredVisitRating);
      const isActive = buttonRating <= state.visitRating && state.visitRating > 0;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(buttonRating === state.visitRating));
    });
  }

  function setVisitVisibility(visibility) {
    state.visitVisibility = visibility === "publico" ? "publico" : "privado";

    visitVisibilityButtons.forEach((button, index) => {
      const isActive = button.dataset.desiredVisitVisibility === state.visitVisibility;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));

      if (isActive && visitVisibilitySwitch) {
        visitVisibilitySwitch.dataset.activeIndex = String(index);
      }
    });
  }

  function syncVisitDetailUI() {
    if (visitPriceGroup) {
      visitPriceGroup.hidden = !state.visitNeedsDetails;
    }

    if (visitRatingGroup) {
      visitRatingGroup.hidden = !state.visitNeedsDetails;
    }

    if (visitHashtagsGroup) {
      visitHashtagsGroup.hidden = !state.visitNeedsDetails;
    }

    if (visitCommentGroup) {
      visitCommentGroup.hidden = !state.visitNeedsDetails;
    }
  }

  function renderVisitSelectedHashtags() {
    if (state.visitHashtags.size === 0) {
      visitSelectedHashtags.innerHTML = "";
      return;
    }

    visitSelectedHashtags.innerHTML = [...state.visitHashtags]
      .map(
        (tag) => `
          <button class="filter-chip is-active selected-tag-chip" type="button" data-remove-visit-hashtag="${escapeHtml(tag)}">
            <span>${escapeHtml(tag)}</span>
            <span aria-hidden="true">x</span>
          </button>
        `
      )
      .join("");
  }

  function addVisitHashtag(value) {
    const normalizedTag = normalizeHashtag(value);

    if (!normalizedTag) {
      return;
    }

    state.visitHashtags.add(normalizedTag);
    if (visitHashtagInput) {
      visitHashtagInput.value = "";
    }

    renderVisitSelectedHashtags();
  }

  function closeVisitSheet() {
    state.visitRestaurantId = null;
    state.visitNeedsDetails = false;
    state.visitVisibility = "privado";
    state.visitPrice = "\u20ac";
    state.visitRating = 0;
    state.visitComment = "";
    state.visitHashtags = new Set();
    setVisitVisibility("privado");
    setVisitRating(0);
    if (visitCommentInput) {
      visitCommentInput.value = "";
    }
    syncVisitDetailUI();
    renderVisitSelectedHashtags();

    if (visitModal) {
      visitModal.hidden = true;
    }

    setVisitModalOpen(false);
  }

  function openVisitSheet(restaurantId) {
    const restaurant = getDesiredRestaurants().find((item) => Number(item.id) === Number(restaurantId));

    if (!restaurant) {
      return;
    }

    state.visitRestaurantId = restaurant.id;
    state.visitNeedsDetails = true;
    state.visitVisibility = restaurant.visibility === "publico" ? "publico" : "privado";
    state.visitPrice = restaurant.price || "\u20ac";
    state.visitRating = Number(restaurant.rating) || 0;
    state.visitComment = String(restaurant.comment || "");
    state.visitHashtags = new Set(Array.isArray(restaurant.hashtags) ? restaurant.hashtags : []);
    setVisitVisibility(state.visitVisibility);
    setVisitPrice(state.visitPrice);
    setVisitRating(state.visitRating);
    if (visitCommentInput) {
      visitCommentInput.value = state.visitComment;
    }
    syncVisitDetailUI();
    renderVisitSelectedHashtags();

    if (visitName) {
      visitName.textContent = restaurant.name;
    }

    if (visitModal) {
      visitModal.hidden = false;
    }

    setVisitModalOpen(true);
  }

  function renderDesiredRestaurants() {
    const restaurants = getDesiredRestaurants();
    const filteredRestaurants = restaurants.filter((restaurant) => {
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

    resultsCount.textContent = `${filteredRestaurants.length} deseado${filteredRestaurants.length === 1 ? "" : "s"}`;

    if (filteredRestaurants.length === 0) {
      listContainer.innerHTML = `
        <article class="empty-state desired-empty-state">
          <h3>No tienes sitios pendientes con esos filtros</h3>
          <p>Marca alguno como visitado o prueba otra combinacion.</p>
        </article>
      `;
      return;
    }

    listContainer.innerHTML = filteredRestaurants
      .map((restaurant) => {
        const commentMarkup = restaurant.comment
          ? `
            <section class="restaurant-meta-box restaurant-meta-box-full">
              <span class="meta-label">Comentario</span>
              <p class="restaurant-comment">${escapeHtmlWithBreaks(restaurant.comment)}</p>
            </section>
          `
          : "";
        const selectionMarkup = isOwnSelection(restaurant)
          ? `
            <section class="restaurant-meta-box desired-selection-box desired-selection-box-full">
              <span class="meta-label">Datos</span>
              <p class="desired-selection-copy">Seleccion propia</p>
              <p class="desired-selection-hint">Elegiras precio, puntuacion, hashtags y comentario cuando marques "Ya he ido".</p>
            </section>
          `
          : `
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
              <div class="tag-row">${(restaurant.hashtags || []).map((tag) => `<span class="tag-badge">${escapeHtml(tag)}</span>`).join("")}</div>
            </section>

            ${commentMarkup}
          `;

        return `
          <article class="restaurant-card desired-card">
            <div class="restaurant-card-header">
              <div>
                <h3>${escapeHtml(restaurant.name)}</h3>
                <p class="restaurant-address">${escapeHtml(restaurant.address || "Sin direccion guardada")}</p>
              </div>
            </div>

            <div class="restaurant-meta-grid desired-meta-grid ${isOwnSelection(restaurant) ? "desired-meta-grid-single" : ""}">
              ${selectionMarkup}
            </div>

            <div class="desired-actions">
              <button class="action-button action-button-success" type="button" data-complete-id="${restaurant.id}">
                <span aria-hidden="true">+</span>
                <span>Ya he ido</span>
              </button>
              <button class="action-button action-button-danger" type="button" data-remove-id="${restaurant.id}">
                <span aria-hidden="true">x</span>
                <span>Eliminar</span>
              </button>
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
    renderDesiredRestaurants();
  }

  filtersToggle.addEventListener("click", () => {
    const isExpanded = filtersToggle.getAttribute("aria-expanded") === "true";
    filtersToggle.setAttribute("aria-expanded", String(!isExpanded));
    filtersPanel.classList.toggle("is-collapsed", isExpanded);
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
      renderDesiredRestaurants();
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
      renderDesiredRestaurants();
    });
  });

  visitPriceButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setVisitPrice(button.dataset.desiredVisitPrice || "\u20ac");
    });
  });

  visitRatingButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setVisitRating(button.dataset.desiredVisitRating || 0);
    });
  });

  visitVisibilityButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setVisitVisibility(button.dataset.desiredVisitVisibility || "privado");
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
    renderDesiredRestaurants();
  });

  selectedHashtags.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-hashtag]");

    if (!button) {
      return;
    }

    state.hashtags.delete(button.dataset.removeHashtag);
    syncHashtagUI();
    renderDesiredRestaurants();
  });

  visitSelectedHashtags?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-remove-visit-hashtag]");

    if (!button) {
      return;
    }

    state.visitHashtags.delete(button.dataset.removeVisitHashtag);
    renderVisitSelectedHashtags();
  });

  addHashtagButton.addEventListener("click", () => {
    addHashtag(hashtagInput.value);
  });

  visitAddHashtagButton?.addEventListener("click", () => {
    addVisitHashtag(visitHashtagInput?.value || "");
  });

  hashtagInput.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    addHashtag(hashtagInput.value);
  });

  visitHashtagInput?.addEventListener("keydown", (event) => {
    if (event.key !== "Enter") {
      return;
    }

    event.preventDefault();
    addVisitHashtag(visitHashtagInput.value);
  });

  visitCommentInput?.addEventListener("input", (event) => {
    state.visitComment = String(event.target.value || "").slice(0, 280);
  });

  searchInput.addEventListener("input", (event) => {
    state.search = event.target.value.trim();
    renderDesiredRestaurants();
  });

  closeVisitButton?.addEventListener("click", closeVisitSheet);
  cancelVisitButton?.addEventListener("click", closeVisitSheet);
  visitModal?.addEventListener("click", (event) => {
    if (event.target === visitModal) {
      closeVisitSheet();
    }
  });

  saveVisitButton?.addEventListener("click", async () => {
    if (!state.visitRestaurantId) {
      return;
    }

    if (state.visitRating < 1) {
      visitRatingButtons[0]?.focus();
      return;
    }

    const result = await window.SAVORY_DB.completeDesiredRestaurant(state.visitRestaurantId, {
      visibility: state.visitVisibility,
      price: state.visitPrice,
      rating: state.visitRating,
      comment: state.visitComment,
      hashtags: [...state.visitHashtags]
    });

    if (result.status === "completed" || result.status === "exists-list") {
      closeVisitSheet();
      syncHashtagUI();
      renderDesiredRestaurants();
    }
  });

  listContainer.addEventListener("click", async (event) => {
    const completeButton = event.target.closest("[data-complete-id]");
    const removeButton = event.target.closest("[data-remove-id]");

    if (completeButton) {
      const restaurantId = Number(completeButton.dataset.completeId);
      const restaurant = getDesiredRestaurants().find((item) => Number(item.id) === restaurantId);

      if (!restaurant) {
        return;
      }

      openVisitSheet(restaurantId);
      return;
    }

    if (removeButton) {
      await window.SAVORY_DB.removeDesiredRestaurant(Number(removeButton.dataset.removeId));
      if (Number(removeButton.dataset.removeId) === Number(state.visitRestaurantId)) {
        closeVisitSheet();
      }
      syncHashtagUI();
      renderDesiredRestaurants();
    }
  });

  window.addEventListener("savory:db-change", () => {
    syncHashtagUI();
    renderDesiredRestaurants();
  });

  (async () => {
    await window.SAVORY_DB.ready;
    syncHashtagUI();
    renderDesiredRestaurants();
  })();
}
