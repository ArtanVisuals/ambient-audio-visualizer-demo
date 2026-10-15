import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { auth, googleProvider } from '../firebase';
import { 
  onAuthStateChanged, 
  signOut, 
  signInWithPopup, 
  signInWithRedirect, 
  getRedirectResult, 
  signInAnonymously, 
  updateProfile as firebaseUpdateProfile, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  deleteUser,
  signInWithCredential,
  GoogleAuthProvider
} from 'firebase/auth';

const getDeviceType = () => {
  const ua = navigator.userAgent;
  if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
    return 'tab';
  }
  if (/Mobile|iP(hone|od)|Android|BlackBerry|IEMobile|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
    return 'mobile';
  }
  const width = window.innerWidth;
  if (width <= 640) return 'mobile';
  if (width <= 1024) return 'tab';
  return 'pc';
};

const getOS = () => {
  const ua = navigator.userAgent;
  if (/windows/i.test(ua)) return 'Windows';
  if (/macintosh|mac os x/i.test(ua)) return 'macOS';
  if (/android/i.test(ua)) return 'Android';
  if (/iphone|ipad|ipod/i.test(ua)) return 'iOS';
  if (/linux/i.test(ua)) return 'Linux';
  return 'Web Platform';
};

const generateConformingDeviceId = () => {
  const devType = getDeviceType();
  const prefix = (devType === 'mobile' || devType === 'tab') ? 'mobile_' : 'pc_';
  const rand = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 10);
  return `${prefix}${rand}`;
};

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [showDeviceNicknameModal, setShowDeviceNicknameModal] = useState(false);
  const [pendingUser, setPendingUser] = useState(null);
  const [isBanned, setIsBanned] = useState(false);
  const [isSuspended, setIsSuspended] = useState(false);
  const [suspendedUntil, setSuspendedUntil] = useState(null);
  const [suspensionReason, setSuspensionReason] = useState('');
  const [customUserId, setCustomUserId] = useState(localStorage.getItem('aura_custom_user_id') || '');

  // Alert Dialog System
  const [dialogConfig, setDialogConfig] = useState(null);

  const showAlert = useCallback((message, title = "System Message") => {
    return new Promise((resolve) => {
      setDialogConfig({
        type: 'alert',
        title,
        message,
        onConfirm: () => {
          setDialogConfig(null);
          resolve(true);
        },
        onCancel: () => {
          setDialogConfig(null);
          resolve(false);
        }
      });
    });
  }, []);

  const showConfirm = useCallback((message, title = "Confirm Action") => {
    return new Promise((resolve) => {
      setDialogConfig({
        type: 'confirm',
        title,
        message,
        onConfirm: () => {
          setDialogConfig(null);
          resolve(true);
        },
        onCancel: () => {
          setDialogConfig(null);
          resolve(false);
        }
      });
    });
  }, []);

  const sessionId = (() => {
    let id = localStorage.getItem('aura_session_id');
    if (!id || (!id.startsWith('pc_') && !id.startsWith('mobile_'))) {
      id = generateConformingDeviceId();
      localStorage.setItem('aura_session_id', id);
      localStorage.setItem('aura_active_device', id);
    }
    return id;
  })();

  const refreshSessions = useCallback((uid) => {
    const userId = uid || user?.uid;
    if (!userId) return;
    fetch('/api/sessions', { headers: { 'x-user-id': userId } })
      .then(res => res.json())
      .then(data => setSessions(Array.isArray(data) ? data : []))
      .catch(err => console.error('Failed to refresh sessions:', err));
  }, [user?.uid]);

  const syncDeviceSession = useCallback((u, nickname) => {
    const detectedDeviceType = getDeviceType();
    const detectedOS = getOS();
    const isLogin = localStorage.getItem('aura_login_pending') === 'true';

    let provider = null;
    if (u.isAnonymous) {
      provider = 'anonymous';
    } else if (u.providerData && u.providerData.length > 0) {
      const hasGoogle = u.providerData.some(p => p.providerId === 'google.com');
      const hasPassword = u.providerData.some(p => p.providerId === 'password');
      if (hasGoogle) {
        provider = 'google';
      } else if (hasPassword) {
        provider = 'password';
      }
    }

    fetch('/api/sessions/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: sessionId,
        userId: u.uid,
        device: nickname,
        deviceType: detectedDeviceType,
        location: `Browser (${detectedOS})`,
        userName: u.displayName,
        userEmail: u.email,
        userPhoto: u.photoURL,
        emailVerified: u.emailVerified,
        isLogin,
        provider
      })
    })
    .then(res => res.json())
    .then((data) => {
      if (isLogin && data && !data.isRevoked) {
        localStorage.removeItem('aura_login_pending');
      }

      if (data && data.isBanned) {
        setIsBanned(true);
        setIsAuthLoading(false);
        return;
      } else {
        setIsBanned(false);
      }

      if (data && data.customId) {
        setCustomUserId(data.customId);
        localStorage.setItem('aura_custom_user_id', data.customId);
      }

      if (data && data.isSuspended) {
        setIsSuspended(true);
        setSuspendedUntil(data.suspendedUntil);
        setSuspensionReason(data.suspensionReason || '');
      } else {
        setIsSuspended(false);
        setSuspendedUntil(null);
        setSuspensionReason('');
      }

      if (data && data.isRevoked) {
        console.warn("Session has been revoked. Logging out...");
        logout();
        return;
      }

      if (data && data.emailVerified !== undefined) {
        setUser(prev => {
          if (!prev) return null;
          let updated = { ...prev, emailVerified: data.emailVerified };
          if (data.dbUser) {
            updated.displayName = data.dbUser.name || prev.displayName;
            updated.photoURL = data.dbUser.photo || prev.photoURL;
            updated.verified_badge = data.dbUser.verified_badge || null;
          }
          return updated;
        });
        if (data.emailVerified) {
          localStorage.setItem(`aura_email_verified_${u.uid}`, 'true');
        } else {
          localStorage.removeItem(`aura_email_verified_${u.uid}`);
        }
      }

      refreshSessions(u.uid);
      setIsAuthLoading(false);
    }).catch((err) => {
      console.error(err);
      setIsAuthLoading(false);
    });
  }, [sessionId, refreshSessions]);

  // Handle Firebase redirect result
  useEffect(() => {
    getRedirectResult(auth)
      .then((result) => {
        if (result?.user) {
          console.log("Redirect sign-in successful:", result.user);
        }
      })
      .catch((err) => {
        console.error("Redirect sign-in error:", err);
        if (err.code === 'auth/unauthorized-domain') {
          showAlert("Domain Unauthorized: Please add your local IP (" + window.location.hostname + ") to the Authorized Domains list in the Firebase Console (Authentication > Settings > Authorized Domains).");
        } else {
          showAlert("Google sign-in error: " + err.message);
        }
      });
  }, [showAlert]);

  // Auth state listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      if (u) {
        const isVerifiedLocal = localStorage.getItem(`aura_email_verified_${u.uid}`) === 'true';
        const mappedUser = {
          uid: u.uid,
          displayName: u.displayName || 'Sonora Listener',
          email: u.email,
          photoURL: u.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${u.uid}`,
          isAnonymous: u.isAnonymous,
          emailVerified: u.emailVerified || isVerifiedLocal,
          providerData: u.providerData
        };
        setUser(mappedUser);

        const nickname = localStorage.getItem('aura_device_nickname');
        if (!nickname) {
          if (u.isAnonymous) {
            localStorage.setItem('aura_device_nickname', 'Guest Player');
            syncDeviceSession(mappedUser, 'Guest Player');
            setIsAuthLoading(false);
          } else {
            setPendingUser(mappedUser);
            setShowDeviceNicknameModal(true);
            setIsAuthLoading(false);
          }
        } else {
          syncDeviceSession(mappedUser, nickname);
          setIsAuthLoading(false);
        }
      } else {
        setUser(null);
        setSessions([]);
        setIsAuthLoading(false);
      }
    });

    return unsubscribe;
  }, [syncDeviceSession]);

  // Initial ban check on mount
  useEffect(() => {
    fetch('/api/sessions/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: sessionId,
        userId: 'device_check',
        device: 'Device Check',
        deviceType: getDeviceType(),
        location: `Browser (${getOS()})`
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data && data.isBanned) {
        setIsBanned(true);
      }
    })
    .catch(err => console.error("Initial ban check failed:", err));
  }, [sessionId]);

  // Heartbeats & Session Refresh Loop
  useEffect(() => {
    if (!user) return;

    const sessionsInterval = setInterval(() => {
      refreshSessions(user.uid);
    }, 15000);

    const syncInterval = setInterval(() => {
      const currentNickname = localStorage.getItem('aura_device_nickname');
      if (currentNickname) {
        syncDeviceSession(user, currentNickname);
      }
    }, 30000);

    return () => {
      clearInterval(sessionsInterval);
      clearInterval(syncInterval);
    };
  }, [user, refreshSessions, syncDeviceSession]);

  const loginWithGoogle = async () => {
    setIsAuthLoading(true);
    try {
      localStorage.setItem('aura_login_pending', 'true');
      
      const isNativeApp = window.Capacitor && typeof window.Capacitor.getPlatform === 'function' && window.Capacitor.getPlatform() !== 'web';
      
      if (isNativeApp) {
        // Native Google Authentication via Capacitor Plugin
        const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
        GoogleAuth.initialize();
        
        const googleUser = await GoogleAuth.signIn();
        const credential = GoogleAuthProvider.credential(googleUser.authentication.idToken);
        await signInWithCredential(auth, credential);
      } else {
        // Standard Web Firebase Authentication
        await signInWithPopup(auth, googleProvider);
      }
    } catch (err) {
      console.error("Google login failed:", err);
      localStorage.removeItem('aura_login_pending');
      
      const isNativeApp = window.Capacitor && typeof window.Capacitor.getPlatform === 'function' && window.Capacitor.getPlatform() !== 'web';
      if (!isNativeApp) {
        if (err.code === 'auth/popup-blocked') {
          try {
            localStorage.setItem('aura_login_pending', 'true');
            await signInWithRedirect(auth, googleProvider);
          } catch (redirectErr) {
            console.error("Redirect fallback failed:", redirectErr);
            localStorage.removeItem('aura_login_pending');
            throw redirectErr;
          }
        } else {
          throw err;
        }
      } else {
        throw err;
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const continueAsGuest = async () => {
    setIsAuthLoading(true);
    try {
      localStorage.setItem('aura_login_pending', 'true');
      await signInAnonymously(auth);
    } catch (err) {
      console.error("Guest login failed:", err);
      localStorage.removeItem('aura_login_pending');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const loginWithEmail = async (email, password) => {
    setIsAuthLoading(true);
    try {
      localStorage.setItem('aura_login_pending', 'true');
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error("Email login failed:", err);
      localStorage.removeItem('aura_login_pending');
      throw err;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const signUpWithEmail = async (email, password) => {
    setIsAuthLoading(true);
    try {
      localStorage.setItem('aura_login_pending', 'true');
      await createUserWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error("Email sign-up failed:", err);
      localStorage.removeItem('aura_login_pending');
      throw err;
    } finally {
      setIsAuthLoading(false);
    }
  };

  const sendOtp = async (email) => {
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to send code.");
      }
      return data;
    } catch (err) {
      console.error("sendOtp error:", err);
      throw err;
    }
  };

  const verifyOtp = async (email, code) => {
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification failed.");
      }
      
      setUser(prev => prev ? { ...prev, emailVerified: true } : null);
      if (auth.currentUser) {
        localStorage.setItem(`aura_email_verified_${auth.currentUser.uid}`, 'true');
        const nickname = localStorage.getItem('aura_device_nickname') || 'Sonora Web Player';
        syncDeviceSession({
          uid: auth.currentUser.uid,
          displayName: auth.currentUser.displayName,
          email: auth.currentUser.email,
          photoURL: auth.currentUser.photoURL,
          isAnonymous: auth.currentUser.isAnonymous,
          emailVerified: true
        }, nickname);
      }
      return true;
    } catch (err) {
      console.error("verifyOtp error:", err);
      throw err;
    }
  };

  const checkEmailVerificationStatus = async () => {
    if (!auth.currentUser) return false;
    const nickname = localStorage.getItem('aura_device_nickname') || 'Sonora Web Player';
    try {
      const res = await fetch('/api/sessions/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: sessionId,
          userId: auth.currentUser.uid,
          device: nickname,
          userName: auth.currentUser.displayName,
          userEmail: auth.currentUser.email,
          userPhoto: auth.currentUser.photoURL,
          emailVerified: false
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data && data.emailVerified !== undefined) {
          setUser(prev => prev ? { ...prev, emailVerified: data.emailVerified } : null);
          if (data.emailVerified) {
            localStorage.setItem(`aura_email_verified_${auth.currentUser.uid}`, 'true');
            return true;
          }
        }
      }
    } catch (e) {
      console.error("checkEmailVerificationStatus error:", e);
    }
    return false;
  };

  const resendVerificationEmail = async () => {
    if (!auth.currentUser || !auth.currentUser.email) return;
    await sendOtp(auth.currentUser.email);
  };

  const updateProfile = async (displayName) => {
    if (!auth.currentUser) return;
    try {
      await firebaseUpdateProfile(auth.currentUser, { displayName });
      const mappedUser = {
        uid: auth.currentUser.uid,
        displayName: displayName || 'Sonora Listener',
        email: auth.currentUser.email,
        photoURL: auth.currentUser.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${auth.currentUser.uid}`,
        isAnonymous: auth.currentUser.isAnonymous,
        emailVerified: auth.currentUser.emailVerified
      };
      setUser(mappedUser);
      const nickname = localStorage.getItem('aura_device_nickname') || 'Sonora Web Player';
      syncDeviceSession(mappedUser, nickname);
    } catch (err) {
      console.error("Failed to update profile:", err);
    }
  };

  const renameSession = async (sessId, newDeviceName) => {
    try {
      await fetch(`/api/sessions/${sessId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device: newDeviceName })
      });
      if (user) {
        const res = await fetch('/api/sessions', { headers: { 'x-user-id': user.uid } });
        const data = await res.json();
        setSessions(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to rename session:", err);
    }
  };

  const terminateSession = async (sessId) => {
    try {
      await fetch(`/api/sessions/${sessId}`, { method: 'DELETE' });
      if (user) {
        const res = await fetch('/api/sessions', { headers: { 'x-user-id': user.uid } });
        const data = await res.json();
        setSessions(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to terminate session:", err);
    }
  };

  const logout = async () => {
    try {
      const sessId = localStorage.getItem('aura_session_id');
      if (sessId) {
        await fetch(`/api/sessions/${sessId}`, { method: 'DELETE' });
      }
    } catch (err) {
      console.error("Failed to revoke session on logout:", err);
    }
    localStorage.removeItem('aura_login_pending');
    localStorage.removeItem('aura_device_nickname');
    localStorage.removeItem('aura_legal_accepted');
    localStorage.removeItem('aura_active_device');
    localStorage.removeItem('aura_custom_user_id');
    localStorage.removeItem('aura_queue');
    localStorage.removeItem('aura_track_index');
    localStorage.removeItem('aura_history');
    localStorage.removeItem('aura_progress');
    localStorage.removeItem('aura_party_room_code');
    localStorage.removeItem('sonora_legal_accepted');

    try {
      await signOut(auth);
    } catch (signOutErr) {
      console.error("Firebase signOut error:", signOutErr);
    }
    
    // Brief delay to allow IndexedDB and cache writes to settle
    setTimeout(() => {
      const isCapacitor = window.Capacitor || window.navigator.userAgent.includes("Capacitor");
      window.location.href = isCapacitor ? 'login.html' : '/login';
    }, 150);
  };

  const deleteAccount = async () => {
    if (!auth.currentUser) return;
    const email = auth.currentUser.email;
    const uid = auth.currentUser.uid;
    try {
      const res = await fetch(`/api/auth/delete-account`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: uid, email })
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to delete database records.");
      }
      
      await deleteUser(auth.currentUser);
      localStorage.removeItem(`aura_email_verified_${uid}`);
      await logout();
    } catch (err) {
      console.error("deleteAccount failed:", err);
      throw err;
    }
  };

  const value = {
    user,
    isAuthLoading,
    sessions,
    showDeviceNicknameModal,
    setShowDeviceNicknameModal,
    pendingUser,
    isBanned,
    isSuspended,
    suspendedUntil,
    suspensionReason,
    customUserId,
    sessionId,
    loginWithGoogle,
    continueAsGuest,
    loginWithEmail,
    signUpWithEmail,
    sendOtp,
    verifyOtp,
    checkEmailVerificationStatus,
    resendVerificationEmail,
    updateProfile,
    renameSession,
    terminateSession,
    logout,
    deleteAccount,
    syncDeviceSession,
    refreshSessions,
    showAlert,
    showConfirm
  };

  const morphism = localStorage.getItem('aura_morphism') || 'glassmorphism';

  return (
    <AuthContext.Provider value={value}>
      {children}
      {dialogConfig && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 select-none animate-in fade-in duration-200">
          {morphism === "neobrutalism" ? (
            <div className="ladybug-card relative w-full max-w-sm my-auto animate-in zoom-in-95 duration-200 border-3 border-black shadow-[8px_8px_0px_rgba(0,0,0,1)] bg-theme-accent">
              <div className="ladybug-head border-b-3 border-black flex items-center justify-between px-4 py-2 bg-white text-black font-black uppercase text-xs tracking-wider">
                <span>{dialogConfig.title}</span>
                <div className="flex gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56] border-2 border-black cursor-pointer hover:scale-110 transition-transform" onClick={dialogConfig.onCancel}></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e] border-2 border-black"></span>
                  <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f] border-2 border-black"></span>
                </div>
              </div>
              <div className="ladybug-content p-5 text-black">
                <div className="font-bold text-[13px] leading-relaxed mb-5">
                  {dialogConfig.message}
                </div>
                <div className="flex justify-end gap-3">
                  {dialogConfig.type === 'confirm' && (
                    <button 
                      onClick={dialogConfig.onCancel} 
                      className="px-4 py-2 border-2 border-black bg-white text-black font-black uppercase text-[11px] tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_rgba(0,0,0,1)] hover:bg-neutral-50 transition-all cursor-pointer"
                    >
                      Cancel
                    </button>
                  )}
                  <button 
                    onClick={dialogConfig.onConfirm} 
                    className="px-4 py-2 border-2 border-black bg-[#ffde4b] text-black font-black uppercase text-[11px] tracking-wider shadow-[2px_2px_0px_rgba(0,0,0,1)] active:translate-x-[1px] active:translate-y-[1px] active:shadow-[1px_1px_0px_rgba(0,0,0,1)] hover:bg-[#ffe56f] transition-all cursor-pointer"
                  >
                    OK
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="relative w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/10 bg-ink-950/95 shadow-2xl backdrop-blur-2xl animate-in zoom-in-95 duration-200 p-6 flex flex-col">
              <h2 className="text-sm font-bold text-white mb-2 text-left tracking-wider uppercase opacity-40">{dialogConfig.title}</h2>
              <p className="text-xs text-white/80 mb-6 text-left leading-relaxed">
                {dialogConfig.message}
              </p>
              <div className="flex justify-end gap-3">
                {dialogConfig.type === 'confirm' && (
                  <button 
                    onClick={dialogConfig.onCancel} 
                    className="rounded-full bg-white/[0.06] px-5 py-2 text-xs font-bold text-white hover:bg-white/[0.1] transition-colors"
                  >
                    Cancel
                  </button>
                )}
                <button 
                  onClick={dialogConfig.onConfirm} 
                  className="rounded-full bg-sage-400 px-5 py-2 text-xs font-bold text-ink-950 hover:bg-sage-300 transition-colors"
                >
                  OK
                </button>
              </div>
            </div>
          )}
        </div>,
        document.body
      )}
    </AuthContext.Provider>
  );
};
