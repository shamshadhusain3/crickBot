import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Zustand store with persistence via localStorage.
// This survives accidental browser refreshes.
export const useMatchStore = create(
  persist(
    (set) => ({
      // State
      activeMatchId: null,
      mode: 'quick', 
      teamA: '',
      teamB: '',
      rosterA: [],
      rosterB: [],
      overs: 5,
      includeExtras: true,
      battingTeam: '',
      winner: '', // Toss winner
      decision: '', // bat or bowl
      umpirePin: '', // 4-digit PIN
      myMatches: [], // { id, pin } Array of matches managed by this user
      liveCache: {}, // { [matchId]: lastKnownState }
      pendingActions: [], // [{ matchId, payload, timestamp }]


      
      // Actions
      addMatchToCollection: (id, pin) => set((state) => ({ 
          myMatches: [...state.myMatches.filter(m => m.id !== id), { id, pin }] 
      })),

      setSetupData: (data) => set({ ...data }),
      
      setTossResult: (winner, decision, battingTeam) => set({ 
         winner, 
         decision, 
         battingTeam 
      }),
      
      setActiveMatch: (id) => set({ activeMatchId: id }),
      
      clearMatch: () => set({ 
         activeMatchId: null, 
         mode: 'quick',
         rosterA: [],
         rosterB: [],
         teamA: '', 
         teamB: '', 
         battingTeam: '', 
         winner: '', 
         decision: '',
         umpirePin: ''
      }),

      updateLiveCache: (matchId, data) => set((state) => ({
          liveCache: { ...state.liveCache, [matchId]: { ...state.liveCache[matchId], ...data, timestamp: Date.now() } }
      })),

      addToPendingActions: (matchId, payload) => set((state) => ({
          pendingActions: [...state.pendingActions, { matchId, payload, timestamp: Date.now() }]
      })),

      clearPendingActions: (matchId) => set((state) => ({
          pendingActions: state.pendingActions.filter(a => a.matchId !== matchId)
      })),


    }),
    {
      name: 'crickbot-match-storage', // key in local storage
    }
  )
);
