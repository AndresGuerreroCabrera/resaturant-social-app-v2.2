(function initVercelAnalytics() {
  window.va = window.va || function () {
    (window.vaq = window.vaq || []).push(arguments);
  };

  window.va("beforeSend", function (event) {
    try {
      var url = new URL(event.url, window.location.origin);
      url.search = "";
      url.hash = "";

      return Object.assign({}, event, {
        url: url.pathname || "/"
      });
    } catch (_error) {
      return event;
    }
  });

  var hostname = window.location.hostname;
  var isLocalhost = hostname === "localhost" || hostname === "127.0.0.1";

  if (isLocalhost || document.querySelector('script[data-vercel-analytics-script="true"]')) {
    return;
  }

  var script = document.createElement("script");
  script.defer = true;
  script.src = "/_vercel/insights/script.js";
  script.dataset.vercelAnalyticsScript = "true";
  document.head.appendChild(script);
})();
