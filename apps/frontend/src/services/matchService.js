import apiClient from '../api/client';

export const matchService = {
  createMatch: async (payload) => {
    // API Expects: { teamA, teamB, overs, includeExtras, battingTeam, umpirePin, bowlerOverLimit }
    return await apiClient.post('/matches', payload);
  },
  
  getMatches: async () => {
    return await apiClient.get('/matches');
  },
  
  getMatch: async (id) => {
    return await apiClient.get(`/matches/${id}`);
  },

  recordDelivery: async (matchId, payload) => {
    // API Expects: { run, isExtra, extraType, isWicket, pin }
    return await apiClient.post(`/matches/${matchId}/deliveries`, payload);
  },

  updateActivePlayers: async (matchId, payload) => {
    // API Expects: { strikerId, nonStrikerId, currentBowlerId, pin }
    return await apiClient.post(`/matches/${matchId}/innings/players`, payload);
  }
};
