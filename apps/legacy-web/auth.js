const authPage = document.querySelector("[data-auth-page]");

if (authPage && window.SAVORY_DB) {
  const modeSwitch = authPage.querySelector(".auth-mode-switch");
  const modeButtons = authPage.querySelectorAll("[data-auth-mode]");
  const backLink = authPage.querySelector(".auth-back-link");
  const emailField = authPage.querySelector("#auth-email-field");
  const signupOnlyFields = authPage.querySelector("#signup-only-fields");
  const avatarButtons = authPage.querySelectorAll("[data-avatar-choice]");
  const form = authPage.querySelector("#auth-form");
  const usernameInput = authPage.querySelector("#auth-username");
  const passwordInput = authPage.querySelector("#auth-password");
  const emailInput = authPage.querySelector("#auth-email");
  const submitButton = authPage.querySelector("#auth-submit-button");
  const messageElement = authPage.querySelector("#auth-message");
  const currentUserCard = authPage.querySelector("#current-user-card");
  const logoutButton = authPage.querySelector("#auth-logout-button");

  const state = {
    mode: "login",
    avatar: "chef"
  };

  function getPostAuthRedirect() {
    try {
      const requestedPath = new URLSearchParams(window.location.search).get("redirect");

      if (!requestedPath) {
        return "index.html";
      }

      const redirectUrl = new URL(requestedPath, window.location.origin);
      const isSameOrigin = redirectUrl.origin === window.location.origin;
      const isAuthPage = redirectUrl.pathname.endsWith("/auth.html") || redirectUrl.pathname.endsWith("auth.html");

      if (!isSameOrigin || isAuthPage) {
        return "index.html";
      }

      return `${redirectUrl.pathname}${redirectUrl.search}${redirectUrl.hash}`;
    } catch {
      return "index.html";
    }
  }

  const postAuthRedirect = getPostAuthRedirect();

  function navigateAfterAuth() {
    window.location.replace(postAuthRedirect);
  }

  function setMessage(message, tone = "muted") {
    messageElement.textContent = message;
    messageElement.dataset.tone = tone;
  }

  function renderCurrentUser() {
    const currentUser = window.SAVORY_DB.getCurrentUser();
    currentUserCard.hidden = !currentUser;
    window.SAVORY_syncUserAvatarUI?.();
  }

  function setMode(nextMode) {
    state.mode = nextMode === "signup" ? "signup" : "login";
    const activeIndex = state.mode === "signup" ? 1 : 0;

    if (modeSwitch) {
      modeSwitch.dataset.activeIndex = String(activeIndex);
    }

    modeButtons.forEach((button, index) => {
      const isActive = index === activeIndex;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });

    emailField.hidden = state.mode !== "signup";
    signupOnlyFields.hidden = state.mode !== "signup";
    if (emailInput) {
      emailInput.disabled = state.mode !== "signup";
      emailInput.required = state.mode === "signup";
      emailInput.setAttribute("autocomplete", state.mode === "signup" ? "email" : "off");

      if (state.mode !== "signup") {
        emailInput.value = "";
      }
    }
    submitButton.textContent = state.mode === "signup" ? "Crear cuenta" : "Entrar";
    passwordInput.setAttribute(
      "autocomplete",
      state.mode === "signup" ? "new-password" : "current-password"
    );
    setMessage(
      state.mode === "signup"
        ? "Crea usuario, correo, contrasena y elige tu avatar."
        : "Entra con tu usuario y contrasena."
    );
  }

  function setAvatar(nextAvatar) {
    state.avatar = nextAvatar || "chef";

    avatarButtons.forEach((button) => {
      const isActive = button.dataset.avatarChoice === state.avatar;
      button.classList.toggle("is-active", isActive);
      button.setAttribute("aria-pressed", String(isActive));
    });
  }

  function setBusy(isBusy) {
    submitButton.disabled = isBusy;
    if (isBusy) {
      usernameInput.setAttribute("disabled", "disabled");
      passwordInput.setAttribute("disabled", "disabled");
      if (emailInput && state.mode === "signup") {
        emailInput.setAttribute("disabled", "disabled");
      }
    } else {
      usernameInput.removeAttribute("disabled");
      passwordInput.removeAttribute("disabled");
      if (emailInput) {
        emailInput.disabled = state.mode !== "signup";
      }
    }

    logoutButton.disabled = isBusy;
    avatarButtons.forEach((button) => {
      button.disabled = isBusy;
    });
  }

  if (backLink) {
    backLink.href = postAuthRedirect;
  }

  modeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setMode(button.dataset.authMode || "login");
    });
  });

  avatarButtons.forEach((button) => {
    button.addEventListener("click", () => {
      setAvatar(button.dataset.avatarChoice || "chef");
    });
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();
    const email = emailInput?.value.trim() || "";

    setBusy(true);

    try {
      if (state.mode === "signup") {
        const result = await window.SAVORY_DB.signUpUser({
          username,
          password,
          email,
          avatar: state.avatar
        });

        if (result.status === "invalid") {
          setMessage("Necesitas usuario, correo y contrasena para crear la cuenta.", "error");
          return;
        }

        if (result.status === "invalid-email") {
          setMessage("Escribe un correo electronico real y valido.", "error");
          return;
        }

        if (result.status === "exists") {
          setMessage("Ese usuario ya existe. Prueba con otro nombre.", "error");
          return;
        }

        if (result.status === "setup-required") {
          setMessage(
            "Supabase no ha podido guardar el perfil. Revisa que hayas ejecutado `supabase-schema.sql` y que `Confirm email` este desactivado en Auth.",
            "error"
          );
          return;
        }

        if (result.status === "weak-password") {
          setMessage("La contrasena debe tener al menos 6 caracteres.", "error");
          return;
        }

        if (result.status === "signup-disabled") {
          setMessage("En tu proyecto de Supabase el registro de usuarios esta desactivado.", "error");
          return;
        }

        if (result.status === "confirmation-required") {
          setMessage(
            "Supabase te esta pidiendo confirmar email. Para este flujo con usuario simple, desactiva Confirm email en Auth.",
            "error"
          );
          return;
        }

        if (result.status !== "created") {
          const detailedMessage = String(result.error?.message || "").trim();
          setMessage(
            detailedMessage
              ? `No he podido crear la cuenta en Supabase: ${detailedMessage}`
              : "No he podido crear la cuenta en Supabase.",
            "error"
          );
          return;
        }

        setMessage(`Cuenta creada para ${result.user.username}. Entrando...`);
        window.SAVORY_syncUserAvatarUI?.();
        renderCurrentUser();
        window.setTimeout(() => {
          navigateAfterAuth();
        }, 220);
        return;
      }

      const result = await window.SAVORY_DB.logInUser({
        username,
        password
      });

      if (result.status === "invalid") {
        setMessage("Escribe usuario y contrasena para entrar.", "error");
        return;
      }

      if (result.status === "not-found") {
        setMessage("No existe ningun usuario con ese nombre.", "error");
        return;
      }

      if (result.status === "wrong-password") {
        setMessage("La contrasena no coincide.", "error");
        return;
      }

      if (result.status === "confirmation-required") {
        setMessage(
          "Ese usuario no puede entrar mientras Supabase exija confirmacion de email.",
          "error"
        );
        return;
      }

      if (result.status !== "logged-in") {
        setMessage("No he podido iniciar sesion en Supabase.", "error");
        return;
      }

      setMessage(`Bienvenido, ${result.user.username}. Entrando...`);
      window.SAVORY_syncUserAvatarUI?.();
      renderCurrentUser();
      window.setTimeout(() => {
        navigateAfterAuth();
      }, 220);
    } finally {
      setBusy(false);
    }
  });

  logoutButton?.addEventListener("click", async () => {
    setBusy(true);

    try {
      await window.SAVORY_DB.logOutUser();
      window.SAVORY_syncUserAvatarUI?.();
      renderCurrentUser();
      setMessage("Sesion cerrada.");
    } finally {
      setBusy(false);
    }
  });

  (async () => {
    await window.SAVORY_DB.ready;
    setMode("login");
    setAvatar("chef");
    renderCurrentUser();
  })();
}
