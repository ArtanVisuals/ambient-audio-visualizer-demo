// Safe storage wrapper to prevent QuotaExceededError crashes
(function() {
  try {
    const storagePrototypes = [window.localStorage, window.sessionStorage];
    storagePrototypes.forEach(storage => {
      if (!storage) return;
      const originalSetItem = storage.setItem;
      storage.setItem = function(key, value) {
        try {
          originalSetItem.call(storage, key, value);
        } catch (e) {
          console.error("Storage setItem error for key '" + key + "':", e);
        }
      };
      const originalRemoveItem = storage.removeItem;
      storage.removeItem = function(key) {
        try {
          originalRemoveItem.call(storage, key);
        } catch (e) {
          console.error("Storage removeItem error for key '" + key + "':", e);
        }
      };
    });
  } catch (err) {
    console.error("Failed to inject storage safety wrappers:", err);
  }
})();

// Clear the OTA bootloader fail-safe timeout immediately upon successful bundle load
if (window.__ota_boot_timeout__) {
  clearTimeout(window.__ota_boot_timeout__);
  console.log("🚀 OTA Bootloader: Bundle loaded successfully. Timeout cleared.");
}

import React, { StrictMode, Component } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

import { AuthProvider } from "./context/AuthContext.jsx";
import { PlayerProvider } from "./context/PlayerContext.jsx";

class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    this.setState({ info });
    console.error("App crashed:", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          position: "fixed", inset: 0, background: "#cc0000",
          display: "flex", flexDirection: "column", alignItems: "center",
          justifyContent: "center", padding: "2rem", fontFamily: "monospace",
          color: "#ffffff", zIndex: 99999
        }}>
          <div style={{ maxWidth: "800px", width: "100%" }}>
            <h1 style={{ fontSize: "1.8rem", marginBottom: "1rem" }}>
              ⚠ React Crash — Error:
            </h1>
            <pre style={{
              background: "rgba(0,0,0,0.4)", borderRadius: "12px",
              padding: "1.5rem", overflow: "auto", fontSize: "0.85rem",
              lineHeight: "1.6", whiteSpace: "pre-wrap", wordBreak: "break-word",
              maxHeight: "50vh"
            }}>
              {String(this.state.error)}
              {"\n\nComponent Stack:\n"}
              {this.state.info?.componentStack}
            </pre>
            <button
              onClick={() => { 
                try { localStorage.clear(); } catch(e) {}
                window.location.reload(); 
              }}
              style={{
                marginTop: "1.5rem", padding: "0.75rem 2rem",
                background: "#ffffff", color: "#cc0000", border: "none",
                borderRadius: "999px", cursor: "pointer", fontWeight: "700",
                fontSize: "1rem"
              }}
            >
              Clear Storage &amp; Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

import { initAnalytics } from "./utils/analytics";

// Initialize Google Analytics dynamically
initAnalytics();

// Server address configurations for standalone native container
const DEFAULT_NATIVE_SERVER_URL = "https://rippling-division-jokingly.ngrok-free.dev";
const NATIVE_SERVER_URL = localStorage.getItem('sonora_server_url') || DEFAULT_NATIVE_SERVER_URL;
window.NATIVE_SERVER_URL = NATIVE_SERVER_URL;
window.DEFAULT_NATIVE_SERVER_URL = DEFAULT_NATIVE_SERVER_URL;

// Add a helper function to change this URL dynamically and reload the page
window.updateNativeServerUrl = function(newUrl) {
  if (!newUrl) {
    localStorage.removeItem('sonora_server_url');
  } else {
    // Normalize URL
    let formatted = newUrl.trim();
    if (formatted.endsWith('/')) {
      formatted = formatted.slice(0, -1);
    }
    localStorage.setItem('sonora_server_url', formatted);
  }
  window.location.reload();
};

// Expose applyViewportScaling globally for viewport-based scaling
window.applyViewportScaling = function() {
  const isNativeApp = window.Capacitor && typeof window.Capacitor.getPlatform === 'function' && window.Capacitor.getPlatform() !== 'web';
  if (!isNativeApp) return;

  // Reset standard CSS zoom and compensations to prevent layout scrollbar bugs
  document.documentElement.style.zoom = "";
  document.documentElement.style.width = "";
  document.documentElement.style.height = "";

  // Detect current orientation and get screen dimensions in CSS pixels (reliable on orientation changes)
  const isLandscape = window.screen.orientation 
    ? window.screen.orientation.type.includes('landscape')
    : window.innerWidth > window.innerHeight;
  const screenWidth = isLandscape 
    ? Math.max(window.screen.width, window.screen.height) 
    : Math.min(window.screen.width, window.screen.height);
  const screenHeight = isLandscape 
    ? Math.min(window.screen.width, window.screen.height) 
    : Math.max(window.screen.width, window.screen.height);

  // Determine standard layout scale
  const isTablet = screenWidth >= 768 || Math.min(screenWidth, screenHeight) >= 600;
  
  const viewport = document.querySelector('meta[name="viewport"]');
  if (!isTablet) {
    // If phone, bypass 1024px desktop scaling and use normal mobile layout
    if (viewport) {
      viewport.setAttribute(
        'content',
        'width=device-width, initial-scale=1, minimum-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover'
      );
    }
    return;
  }

  const defaultZoom = isTablet ? 0.75 : 0.90;
  const isAutoZoom = localStorage.getItem('sonora_auto_zoom') !== 'false';
  
  let zoomScale = defaultZoom;
  if (!isAutoZoom) {
    const storedZoom = localStorage.getItem('sonora_user_zoom');
    if (storedZoom) {
      zoomScale = parseFloat(storedZoom);
    }
  }

  // Set page width to a desktop width (min 1024px, or actual screen width if larger), scaled accordingly
  const baseWidth = Math.max(1024, screenWidth);
  const targetWidth = Math.round(baseWidth / zoomScale);
  const scale = screenWidth / targetWidth;

  if (viewport) {
    viewport.setAttribute(
      'content',
      `width=${targetWidth}, initial-scale=${scale}, minimum-scale=${scale}, maximum-scale=${scale}, user-scalable=yes, viewport-fit=cover`
    );
  }
};

// Always intercept and resolve relative API/asset fetch calls
const originalFetch = window.fetch;
window.fetch = async function (input, init) {
  const isNativeApp = window.Capacitor && typeof window.Capacitor.getPlatform === 'function' && window.Capacitor.getPlatform() !== 'web';
  
  let url = "";
  if (typeof input === 'string') {
    url = input;
  } else if (input instanceof Request) {
    url = input.url;
  } else if (input && typeof input === 'object' && 'href' in input) {
    url = input.href;
  } else if (input && typeof input.toString === 'function') {
    url = input.toString();
  }
  
  let shouldProxy = false;
  let path = "";
  
  if (url.startsWith('/')) {
    path = url;
    shouldProxy = isNativeApp;
  } else {
    const localOrigins = [
      window.location.origin,
      'http://localhost',
      'capacitor://localhost',
      'http://127.0.0.1'
    ];
    for (const origin of localOrigins) {
      if (url.startsWith(origin + '/')) {
        path = url.slice(origin.length);
        shouldProxy = isNativeApp;
        break;
      }
    }
  }
  
  if (shouldProxy) {
    // Only proxy our backend route paths
    const backendPrefixes = ['/api/', '/covers/', '/music/', '/videos/', '/uploads/'];
    const isBackendRoute = backendPrefixes.some(prefix => path.startsWith(prefix));
    
    if (isBackendRoute) {
      const currentNativeServerUrl = localStorage.getItem('sonora_server_url') || window.DEFAULT_NATIVE_SERVER_URL || '';
      const absoluteUrl = `${currentNativeServerUrl}${path}`;
      console.log(`[Fetch Proxy] Rewriting ${url} -> ${absoluteUrl}`);
      
      // Inject ngrok bypass header to prevent warning template response in WebView
      if (!init) init = {};
      if (!init.headers) init.headers = {};
      if (init.headers instanceof Headers) {
        init.headers.set('ngrok-skip-browser-warning', 'true');
      } else if (Array.isArray(init.headers)) {
        init.headers.push(['ngrok-skip-browser-warning', 'true']);
      } else {
        init.headers['ngrok-skip-browser-warning'] = 'true';
      }

      if (input instanceof Request) {
        input = new Request(absoluteUrl, input);
      } else {
        input = absoluteUrl;
      }
    }
  }
  
  const response = await originalFetch(input, init);
  
  if (isNativeApp) {
    // Intercept JSON parsing to dynamically map relative image and audio paths to absolute server paths
    const originalJson = response.json;
    response.json = async function () {
      const data = await originalJson.call(this);
      const currentNativeServerUrl = localStorage.getItem('sonora_server_url') || window.DEFAULT_NATIVE_SERVER_URL || '';
      
      const makeUrlsAbsolute = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) {
          return obj.map(makeUrlsAbsolute);
        }
        for (const key in obj) {
          if (typeof obj[key] === 'string') {
            const val = obj[key];
            if (
              val.startsWith('/covers/') || 
              val.startsWith('/music/') || 
              val.startsWith('/videos/') || 
              val.startsWith('/uploads/') ||
              (key === 'audioUrl' && val.startsWith('/')) ||
              (key === 'cover' && val.startsWith('/'))
            ) {
              obj[key] = `${currentNativeServerUrl}${val}`;
            }
          } else if (typeof obj[key] === 'object') {
            obj[key] = makeUrlsAbsolute(obj[key]);
          }
        }
        return obj;
      };
      
      return makeUrlsAbsolute(data);
    };
  }
  
  return response;
};

// Robust viewport scaling/native initialization helper to bypass Capacitor startup race conditions
window.initializeNativeAppDetails = function() {
  const isNativeApp = window.Capacitor && typeof window.Capacitor.getPlatform === 'function' && window.Capacitor.getPlatform() !== 'web';
  if (isNativeApp) {
    const platform = window.Capacitor.getPlatform();
    document.documentElement.classList.add(`platform-${platform}`);
    // Detect current orientation and get screen dimensions to verify if tablet
    const isLandscape = window.screen.orientation 
      ? window.screen.orientation.type.includes('landscape')
      : window.innerWidth > window.innerHeight;
    const screenWidth = isLandscape 
      ? Math.max(window.screen.width, window.screen.height) 
      : Math.min(window.screen.width, window.screen.height);
    const screenHeight = isLandscape 
      ? Math.min(window.screen.width, window.screen.height) 
      : Math.max(window.screen.width, window.screen.height);
    const isTablet = screenWidth >= 768 || Math.min(screenWidth, screenHeight) >= 600;

    // Determine and apply screen layout style (forced to fullscreen on mobile)
    let layoutStyle = 'fullscreen';
    if (isTablet) {
      layoutStyle = localStorage.getItem('sonora_native_layout') || 'curved';
    }

    document.documentElement.classList.remove('native-layout-curved', 'native-layout-fullscreen');
    document.documentElement.classList.add(`native-layout-${layoutStyle}`);

    if (!document.documentElement.classList.contains("native-app")) {
      document.documentElement.classList.add("native-app");
      
      // Apply initial viewport scaling
      window.applyViewportScaling();

      // Keep viewport scaling aligned on resize and orientation changes
      window.removeEventListener('resize', window.applyViewportScaling);
      window.removeEventListener('orientationchange', window.applyViewportScaling);
      window.addEventListener('resize', window.applyViewportScaling);
      window.addEventListener('orientationchange', window.applyViewportScaling);
      console.log("[Native Init] Successfully initialized viewport scaling & orientation listeners.");
    }
    return true;
  }
  return false;
};

// Try to initialize immediately, on load, and on DOMContentLoaded
window.initializeNativeAppDetails();
document.addEventListener("DOMContentLoaded", window.initializeNativeAppDetails);
window.addEventListener("load", window.initializeNativeAppDetails);


try {
  createRoot(document.getElementById("root")).render(
    <StrictMode>
      <ErrorBoundary>
        <AuthProvider>
          <PlayerProvider>
            <App />
          </PlayerProvider>
        </AuthProvider>
      </ErrorBoundary>
    </StrictMode>,
  );
} catch (e) {
  document.getElementById("root").innerHTML = `
    <div style="position:fixed;inset:0;background:#cc0000;display:flex;align-items:center;justify-content:center;padding:2rem;font-family:monospace;color:#fff;flex-direction:column;">
      <h1 style="font-size:1.5rem;margin-bottom:1rem;">⚠ Fatal Error (before React):</h1>
      <pre style="background:rgba(0,0,0,0.4);padding:1.5rem;border-radius:12px;overflow:auto;max-width:800px;width:100%;white-space:pre-wrap;word-break:break-word;">${e.toString()}\n${e.stack}</pre>
      <button onclick="localStorage.clear();location.reload()" style="margin-top:1.5rem;padding:0.75rem 2rem;background:#fff;color:#cc0000;border:none;border-radius:999px;cursor:pointer;font-weight:700;font-size:1rem;">Clear Storage &amp; Reload</button>
    </div>
  `;
}
