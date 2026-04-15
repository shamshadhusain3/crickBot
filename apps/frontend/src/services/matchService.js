import apiClient from '../api/client';

export const matchService = {
  createMatch: async (payload) => {
    // API Expects: { teamA, teamB, overs, includeExtras, battingTeam }
    return await apiClient.post('/matches', payload);
  },
  
  getMatch: async (id) => {
    return await apiClient.get(`/matches/${id}`);
  },

  recordDelivery: async (matchId, payload) => {
    // API Expects: { run, isExtra, extraType, isWicket }
    return await apiClient.post(`/matches/${matchId}/deliveries`, payload);
  }
};
