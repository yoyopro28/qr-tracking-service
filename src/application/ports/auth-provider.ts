export interface AuthSession {
  userId: string;
  email: string | null;
  accessToken: string;
}

export type SessionListener = (session: AuthSession | null) => void;
export type Unsubscribe = () => void;

export interface AuthProvider {
  getSession(): Promise<AuthSession | null>;
  signInWithOtp(email: string): Promise<void>;
  signInWithGoogle(): Promise<void>;
  signInWithPassword(email: string, password: string): Promise<void>;
  signUpWithPassword(email: string, password: string): Promise<void>;
  signOut(): Promise<void>;
  onSessionChanged(listener: SessionListener): Unsubscribe;
}
