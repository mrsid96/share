import { useEffect } from 'react';
import { useAuthStore } from '../store/auth.store';
import { subscribeToAuthState, signInAnonymous, getCurrentUser } from '../services/firebase/auth.service';
import { generateDeviceName } from '../utils/device-name';

let initialized = false;

function initAuth() {
  if (initialized) return;
  initialized = true;

  const store = useAuthStore.getState();

  // Restore or set device name in session
  if (!store.deviceName) {
    let name = '';
    try {
      name = sessionStorage.getItem('share_device_name') || sessionStorage.getItem('sharewave_device_name') || '';
    } catch {
      // Ignore
    }
    if (!name) {
      name = generateDeviceName();
      try {
        sessionStorage.setItem('share_device_name', name);
      } catch {
        // Ignore
      }
    }
    store.setDeviceName(name);
  }

  // Check if Firebase already has a currentUser cached in memory
  const current = getCurrentUser();
  if (current) {
    store.setUser(current);
    store.setLoading(false);
  }

  // Global listener: survives React StrictMode mount/unmount cycles
  subscribeToAuthState((authUser) => {
    store.setUser(authUser);
    store.setLoading(false);
    if (authUser) {
      store.setError(null);
    }
  });

  // If not authenticated, sign in anonymously
  signInAnonymous()
    .then((user) => {
      store.setUser(user);
      store.setLoading(false);
      store.setError(null);
    })
    .catch((err) => {
      // If already signed in via listener, don't override with error
      if (!useAuthStore.getState().user) {
        store.setError(err.message || 'Authentication failed. Please check network.');
        store.setLoading(false);
      }
    });
}

// Start auth immediately on module load in browser
if (typeof window !== 'undefined') {
  initAuth();
}

export function useAuth() {
  const store = useAuthStore();

  useEffect(() => {
    initAuth();
  }, []);

  return {
    user: store.user,
    isAuthenticated: store.isAuthenticated,
    isLoading: store.isLoading,
    error: store.error,
    deviceName: store.deviceName,
  };
}
