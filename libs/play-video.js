// Inline YouTube playback for the Ressources/Vidéos page.
// Clicking the thumbnail of a .video-card replaces it with a youtube-nocookie
// iframe and autoplays. Clicking the card title (.video-card-title-link) still
// goes to YouTube in a new tab. Only the thumbnail is hijacked.

(() => {
    "use strict";

    const NOCOOKIE = "https://www.youtube-nocookie.com/embed/";
    const ALLOW = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";

    function play(btn) {
        const videoId = btn.dataset.videoId;
        if (!videoId) return;

        const wrap = document.createElement("div");
        wrap.className = "video-card-iframe-wrap";

        const iframe = document.createElement("iframe");
        iframe.src = `${NOCOOKIE}${encodeURIComponent(videoId)}?autoplay=1&rel=0&modestbranding=1`;
        iframe.title = btn.getAttribute("aria-label") || "Vidéo YouTube";
        iframe.setAttribute("allow", ALLOW);
        iframe.setAttribute("allowfullscreen", "");
        iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
        iframe.loading = "lazy";
        iframe.className = "video-card-iframe";

        wrap.appendChild(iframe);
        btn.replaceWith(wrap);
    }

    function init() {
        document.querySelectorAll(".video-card-thumb-btn").forEach((btn) => {
            btn.addEventListener("click", () => play(btn));
        });
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", init);
    } else {
        init();
    }
})();
