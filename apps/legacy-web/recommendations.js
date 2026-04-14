const recommendationsPage = document.querySelector("[data-recommendations-page]");

if (recommendationsPage && window.SAVORY_DB) {
  const stackCount = recommendationsPage.querySelector("#recommendation-stack-count");
  const emptyState = recommendationsPage.querySelector("#recommendation-empty");
  const card = recommendationsPage.querySelector("#recommendation-card");
  const restaurantName = recommendationsPage.querySelector("#recommendation-restaurant-name");
  const ownerName = recommendationsPage.querySelector("#recommendation-owner-name");
  const address = recommendationsPage.querySelector("#recommendation-address");
  const price = recommendationsPage.querySelector("#recommendation-price");
  const rating = recommendationsPage.querySelector("#recommendation-rating");
  const hashtags = recommendationsPage.querySelector("#recommendation-hashtags");
  const commentBox = recommendationsPage.querySelector("#recommendation-comment-box");
  const comment = recommendationsPage.querySelector("#recommendation-comment");
  const likeIndicator = recommendationsPage.querySelector(".swipe-like");
  const nopeIndicator = recommendationsPage.querySelector(".swipe-nope");

  const state = {
    recommendations: [],
    currentRecommendation: null,
    dragPointerId: null,
    dragStartX: 0,
    dragCurrentX: 0,
    isDragging: false
  };

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

  function getRatingMarkup(ratingValue) {
    const normalizedRating = Number(ratingValue);

    if (!Number.isFinite(normalizedRating) || normalizedRating < 1) {
      return "Sin puntuacion";
    }

    return Array.from({ length: 5 }, (_item, index) => (
      index < normalizedRating ? "\u2605" : "\u2606"
    )).join("");
  }

  function loadRecommendations() {
    state.recommendations = window.SAVORY_DB.getVisibleRecommendations();
    state.currentRecommendation = state.recommendations[0] || null;
  }

  function resetCardTransform() {
    card.style.transform = "";
    card.style.opacity = "";
    card.dataset.swipe = "";
    likeIndicator.style.opacity = "0";
    nopeIndicator.style.opacity = "0";
  }

  function renderRecommendationCard() {
    loadRecommendations();
    stackCount.textContent = `${state.recommendations.length} recomendacion${state.recommendations.length === 1 ? "" : "es"}`;

    if (!state.currentRecommendation) {
      card.hidden = true;
      emptyState.hidden = false;
      return;
    }

    emptyState.hidden = true;
    card.hidden = false;
    restaurantName.textContent = state.currentRecommendation.restaurantName;
    ownerName.textContent = `@${state.currentRecommendation.ownerUsername}`;
    address.textContent = state.currentRecommendation.address || "Sin direccion guardada";
    price.textContent = state.currentRecommendation.price;
    if (rating) {
      rating.textContent = getRatingMarkup(state.currentRecommendation.rating);
      rating.setAttribute(
        "aria-label",
        state.currentRecommendation.rating
          ? `${state.currentRecommendation.rating} de 5 estrellas`
          : "Sin puntuacion"
      );
    }
    hashtags.innerHTML = state.currentRecommendation.hashtags
      .map((tag) => `<span class="tag-badge">${escapeHtml(tag)}</span>`)
      .join("");
    if (commentBox && comment) {
      const hasComment = Boolean(state.currentRecommendation.comment);
      commentBox.hidden = !hasComment;
      comment.innerHTML = hasComment ? escapeHtmlWithBreaks(state.currentRecommendation.comment) : "";
    }

    resetCardTransform();
  }

  function updateCardTransform(deltaX) {
    const rotation = deltaX / 20;
    const opacity = Math.max(0.72, 1 - Math.abs(deltaX) / 420);
    const indicatorOpacity = Math.min(1, Math.abs(deltaX) / 110);

    card.style.transform = `translateX(${deltaX}px) rotate(${rotation}deg)`;
    card.style.opacity = String(opacity);
    card.dataset.swipe = deltaX > 0 ? "right" : "left";
    likeIndicator.style.opacity = deltaX > 0 ? String(indicatorOpacity) : "0";
    nopeIndicator.style.opacity = deltaX < 0 ? String(indicatorOpacity) : "0";
  }

  async function commitSwipe(direction) {
    if (!state.currentRecommendation) {
      return;
    }

    const recommendationId = state.currentRecommendation.id;
    card.classList.add("is-committing");
    card.style.transform = direction === "right"
      ? "translateX(140%) rotate(22deg)"
      : "translateX(-140%) rotate(-22deg)";
    card.style.opacity = "0";

    window.setTimeout(async () => {
      card.classList.remove("is-committing");

      if (direction === "right") {
        await window.SAVORY_DB.acceptRecommendation(recommendationId);
      } else {
        await window.SAVORY_DB.rejectRecommendation(recommendationId);
      }

      renderRecommendationCard();
    }, 220);
  }

  function releaseDrag() {
    const deltaX = state.dragCurrentX - state.dragStartX;
    const threshold = 110;

    if (Math.abs(deltaX) >= threshold) {
      commitSwipe(deltaX > 0 ? "right" : "left");
    } else {
      resetCardTransform();
    }

    state.dragPointerId = null;
    state.isDragging = false;
    state.dragStartX = 0;
    state.dragCurrentX = 0;
  }

  card?.addEventListener("pointerdown", (event) => {
    if (!state.currentRecommendation) {
      return;
    }

    state.dragPointerId = event.pointerId;
    state.dragStartX = event.clientX;
    state.dragCurrentX = event.clientX;
    state.isDragging = true;
    card.setPointerCapture(event.pointerId);
  });

  card?.addEventListener("pointermove", (event) => {
    if (!state.isDragging || state.dragPointerId !== event.pointerId) {
      return;
    }

    state.dragCurrentX = event.clientX;
    updateCardTransform(state.dragCurrentX - state.dragStartX);
  });

  card?.addEventListener("pointerup", (event) => {
    if (state.dragPointerId !== event.pointerId) {
      return;
    }

    releaseDrag();
  });

  card?.addEventListener("pointercancel", () => {
    if (!state.isDragging) {
      return;
    }

    resetCardTransform();
    state.dragPointerId = null;
    state.isDragging = false;
  });

  window.addEventListener("savory:db-change", () => {
    renderRecommendationCard();
  });

  (async () => {
    await window.SAVORY_DB.ready;
    renderRecommendationCard();
  })();
}
