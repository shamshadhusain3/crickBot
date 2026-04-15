import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Zustand store with persistence via localStorage.
// This survives accidental browser refreshes.
export const useMatchStore = create(
  persist(
    (set) => ({
      // State
      activeMatchId: null,
      teamA: '',
      teamB: '',
      overs: 5,
      includeExtras: true,
      battingTeam: '',
      winner: '', // Toss winner
      decision: '', // bat or bowl
      
      // Actions
      setSetupData: (data) => set({ ...data }),
      
      setTossResult: (winner, decision, battingTeam) => set({ 
         winner, 
         decision, 
         battingTeam 
      }),
      
      setActiveMatch: (id) => set({ activeMatchId: id }),
      
      clearMatch: () => set({ 
         activeMatchId: null, 
         teamA: '', 
         teamB: '', 
         battingTeam: '', 
         winner: '', 
         decision: '' 
      }),
    }),
    {
      name: 'crickbot-match-storage', // key in local storage
    }
  )
);
