import { useNavigate } from 'react-router-dom'
import { PlusCircle, PlayCircle, Trophy, Users, BarChart3, Wifi, Smartphone, Gauge, ShieldCheck, Eye, Activity } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { matchService } from '../services/matchService'
import { useMatchStore } from '../store/useMatchStore'
import { useMemo } from 'react'

export default function Home() {
  const navigate = useNavigate()
  const { myMatches } = useMatchStore()

  const { data: liveMatches, isLoading } = useQuery({
      queryKey: ['live-matches'],
      queryFn: () => matchService.getMatches(),
      refetchInterval: 5000 // Poll every 5 seconds for live scores
  })

  // Sort: My Matches first, then others
  const sortedMatches = useMemo(() => {
    if (!liveMatches) return []
    return [...liveMatches].sort((a, b) => {
        const aMine = myMatches.some(m => m.id === a.id)
        const bMine = myMatches.some(m => m.id === b.id)
        if (aMine && !bMine) return -1
        if (!aMine && bMine) return 1
        return 0
    })
  }, [liveMatches, myMatches])

  const MatchCard = ({ match }) => {
      const currentInning = match.innings[match.innings.length - 1];
      const isSecondInning = match.innings.length > 1;
      const myMatchRecord = myMatches.find(m => m.id === match.id)
      const isMyMatch = !!myMatchRecord

      return (
          <div className={`p-6 shadow-2xl relative overflow-hidden group transition-all rounded-[2rem] border
            ${isMyMatch ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-slate-900/50 border-white/5'}`}>
              
              <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                  {isMyMatch ? <ShieldCheck className="w-16 h-16 text-indigo-500" /> : <Activity className="w-20 h-20 text-brand-500" />}
              </div>
              
              <div className="flex justify-between items-start mb-4 relative z-10">
                  <div className="flex gap-2">
                    <span className="bg-red-500 text-white text-[10px] font-black px-3 py-1 rounded-full animate-pulse flex items-center gap-1">
                        <div className="w-1 h-1 bg-white rounded-full" /> LIVE
                    </span>
                    {isMyMatch && <span className="bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-full flex items-center gap-1 uppercase tracking-tighter">My Match</span>}
                  </div>
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{match.mode} Match</span>
              </div>

              <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-center">
                      <div className="flex flex-col">
                          <span className="text-sm font-black text-white uppercase tracking-tight">{match.teamA}</span>
                          <span className="text-xl font-black text-brand-400 tabular-nums">
                             {match.innings[0]?.totalRuns || 0}<span className="text-slate-700">/</span>{match.innings[0]?.totalWickets || 0}
                          </span>
                      </div>
                      <div className="text-slate-800 font-black text-lg italic">VS</div>
                      <div className="flex flex-col items-end text-right">
                          <span className="text-sm font-black text-white uppercase tracking-tight">{match.teamB}</span>
                          <span className="text-xl font-black text-white tabular-nums">
                             {isSecondInning ? `${currentInning.totalRuns}/${currentInning.totalWickets}` : '...'}
                          </span>
                      </div>
                  </div>

                  {match.target && (
                      <div className="bg-brand-500/5 border border-brand-500/10 rounded-xl py-2 px-3 text-center">
                          <p className="text-[9px] font-black text-brand-400 uppercase tracking-widest">Target: {match.target} Runs</p>
                      </div>
                  )}

                  <div className={`grid gap-3 pt-2 ${isMyMatch ? 'grid-cols-2' : 'grid-cols-1'}`}>
                       <button 
                         onClick={() => navigate(`/match/${match.id}?role=viewer`)}
                         className="bg-slate-800 hover:bg-slate-700 text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 border border-white/5"
                       >
                           <Eye className="w-4 h-4" /> WATCH LIVE
                       </button>
                       {isMyMatch && (
                           <button 
                             onClick={() => navigate(`/match/${match.id}?role=umpire`, { state: { autoVerifyPin: myMatchRecord.pin } })}
                             className="bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                           >
                               <ShieldCheck className="w-4 h-4" /> MANAGE SCORE
                           </button>
                       )}
                  </div>
              </div>
          </div>
      )
  }

  return (
    <div className="p-6 pb-40 max-w-lg mx-auto min-h-screen bg-slate-950 flex flex-col pt-12 relative z-10 w-full animate-fade-in">
      
      {/* Header Panel */}
      <div className="mb-10 text-center">
        <div className="inline-flex p-3 rounded-3xl bg-brand-500/10 mb-4 ring-1 ring-brand-500/20">
            <Trophy className="w-8 h-8 text-brand-500" />
        </div>
        <h1 className="text-5xl font-black text-white tracking-tighter leading-none mb-2">CrickBot<span className="text-brand-500">PRO</span></h1>
        <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">Professional Analytics Platform</p>
      </div>

      {/* Lobby Section */}
      <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between px-2">
              <h2 className="text-xs font-black text-slate-500 tracking-[0.3em] uppercase">Live Match Lobby</h2>
              <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse shadow-[0_0_8px_#22c55e]" />
                  <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Global Server</span>
              </div>
          </div>

          <div className="space-y-4">
              {isLoading ? (
                  <div className="bg-slate-900/30 h-40 rounded-[2rem] border border-white/5 animate-pulse flex items-center justify-center">
                      <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.5em]">Scanning Grid...</span>
                  </div>
              ) : sortedMatches?.length > 0 ? (
                  sortedMatches.filter(m => m.status === 'live').map(m => (
                      <MatchCard key={m.id} match={m} />
                  ))
              ) : (
                  <div className="text-center py-12 px-6 bg-slate-900/20 border border-white/5 rounded-[2rem] border-dashed">
                      <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                        <Wifi className="w-6 h-6 text-slate-600" />
                      </div>
                      <p className="text-slate-600 font-black text-xs uppercase tracking-widest">No Matches Live Right Now</p>
                      <p className="text-slate-800 text-[9px] mt-1 font-bold uppercase">Be the first to start a tournament.</p>
                  </div>
              )}
          </div>
      </div>

      {/* Fixed Action Button */}
      <div className="fixed bottom-8 left-0 right-0 px-6 max-w-lg mx-auto z-[50]">
          <button 
            onClick={() => navigate('/setup')}
            className="w-full h-16 bg-brand-500 rounded-full font-black text-lg text-white shadow-2xl shadow-brand-500/40 ring-4 ring-slate-950 flex items-center justify-center gap-3 active:scale-95 transition-all group"
          >
            <PlusCircle className="w-6 h-6 group-hover:rotate-90 transition-transform" /> START NEW MATCH
          </button>
      </div>
    </div>
  )
}
