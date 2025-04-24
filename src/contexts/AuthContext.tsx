
import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  signInWithEmailAndPassword, 
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { auth } from '../config/firebase';
import { useToast } from '../hooks/use-toast';

type UserRole = 'student' | 'teacher' | 'hod';

interface AuthContextType {
  currentUser: User | null;
  userRole: UserRole | null;
  loading: boolean;
  login: (email: string, password: string, role: UserRole) => Promise<void>;
  logout: () => Promise<void>;
  setUserRole: (role: UserRole) => void;
  createHOD: (email: string, password: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userRole, setUserRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      if (user) {
        const storedRole = localStorage.getItem('userRole') as UserRole | null;
        setUserRole(storedRole);
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const validateRole = (email: string, requestedRole: UserRole): boolean => {
    if (requestedRole === 'hod' && email !== 'nithesh@gmail.com') {
      throw new Error('Only nithesh@gmail.com can be HOD');
    }
    return true;
  };

  const login = async (email: string, password: string, role: UserRole) => {
    try {
      if (!validateRole(email, role)) {
        throw new Error('Invalid role for this email');
      }
      await signInWithEmailAndPassword(auth, email, password);
      setUserRole(role);
      localStorage.setItem('userRole', role);
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: "Login Error",
        description: error.message || "Failed to login"
      });
      throw error;
    }
  };

  const createHOD = async (email: string, password: string) => {
    try {
      if (email !== 'nithesh@gmail.com') {
        throw new Error('Only nithesh@gmail.com can be HOD');
      }
      await createUserWithEmailAndPassword(auth, email, password);
      toast({
        title: "Success",
        description: "HOD account created successfully"
      });
    } catch (error: any) {
      console.error("HOD creation error:", error);
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message || "Failed to create HOD account"
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await firebaseSignOut(auth);
      localStorage.removeItem('userRole');
      setUserRole(null);
    } catch (error) {
      console.error("Logout error:", error);
      throw error;
    }
  };

  const value = {
    currentUser,
    userRole,
    loading,
    login,
    logout,
    setUserRole,
    createHOD
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
