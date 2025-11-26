// src/store/useB2BOrgStore.ts
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

// ==========================================
// 1. Definisi Tipe Data (Interfaces)
// ==========================================

export interface B2BOrgInfo {
  id: number;
  name: string | null;
  logo?: string | null;
  status?: boolean | null;
}

export interface B2BUserProfile {
  nationality?: string;
  country_origin?: string;
  first_language?: string;
}

export interface B2BUser {
  id: number;
  name: string;
  email?: string | null;
  username: string;
}

interface B2BOrgState {
  // State Variables
  orgId: number | null;
  org: B2BOrgInfo | null;
  user: B2BUser | null;
  profile: B2BUserProfile | null;
  
  // Actions
  setContext: (payload: {
    orgId: number;
    org: B2BOrgInfo;
    user: B2BUser;
    profile: B2BUserProfile | null;
  }) => void;
  clear: () => void;
}

// ==========================================
// 2. Pembuatan Store dengan Persist
// ==========================================

export const useB2BOrgStore = create(
  persist<B2BOrgState>(
    (set) => ({
      // Initial State
      orgId: null,
      org: null,
      user: null,
      profile: null,

      // Action: Set Context (Login ke Org tertentu)
      setContext: ({ orgId, org, user, profile }) =>
        set({ 
          orgId, 
          org, 
          user, 
          profile 
        }),

      // Action: Clear Context (Logout atau ganti Org)
      clear: () => 
        set({ 
          orgId: null, 
          org: null, 
          user: null, 
          profile: null 
        }),
    }),
    {
      name: 'b2b-org-storage', // Nama key di LocalStorage
      storage: createJSONStorage(() => localStorage), // Menggunakan LocalStorage
      
      // Opsional: Jika Anda hanya ingin menyimpan field tertentu saja
      // partialize: (state) => ({ orgId: state.orgId, org: state.org }), 
    }
  )
);