import {
  signInAnonymously,
  onAuthStateChanged,
  type User,
} from 'firebase/auth';
import { auth } from './firebase';

export async function signInAnonymous(): Promise<User> {
  try {
    const result = await signInAnonymously(auth);
    return result.user;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Authentication failed';
    throw new Error(message);
  }
}

export function subscribeToAuthState(
  callback: (user: User | null) => void
): () => void {
  return onAuthStateChanged(auth, callback);
}

export function getCurrentUser(): User | null {
  return auth.currentUser;
}
