import React, { useState, useRef, useEffect } from "react";
import { usePlayer } from "../context/PlayerContext";
import { Navigate } from "react-router-dom";
import { Sparkles, Eye, EyeOff } from "lucide-react";
import { PeoniaBackground } from "../components/PeoniaBackground";
import { SonoraIntroOverlay } from "../components/SonoraIntroOverlay";
import { SonoraLoader } from "../components/SonoraLoader";

export function Login() {
  const {
    user,
    loginWithGoogle,
    loginWithEmail,
    signUpWithEmail,
    continueAsGuest,
    isAuthLoading,
    siteSettings,
    updateProfile,
  } = usePlayer();

  const [mode, setMode] = useState('signup');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modal, setModal] = useState(null);
  
  // Transition and overlay states matching demo-login.html
  const [introComplete, setIntroComplete] = useState(false);
  const [showIntroOverlay, setShowIntroOverlay] = useState(true);
  const [skipPromptVisible, setSkipPromptVisible] = useState(false);
  const [redirectHome, setRedirectHome] = useState(false);

  const peoniaRef = useRef(null);

  useEffect(() => {
    // Show skip prompt after 2 seconds if intro is still running
    const timer = setTimeout(() => {
      if (!introComplete) {
        setSkipPromptVisible(true);
      }
    }, 2000);
    return () => clearTimeout(timer);
  }, [introComplete]);

  const toggleMode = () => {
    setMode(p => p === 'login' ? 'signup' : 'login');
    setError(''); setPassword(''); setFirstName(''); setLastName('');
  };

  const triggerModal = (title, message) => setModal({ title, message });

  const handleGoogleLogin = async () => {
    setError('');
    try {
      await loginWithGoogle();
      setRedirectHome(true);
    } catch (err) {
      if (err.code === 'auth/unauthorized-domain') {
        triggerModal('Setup Required', `Please add your local IP (${window.location.hostname}) to the Authorized Domains list in the Firebase Console.`);
      } else if (err.code === 'auth/popup-blocked') {
        triggerModal('Popup Blocked', 'Your browser blocked the Google login popup. Redirecting instead…');
      } else {
        triggerModal('Sign-In Error', err.message || 'Google Sign-In failed. Please try again.');
      }
    }
  };

  const handleGuestLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await continueAsGuest();
      setRedirectHome(true);
    } catch (err) {
      triggerModal('Error', 'Guest Sign-In failed: ' + (err.message || err));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    const trimmedEmail = email.trim();
    const trimmedPassword = password;

    if (!trimmedEmail) { setError('Please enter your email.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) { setError('Please enter a valid email address.'); return; }
    if (!trimmedPassword) { setError('Please enter your password.'); return; }
    if (mode === 'signup') {
      if (!firstName.trim() || !lastName.trim()) { setError('Please enter your first and last name.'); return; }
      if (trimmedPassword.length < 8) { setError('Password must be at least 8 characters.'); return; }
    }

    setIsSubmitting(true);
    try {
      if (mode === 'login') {
        await loginWithEmail(trimmedEmail, trimmedPassword);
      } else {
        await signUpWithEmail(trimmedEmail, trimmedPassword);
        await updateProfile(`${firstName.trim()} ${lastName.trim()}`);
      }
      setRedirectHome(true);
    } catch (err) {
      const map = {
        'auth/wrong-password': 'Incorrect password. Please try again.',
        'auth/user-not-found': "No account found with this email. Click 'Sign up' to create one.",
        'auth/email-already-in-use': 'This email is already in use. Please log in instead.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/weak-password': 'Password is too weak. Please use a stronger password.',
        'auth/invalid-credential': 'Invalid email or password.',
      };
      setError(map[err.code] || err.message || 'An authentication error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading) {
    return (
      <SonoraLoader fullScreen size="lg" label="Loading…" />
    );
  }
  // Commented out temporarily to allow testing the login page even if logged in
  // if (user) return <Navigate to="/home" replace />;
  if (redirectHome && user) return <Navigate to="/home" replace />;

  const handleLeftPanelClick = () => {
    if (introComplete) {
      peoniaRef.current?.triggerGlitch();
    } else {
      // Allow skip on panel click if clicked before overlay fades
      setIntroComplete(true);
      setSkipPromptVisible(false);
      setTimeout(() => {
        setShowIntroOverlay(false);
      }, 1100);
    }
  };

  return (
    <div className="sonora-login-page">
      {/* ── Scoped CSS Styles ── */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=Outfit:wght@400;600;700;800&display=swap');

        .sonora-login-page {
          width: 100%;
          min-height: 100vh;
          background-color: #05050a;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          color: #ffffff;
          overflow-x: hidden;
          -webkit-font-smoothing: antialiased;
        }

        body {
          background-color: #05050a !important;
        }

        .sonora-login-page ::selection {
          background: rgba(16, 185, 129, 0.3);
        }

        /* ═══════════ LAYOUT ═══════════ */
        .sonora-login-page .login-wrapper {
          position: relative;
          min-height: 100vh;
          display: flex;
          background: #05050a;
          overflow: hidden;
          width: 100%;
        }

        .sonora-login-page .desktop-spacer {
          display: none;
          width: 58.333%;
          flex-shrink: 0;
        }

        @media (min-width: 768px) {
          .sonora-login-page .desktop-spacer {
            display: block;
          }
        }

        /* LEFT PANEL — fixed, instant width change after overlay gone */
        .sonora-login-page .left-panel {
          position: fixed;
          background-color: #000000;
          inset: 0;
          width: 100%;
          height: 100%;
          overflow: hidden;
          z-index: 20;
          border-right: 1px solid rgba(255,255,255,0.03);
          cursor: pointer;
        }

        .sonora-login-page .login-wrapper.intro-complete .left-panel {
          cursor: default;
        }

        @media (min-width: 768px) {
          .sonora-login-page .login-wrapper.intro-complete .left-panel {
            width: 58.333%;
          }
        }

        @media (max-width: 767px) {
          .sonora-login-page .login-wrapper.intro-complete .left-panel {
            display: none;
          }
        }

        .sonora-login-page #canvas-container {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
          pointer-events: none;
        }

        /* Left panel content over the grid */
        .sonora-login-page .left-content {
          position: absolute;
          inset: 0;
          z-index: 3;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          padding: 2.25rem 2rem;
          pointer-events: none;
        }

        @media (min-width: 768px) {
          .sonora-login-page .left-content {
            padding: 3.5rem 4rem;
          }
        }

        .sonora-login-page .left-top-group {
          display: flex;
          flex-direction: column;
          gap: 2rem;
          width: 100%;
        }

        @media (min-width: 768px) {
          .sonora-login-page .left-top-group {
            gap: 3.5rem;
          }
        }

        .sonora-login-page .left-content > * {
          pointer-events: auto;
        }

        /* Branding logo */
        .sonora-login-page .brand-logo {
          font-size: 0.75rem;
          font-weight: 700;
          letter-spacing: 0.55em;
          text-transform: uppercase;
          background: linear-gradient(to right, #52525b 20%, #ffffff 40%, #27272a 60%, #a1a1aa 80%, #52525b 100%);
          background-size: 200% auto;
          color: transparent;
          -webkit-background-clip: text;
          background-clip: text;
          animation: shineBrand 6s linear infinite;
          cursor: default;
          user-select: none;
          transition: transform 2200ms cubic-bezier(0.85, 0, 0.15, 1), opacity 2200ms cubic-bezier(0.85, 0, 0.15, 1), letter-spacing 0.5s cubic-bezier(0.16, 1, 0.3, 1), filter 0.5s ease !important;
          z-index: 30;
          will-change: transform, opacity;
          opacity: 1;
          pointer-events: auto;
          transform: translate(0, 0) scale(1);
          align-self: flex-start;
        }

        .sonora-login-page .brand-logo:hover {
          letter-spacing: 0.7em;
          filter: drop-shadow(0 0 8px rgba(255, 255, 255, 0.45));
        }

        @keyframes shineBrand {
          to { background-position: 200% center; }
        }

        /* Hero text — always visible, no entry animation */
        .sonora-login-page .hero-section {
          opacity: 1;
        }

        .sonora-login-page .hero-title {
          font-size: clamp(2rem, 3.5vw, 3rem);
          font-weight: 800;
          letter-spacing: -0.02em;
          line-height: 1.15;
          margin-bottom: 1rem;
          font-family: 'Outfit', sans-serif;
        }

        .sonora-login-page .hero-sub {
          font-size: 0.875rem;
          color: rgba(255, 255, 255, 0.6);
          line-height: 1.7;
          max-width: 24rem;
        }

        /* Stepper — always visible, no entry animation */
        .sonora-login-page .stepper {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 0.75rem;
        }

        @media (max-width: 767px) {
          .sonora-login-page .stepper {
            display: none !important;
          }
        }

        /* Mobile Continue Button (only visible on mobile layout) */
        .sonora-login-page .mobile-continue-btn {
          display: none;
        }

        @media (max-width: 767px) {
          .sonora-login-page .mobile-continue-btn {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
            padding: 1.1rem;
            border-radius: 1rem;
            background: #ffffff;
            color: #000000;
            font-weight: 700;
            font-size: 0.85rem;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            border: none;
            cursor: pointer;
            pointer-events: auto;
            z-index: 40;
            box-shadow: 0 10px 30px rgba(255, 255, 255, 0.15);
            transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
          }

          .sonora-login-page .mobile-continue-btn:active {
            transform: scale(0.97);
            background: rgba(255, 255, 255, 0.95);
          }
        }

        .sonora-login-page .step-card {
          padding: 1rem;
          border-radius: 1rem;
          transition: all 0.5s ease;
        }

        .sonora-login-page .step-card.active {
          background: #ffffff;
          color: #000000;
          box-shadow: 0 8px 20px rgba(0,0,0,0.1);
        }

        .sonora-login-page .step-card.inactive {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.05);
          color: rgba(255,255,255,0.4);
        }

        .sonora-login-page .step-number {
          width: 1.75rem;
          height: 1.75rem;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 0.7rem;
          font-weight: 700;
          margin-bottom: 0.75rem;
        }

        .sonora-login-page .step-card.active .step-number {
          background: #000000;
          color: #ffffff;
        }

        .sonora-login-page .step-card.inactive .step-number {
          border: 1px solid rgba(255,255,255,0.1);
          color: #ffffff;
        }

        .sonora-login-page .step-label {
          font-size: 0.68rem;
          font-weight: 700;
          line-height: 1.3;
        }

        /* RIGHT PANEL — always visible, no entry animation */
        .sonora-login-page .right-panel {
          width: 100%;
          min-height: 100vh;
          background: #05050a;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 2rem 1.5rem;
          position: relative;
          z-index: 10;
        }

        @media (min-width: 768px) {
          .sonora-login-page .right-panel {
            width: 41.667%;
            padding: 2rem 3rem;
          }
        }

        .sonora-login-page .form-container {
          width: 100%;
          max-width: 420px;
        }

        /* Form header */
        .sonora-login-page .form-header {
          text-align: center;
          margin-bottom: 2rem;
        }

        .sonora-login-page .form-header h1 {
          font-size: 1.5rem;
          font-weight: 700;
          letter-spacing: -0.02em;
          margin-bottom: 0.375rem;
          font-family: 'Outfit', sans-serif;
        }

        .sonora-login-page .form-header p {
          font-size: 0.75rem;
          color: rgba(255,255,255,0.5);
        }

        /* Google button */
        .sonora-login-page .google-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          width: 100%;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.02);
          color: rgba(255,255,255,0.95);
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.3s ease;
          margin-bottom: 1.5rem;
        }

        .sonora-login-page .google-btn:hover {
          background: rgba(255,255,255,0.06);
        }

        .sonora-login-page .google-btn:active {
          transform: scale(0.98);
        }

        .sonora-login-page .google-btn svg {
          width: 1rem;
          height: 1rem;
        }

        /* Separator */
        .sonora-login-page .separator {
          display: flex;
          align-items: center;
          gap: 0.75rem;
          margin-bottom: 1.5rem;
        }

        .sonora-login-page .separator .line {
          flex: 1;
          height: 1px;
          background: rgba(255,255,255,0.05);
        }

        .sonora-login-page .separator span {
          font-size: 0.625rem;
          font-weight: 700;
          letter-spacing: 0.15em;
          text-transform: uppercase;
          color: rgba(255,255,255,0.2);
        }

        /* Form inputs */
        .sonora-login-page .form-group {
          margin-bottom: 1rem;
        }

        .sonora-login-page .form-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.875rem;
          margin-bottom: 1rem;
        }

        .sonora-login-page .form-group label {
          display: block;
          font-size: 0.68rem;
          font-weight: 700;
          color: rgba(255,255,255,0.7);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          margin-bottom: 0.375rem;
        }

        .sonora-login-page .form-group input {
          width: 100%;
          padding: 0.75rem 1rem;
          border-radius: 0.75rem;
          border: 1px solid rgba(255,255,255,0.1);
          background: rgba(255,255,255,0.02);
          color: #ffffff;
          font-size: 0.75rem;
          font-family: inherit;
          outline: none;
          transition: all 0.3s ease;
        }

        .sonora-login-page .form-group input::placeholder {
          color: rgba(255,255,255,0.2);
        }

        .sonora-login-page .form-group input:focus {
          border-color: rgba(255, 255, 255, 0.4);
          background: rgba(255,255,255,0.04);
        }

        .sonora-login-page .password-wrap {
          position: relative;
        }

        .sonora-login-page .password-wrap input {
          padding-right: 2.75rem;
        }

        .sonora-login-page .eye-toggle {
          position: absolute;
          right: 0.875rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: rgba(255,255,255,0.35);
          cursor: pointer;
          transition: color 0.2s;
          display: flex;
          padding: 0;
        }

        .sonora-login-page .eye-toggle:hover {
          color: rgba(255,255,255,0.6);
        }

        .sonora-login-page .password-hint {
          font-size: 0.625rem;
          color: rgba(255,255,255,0.4);
          margin-top: 0.25rem;
        }

        /* Submit button */
        .sonora-login-page .submit-btn {
          width: 100%;
          padding: 0.875rem;
          border-radius: 0.75rem;
          border: none;
          background: #ffffff;
          color: #000000;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 16px rgba(255,255,255,0.05);
          margin-top: 0.25rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .sonora-login-page .submit-btn:hover {
          background: rgba(255,255,255,0.9);
          transform: scale(1.01);
        }

        .sonora-login-page .submit-btn:active {
          transform: scale(0.99);
        }

        /* Mode switcher */
        .sonora-login-page .mode-switch {
          text-align: center;
          margin-top: 1.5rem;
          font-size: 0.75rem;
          color: rgba(255,255,255,0.4);
        }

        .sonora-login-page .mode-switch button {
          background: none;
          border: none;
          color: #ffffff;
          font-weight: 700;
          cursor: pointer;
          font-size: inherit;
          font-family: inherit;
          transition: all 0.2s;
        }

        .sonora-login-page .mode-switch button:hover {
          text-decoration: underline;
        }

        /* Guest login */
        .sonora-login-page .guest-section {
          margin-top: 2rem;
          text-align: center;
          border-top: 1px solid rgba(255,255,255,0.05);
          padding-top: 1.25rem;
        }

        .sonora-login-page .guest-btn {
          display: inline-flex;
          align-items: center;
          gap: 0.375rem;
          background: none;
          border: none;
          color: #a1a1aa;
          font-size: 0.75rem;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: color 0.2s;
        }

        .sonora-login-page .guest-btn:hover {
          color: #ffffff;
        }

        /* Skip prompt */
        .sonora-login-page .skip-prompt {
          position: fixed;
          bottom: 24px;
          left: 50%;
          transform: translateX(-50%);
          color: rgba(255,255,255,0.3);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          pointer-events: none;
          z-index: 20;
          opacity: 0;
          transition: opacity 1.0s ease-out;
        }

        @media (min-width: 768px) {
          .sonora-login-page .skip-prompt {
            left: 29.167%;
          }
        }

        .sonora-login-page .skip-prompt.visible {
          opacity: 1;
        }

        /* Spinner animation */
        .sonora-login-page .spinner {
          width: 1rem;
          height: 1rem;
          border: 2px solid currentColor;
          border-top-color: transparent;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          display: inline-block;
        }

        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        /* Concentric circle logo */
        .sonora-login-page .concentric-logo-container {
          display: flex;
          justify-content: center;
          margin-bottom: 1.5rem;
        }

        .sonora-login-page .concentric-logo-ring {
          border: 1.5px solid rgba(255, 255, 255, 0.12);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.5s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .sonora-login-page .concentric-logo-ring:hover {
          border-color: rgba(255, 255, 255, 0.35);
          box-shadow: 0 0 15px rgba(255, 255, 255, 0.15);
        }

        .sonora-login-page .logo-outer {
          width: 72px;
          height: 72px;
          animation: logoPulse 3s ease-in-out infinite;
        }

        .sonora-login-page .logo-middle {
          width: 52px;
          height: 52px;
        }

        .sonora-login-page .logo-inner {
          width: 32px;
          height: 32px;
        }

        .sonora-login-page .logo-core {
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background-color: rgba(255, 255, 255, 0.5);
          box-shadow: 0 0 10px rgba(255, 255, 255, 0.15);
        }

        @keyframes logoPulse {
          0% { transform: scale(1); opacity: 0.8; }
          50% { transform: scale(1.05); opacity: 1; border-color: rgba(255, 255, 255, 0.25); }
          100% { transform: scale(1); opacity: 0.8; }
        }

        /* Error alert box */
        .sonora-login-page .error-box {
          margin-bottom: 1rem;
          border-radius: 0.75rem;
          background-color: rgba(239, 68, 68, 0.1);
          border: 1px solid rgba(239, 68, 68, 0.2);
          padding: 0.75rem 1rem;
          font-size: 0.75rem;
          font-weight: 600;
          color: #f87171;
        }

        /* Custom scrollbar for form panel */
        .sonora-login-page .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .sonora-login-page .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .sonora-login-page .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 9999px;
        }
        .sonora-login-page .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>

      {/* ═══ FLOWER INTRO OVERLAY ═══ */}
      {showIntroOverlay && (
        <SonoraIntroOverlay 
          onTransitionStart={() => {
            setIntroComplete(true);
            setSkipPromptVisible(false);
          }}
          onComplete={() => {
            setShowIntroOverlay(false);
          }}
        />
      )}

      <div className={`login-wrapper ${introComplete ? 'intro-complete' : ''}`}>
        {/* Desktop spacer to reserve left-side column width (58.333%) */}
        <div className="desktop-spacer"></div>

        {/* LEFT PANEL: Forest Green Gradient & Stepper */}
        <div
          id="leftPanel"
          onClick={handleLeftPanelClick}
          className="left-panel"
        >
          {/* Peonia Background — only mounts AFTER overlay is fully gone from DOM */}
          {!showIntroOverlay && (
            <div id="canvas-container">
              <PeoniaBackground ref={peoniaRef} />
            </div>
          )}

          <div className="left-content">
            <div className="left-top-group">
              {/* Branding */}
              <span className="brand-logo">Sonora</span>

              {/* Hero Section */}
              <div className={`hero-section ${introComplete ? 'visible' : ''}`} id="heroSection">
                <h2 className="hero-title">Get Started<br />with Us</h2>
                <p className="hero-sub">Complete these easy steps to register and setup your premium listening experience.</p>
              </div>
            </div>

            {/* Stepper */}
            <div className={`stepper ${introComplete ? 'visible' : ''}`} id="stepper">
              <div className="step-card active" id="step1">
                <div className="step-number">1</div>
                <p className="step-label" id="step1Label">
                  {mode === 'signup' ? 'Sign up your account' : 'Log in account'}
                </p>
              </div>
              <div className="step-card inactive">
                <div className="step-number">2</div>
                <p className="step-label">Set up preferences</p>
              </div>
              <div className="step-card inactive">
                <div className="step-number">3</div>
                <p className="step-label">Set up profile</p>
              </div>
            </div>

            {/* Mobile Continue Button (only shown on mobile when intro is not complete) */}
            {!introComplete && (
              <button
                className="mobile-continue-btn"
                onClick={(e) => {
                  e.stopPropagation(); // Prevent duplicate trigger from panel click
                  setIntroComplete(true);
                  setSkipPromptVisible(false);
                  setTimeout(() => {
                    setShowIntroOverlay(false);
                  }, 1100);
                }}
              >
                Continue
              </button>
            )}
          </div>
        </div>

        {/* RIGHT PANEL: Auth Form */}
        <div className="right-panel" id="rightPanel">
          <div className="form-container" id="formContainer">
            <div className="form-header">
              <h1 id="formTitle">
                {mode === 'signup' ? 'Sign Up Account' : 'Welcome Back'}
              </h1>
              <p id="formSubtitle">
                {mode === 'signup'
                  ? 'Enter your personal data to create your account.'
                  : 'Sign in to access your saved playlists and preferences.'}
              </p>
            </div>

            {/* Google Login */}
            <button className="google-btn" type="button" onClick={handleGoogleLogin}>
              <svg viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              Continue with Google
            </button>

            {/* Separator */}
            <div className="separator">
              <div className="line"></div>
              <span>Or</span>
              <div className="line"></div>
            </div>

            {/* Error Message */}
            {error && <div className="error-box">{error}</div>}

            {/* Auth Form */}
            <form onSubmit={handleSubmit}>
              {/* Name Row (signup only) */}
              {mode === 'signup' && (
                <div className="form-row" id="nameRow">
                  <div className="form-group">
                    <label>First Name</label>
                    <input 
                      type="text" 
                      placeholder="eg. John" 
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label>Last Name</label>
                    <input 
                      type="text" 
                      placeholder="eg. Francisco" 
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      required 
                    />
                  </div>
                </div>
              )}

              {/* Email */}
              <div className="form-group">
                <label>Email</label>
                <input 
                  type="email" 
                  placeholder="eg. johnfrans@gmail.com" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required 
                />
              </div>

              {/* Password */}
              <div className="form-group">
                <label>Password</label>
                <div className="password-wrap">
                  <input 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="Enter your password" 
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required 
                  />
                  <button 
                    type="button" 
                    className="eye-toggle" 
                    onClick={() => setShowPassword(p => !p)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {mode === 'signup' && (
                  <p className="password-hint" id="passwordHint">Must be at least 8 characters.</p>
                )}
              </div>

              {/* Submit Button */}
              <button 
                type="submit" 
                className="submit-btn" 
                id="submitBtn"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span className="spinner"></span>
                ) : (
                  mode === 'signup' ? 'Sign Up' : 'Log In'
                )}
              </button>
            </form>

            {/* Mode Switcher */}
            <div className="mode-switch">
              <span id="modeText">
                {mode === 'signup' ? 'Already have an account? ' : "Don't have an account? "}
              </span>
              <button type="button" onClick={toggleMode} id="modeBtn">
                {mode === 'signup' ? 'Log in' : 'Sign up'}
              </button>
            </div>

            {/* Guest Session */}
            {siteSettings?.allow_guest_login !== false && (
              <div className="guest-section">
                <button className="guest-btn" type="button" onClick={handleGuestLogin}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z"/>
                  </svg>
                  Continue as a Guest
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className={`skip-prompt ${skipPromptVisible ? 'visible' : ''}`} id="skipPrompt">
        Click anywhere to skip
      </div>

      {/* Modal Dialog */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-icon">
              <Sparkles size={24} strokeWidth={1.5} />
            </div>
            <h3 className="modal-title">{modal.title}</h3>
            <p className="modal-message">{modal.message}</p>
            <button className="modal-btn" onClick={() => setModal(null)}>Understood</button>
          </div>
        </div>
      )}
    </div>
  );
}
