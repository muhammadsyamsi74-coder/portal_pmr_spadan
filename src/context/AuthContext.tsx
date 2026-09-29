import React, { createContext, useContext, useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';
import { UserProfile } from '../types';

interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  loading: boolean;
  isLoginModalOpen: boolean;
  isRegisterModalOpen: boolean;
  isForgotPasswordModalOpen: boolean;
  isEditProfileModalOpen: boolean;
  isResetPasswordModalOpen: boolean;
  verifyMemberId: string | null;
  openLoginModal: () => void;
  closeLoginModal: () => void;
  openRegisterModal: () => void;
  closeRegisterModal: () => void;
  openForgotPasswordModal: () => void;
  closeForgotPasswordModal: () => void;
  openEditProfileModal: () => void;
  closeEditProfileModal: () => void;
  openResetPasswordModal: () => void;
  closeResetPasswordModal: () => void;
  closeVerifyModal: () => void;
  refreshProfile: () => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  // Modal states
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isRegisterModalOpen, setIsRegisterModalOpen] = useState(false);
  const [isForgotPasswordModalOpen, setIsForgotPasswordModalOpen] = useState(false);
  const [isEditProfileModalOpen, setIsEditProfileModalOpen] = useState(false);
  const [isResetPasswordModalOpen, setIsResetPasswordModalOpen] = useState(false);
  const [verifyMemberId, setVerifyMemberId] = useState<string | null>(null);

  // Check URL query parameters for verify_id on load
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const vId = urlParams.get('verify_id');
      if (vId) {
        setVerifyMemberId(vId);
      }
    } catch {
      // Ignore
    }
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('users_profile')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('Profil belum ditemukan/belum lengkap:', error.message);
        setProfile(null);
        return null;
      }
      setProfile(data as UserProfile);
      return data as UserProfile;
    } catch (err) {
      console.error('Error fetching profile:', err);
      setProfile(null);
      return null;
    }
  };

  const refreshProfile = async () => {
    try {
      const { data: { user: currentUser } } = await supabase.auth.getUser();
      setUser(currentUser);
      if (currentUser) {
        await fetchProfile(currentUser.id);
      } else {
        setProfile(null);
      }
    } catch (err) {
      console.error('Error refreshing profile:', err);
    }
  };

  useEffect(() => {
    // Initial session check
    supabase.auth.getUser().then(({ data: { user: currentUser } }) => {
      setUser(currentUser);
      if (currentUser) {
        fetchProfile(currentUser.id).finally(() => setLoading(false));
      } else {
        setProfile(null);
        setLoading(false);
      }
    }).catch(() => {
      setUser(null);
      setProfile(null);
      setLoading(false);
    });

    // Auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        setIsResetPasswordModalOpen(true);
      }

      const currentUser = session?.user ?? null;
      setUser(currentUser);

      if (currentUser) {
        await fetchProfile(currentUser.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const logout = async () => {
    try {
      await supabase.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.warn('Logout signOut warning:', err);
    } finally {
      // Selalu pastikan state user dan profile bersih saat logout
      setUser(null);
      setProfile(null);
      try {
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('sb-') || key.includes('supabase.auth'))) {
            localStorage.removeItem(key);
          }
        }
      } catch (e) {
        console.warn('Pembersihan localStorage error:', e);
      }
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isLoginModalOpen,
        isRegisterModalOpen,
        isForgotPasswordModalOpen,
        isEditProfileModalOpen,
        isResetPasswordModalOpen,
        verifyMemberId,
        openLoginModal: () => setIsLoginModalOpen(true),
        closeLoginModal: () => setIsLoginModalOpen(false),
        openRegisterModal: () => setIsRegisterModalOpen(true),
        closeRegisterModal: () => setIsRegisterModalOpen(false),
        openForgotPasswordModal: () => {
          setIsLoginModalOpen(false);
          setIsForgotPasswordModalOpen(true);
        },
        closeForgotPasswordModal: () => setIsForgotPasswordModalOpen(false),
        openEditProfileModal: () => setIsEditProfileModalOpen(true),
        closeEditProfileModal: () => setIsEditProfileModalOpen(false),
        openResetPasswordModal: () => setIsResetPasswordModalOpen(true),
        closeResetPasswordModal: () => setIsResetPasswordModalOpen(false),
        closeVerifyModal: () => setVerifyMemberId(null),
        refreshProfile,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
