import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Coins, ChevronLeft, ArrowRight, Activity } from 'lucide-react'
import { useMatchStore } from '../store/useMatchStore'
import { matchService } from '../services/matchService'
import { useMutation } from '@tanstack/react-query'

export default function Toss() {
  const navigate = useNavigate()
  
  // Cleanly extract all values globally from Zustand
  const { teamA, teamB, overs, includeExtras, setTossResult, setActiveMatch } = useMatchStore()
  
  // Automatically boot out if state is missing
  if (!teamA || !teamB) {
     return <div className="p-6 text-center text-white">Missing Teams. <button onClick={() => navigate('/setup')} className="text-brand-500">Go Back</button></div>
  }

  const [flipping, setFlipping] = useState(false)
  const [winner, setWinner] = useState(null)
  const [decision, setDecision] = useState(null) // 'bat' | 'bowl'

  // TanStack Query Mutation wrapper for API integrity
  const { mutateAsync: launchMatch, isPending } = useMutation({
    mutationFn: (payload) => matchService.createMatch(payload),
    onSuccess: (data) => {
        // Hydrate Zustand with the new official backend match ID
        setActiveMatch(data.id)
        navigate('/live')
    },
    onError: (err) => {
        console.error("Match Start Failed", err)
        alert("Failed to connect to backend server.")
    }
  })

  const handleFlip = () => {
    setFlipping(true)
    setWinner(null)
    setDecision(null)
    setTimeout(() => {
      const isTeamA = Math.random() > 0.5
      setWinner(isTeamA ? teamA : teamB)
      setFlipping(false)
    }, 1500)
  }

  const handleStart = async () => {
    const batTeam = (winner === teamA && decision === 'bat') || (winner === teamB && decision === 'bowl') ? teamA : teamB;
    setTossResult(winner, decision, batTeam);

    await launchMatch({
       teamA, 
       teamB, 
       overs, 
       includeExtras, 
       battingTeam: batTeam
    });
  }

  return (
    <div className="p-6 min-h-screen flex flex-col animate-fade-in relative z-10">
      <button onClick={() => navigate(-1)} className="p-2 -ml-2 mb-6 inline-block opacity-70 hover:opacity-100 transition-opacity">
        <ChevronLeft className="w-7 h-7" />
      </button>

      <div className="text-center mb-10">
        <div className="inline-block px-4 py-1.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-sm font-semibold mb-4">
          {overs} Overs Match
        </div>
        <h1 className="text-4xl font-extrabold text-white">The Toss</h1>
        <p className="text-slate-400 mt-2 font-medium text-lg">{teamA} <span className="text-brand-500 text-sm mx-2 font-bold">vs</span> {teamB}</p>
      </div>

      <div className="flex-1 flex flex-col items-center justify-center -mt-10">
        <div className="relative mb-12">
            <div className={`w-36 h-36 rounded-full border-4 border-yellow-500/40 bg-gradient-to-tr from-yellow-600 via-yellow-400 to-yellow-200 shadow-2xl flex items-center justify-center shadow-yellow-500/30 z-10 relative ${flipping ? 'animate-[flip_0.6s_infinite_linear]' : ''}`}>
               <Coins className="w-14 h-14 text-yellow-900 drop-shadow-md" />
            </div>
            <div className={`absolute -bottom-4 left-1/2 -translate-x-1/2 w-24 h-4 bg-black/40 blur-md rounded-full transition-all ${flipping ? 'scale-50 opacity-20' : 'scale-100 opacity-60'}`} />
        </div>

        <div className="h-48 w-full flex flex-col items-center justify-start">
            {!winner && !flipping && (
              <button 
                onClick={handleFlip} 
                className="btn-primary w-fit px-10 py-4 rounded-full text-lg shadow-brand-500/40"
              >
                Flip Coin
              </button>
            )}

            {flipping && (
              <div className="flex items-center gap-3 animate-pulse">
                  <Activity className="w-5 h-5 text-brand-400" />
                  <p className="text-brand-400 font-bold tracking-wide text-lg">Flipping in the air...</p>
              </div>
            )}

            {winner && !flipping && (
              <div className="glass-panel p-6 w-full text-center animate-fade-in border-brand-500/40 bg-brand-500/5">
                <h2 className="text-2xl font-extrabold text-white mb-1"><span className="text-brand-400">{winner}</span> won!</h2>
                <p className="text-sm font-medium text-slate-400 mb-5 border-b border-white/5 pb-4">What will they choose to do?</p>
                
                <div className="flex gap-4">
                  <button 
                    onClick={() => setDecision('bat')}
                    className={`flex-1 py-4 rounded-xl font-extrabold text-lg transition-all ${decision === 'bat' ? 'bg-brand-500 text-white ring-2 ring-brand-400 shadow-lg shadow-brand-500/30 scale-105' : 'bg-slate-800 text-slate-300 border border-slate-700/50 hover:bg-slate-750'}`}
                  >
                    Bat
                  </button>
                  <button 
                    onClick={() => setDecision('bowl')}
                    className={`flex-1 py-4 rounded-xl font-extrabold text-lg transition-all ${decision === 'bowl' ? 'bg-brand-500 text-white ring-2 ring-brand-400 shadow-lg shadow-brand-500/30 scale-105' : 'bg-slate-800 text-slate-300 border border-slate-700/50 hover:bg-slate-750'}`}
                  >
                    Bowl
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>
      
       {decision && (
         <div className="pb-8 animate-fade-in">
             <button onClick={handleStart} disabled={isPending} className="btn-primary py-4 text-lg group disabled:opacity-50">
                {isPending ? 'Starting Server...' : 'Start Dashboard'}
                {!isPending && <ArrowRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform"/>}
             </button>
         </div>
       )}
      
      <div className="absolute bottom-[0%] right-[0%] w-96 h-96 bg-brand-500/10 blur-[120px] rounded-full pointer-events-none" />
    </div>
  )
}
