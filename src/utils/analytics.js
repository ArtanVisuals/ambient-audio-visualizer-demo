/**
 * Dynamic Google Analytics 4 (GA4) Integration Utility
 * Automatically injects the gtag.js script if VITE_GA_MEASUREMENT_ID is set in .env
 */

const GA_ID = import.meta.env.VITE_GA_MEASUREMENT_ID;

export function initAnalytics() {
  if (!GA_ID) {
    if (import.meta.env.DEV) {
      console.log("Analytics: VITE_GA_MEASUREMENT_ID is not configured. Google Analytics is disabled.");
    }
    return;
  }

  // Check if script is already loaded
  if (document.getElementById("google-analytics-script")) return;

  try {
    // 1. Inject the Google Tag script
    const script = document.createElement("script");
    script.id = "google-analytics-script";
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    document.head.appendChild(script);

    // 2. Initialize the global dataLayer and gtag function
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () {
      window.dataLayer.push(arguments);
    };
    
    window.gtag("js", new Date());
    window.gtag("config", GA_ID, {
      send_page_view: true // Enable automatic page tracking
    });

    if (import.meta.env.DEV) {
      console.log(`Analytics: Google Analytics 4 initialized successfully with ID: ${GA_ID}`);
    }
  } catch (error) {
    console.error("Analytics: Failed to initialize Google Analytics:", error);
  }
}

/**
 * Tracks custom events (e.g. playing a song, changing a theme)
 * @param {string} action - The name of the event (e.g. 'play_song', 'change_morphism')
 * @param {object} params - Event parameters (e.g. { track_name: 'Song Title' })
 */
export function trackEvent(action, params = {}) {
  if (window.gtag && GA_ID) {
    window.gtag("event", action, params);
    if (import.meta.env.DEV) {
      console.log(`Analytics Event Tracked: "${action}"`, params);
    }
  }
}
