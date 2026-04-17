import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Settings, Circle, Wifi, WifiOff, UserPlus, Repeat, UserCheck, ShieldAlert, ChevronDown, ChevronUp, Eye, EyeOff, BarChart3, History } from 'lucide-react'
import { useSocket } from '../hooks/useSocket'
import { useMatchStore } from '../store/useMatchStore'
import { matchService } from '../services/matchService'
import { useMutation, useQuery } from '@tanstack/react-query'

export default function LiveMatch() {
  const navigate = useNavigate()
  const { activeMatchId, mode, rosterA, rosterB, includeExtras, battingTeam, teamA, teamB, overs } = useMatchStore()
  
  if (!activeMatchId && !teamA) {
     return <div className="p-6 text-center text-white min-h-screen pt-20">Match corrupted.<br/><button onClick={() => navigate('/setup')} className="mt-4 px-4 py-2 bg-brand-500 rounded-full font-bold">Go Back</button></div>
  }
  
  const bowlingTeam = battingTeam === teamA ? teamB : teamA
  const battingRoster = useMemo(() => (battingTeam === teamA ? rosterA : rosterB), [battingTeam, rosterA, rosterB])
  const bowlingRoster = useMemo(() => (bowlingTeam === teamA ? rosterA : rosterB), [bowlingTeam, rosterA, rosterB])

  // --- STATE ---
  const [runs, setRuns] = useState(0)
  const [wickets, setWickets] = useState(0)
  const [oversCount, setOversCount] = useState(0)
  const [ballsThisOver, setBallsThisOver] = useState(0)
  const [currentOverHistory, setCurrentOverHistory] = useState([])
  
  const [strikerId, setStrikerId] = useState(null)
  const [nonStrikerId, setNonStrikerId] = useState(null)
  const [currentBowlerId, setCurrentBowlerId] = useState(null)
  const [stats, setStats] = useState(null)
  
  const [overlayMessage, setOverlayMessage] = useState(null)
  const [target, setTarget] = useState(null)
  const [showOutList, setShowOutList] = useState(false)
  const [showBowlerStats, setShowBowlerStats] = useState(false)
  const [expandedBowlerId, setExpandedBowlerId] = useState(null)
  const [useAiCamera, setUseAiCamera] = useState(false)

  // --- API HYDRATION ---
  const { data: initialData, isLoading } = useQuery({
      queryKey: ['match', activeMatchId],
      queryFn: () => matchService.getMatch(activeMatchId),
      enabled: !!activeMatchId
  })

  useEffect(() => {
    if (initialData && !initialData.error) {
        const lastInning = initialData.innings[initialData.innings.length - 1]
        setRuns(lastInning.totalRuns)
        setWickets(lastInning.totalWickets)
        setStrikerId(lastInning.strikerId || null)
        setNonStrikerId(lastInning.nonStrikerId || null)
        setCurrentBowlerId(lastInning.currentBowlerId || null)
        setTarget(initialData.target)
        setStats(initialData.stats)
        
        const legalBalls = lastInning.deliveries.filter(d => d.extras === 0).length
        setOversCount(Math.floor(legalBalls / 6))
        setBallsThisOver(legalBalls % 6)
        
        if (initialData.status === 'completed') {
            setOverlayMessage({ title: "Match Over", subtitle: "This match has already finished." })
        }
    }
  }, [initialData])

  // --- SOCKET SYNC ---
  const { isConnected, matchData } = useSocket(activeMatchId);

  useEffect(() => {
     if (matchData) {
         if (matchData.score) {
            setRuns(matchData.score.runs)
            setWickets(matchData.score.wickets)
            setOversCount(matchData.score.overs)
            setBallsThisOver(matchData.score.balls)
         }
         
         if (matchData.delivery) {
             let label = matchData.delivery.wicketType !== 'none' ? 'W' : (matchData.delivery.extras > 0 ? `${matchData.delivery.extraType.charAt(0).toUpperCase()}` : matchData.delivery.runs.toString())
             setCurrentOverHistory(prev => {
                const updated = [...prev, { label, ...matchData.delivery }]
                return updated.length > 8 ? updated.slice(1) : updated
             })
             if (matchData.score.balls === 0 && matchData.delivery.extras === 0) setCurrentOverHistory([])
         }

         setStrikerId(matchData.strikerId || null)
         setNonStrikerId(matchData.nonStrikerId || null)
         setCurrentBowlerId(matchData.currentBowlerId || null)
         setStats(matchData.stats)

         if (matchData.event === 'inning-break') {
            setTarget(matchData.target);
            setOverlayMessage({ title: "Inning Break", subtitle: `Target for ${matchData.newBattingTeam} is ${matchData.target} runs.` })
         } else if (matchData.event === 'match-completed') {
            setOverlayMessage({ title: "Match Over!", subtitle: `${matchData.winningTeam} won. ${matchData.reason}` })
         }
     }
  }, [matchData])

  // --- MUTATIONS ---
  const { mutateAsync: postDelivery, isPending } = useMutation({
      mutationFn: (payload) => matchService.recordDelivery(activeMatchId, payload),
      onError: (err) => alert(err.response?.data?.error || "Failed to record ball")
  })

  const { mutate: updatePlayers } = useMutation({
      mutationFn: (ids) => matchService.updateActivePlayers(activeMatchId, ids)
  })

  const handleSelection = (type, playerId) => {
      const payload = {}
      if (type === 'striker') payload.strikerId = playerId
      if (type === 'nonStriker') payload.nonStrikerId = playerId
      if (type === 'bowler') payload.currentBowlerId = playerId
      updatePlayers(payload)
  }

  const sendDelivery = async (run, isExtra = false, extraType = '', isWicket = false) => {
    if (overlayMessage || isPending) return;
    await postDelivery({ run, isExtra, extraType, isWicket })
  }

  const swapStrikeManual = () => {
      updatePlayers({ strikerId: nonStrikerId, nonStrikerId: strikerId })
  }

  // --- RENDER HELPERS ---
  const needsBatters = mode === 'pro' && (!strikerId || !nonStrikerId)
  const needsBowler = mode === 'pro' && strikerId && nonStrikerId && !currentBowlerId
  const isSelectionRequired = needsBatters || needsBowler

  const SelectionOverlay = () => {
    if (!isSelectionRequired) return null

    return (
        <div className="absolute inset-x-0 bottom-0 z-50 bg-slate-900 border-t border-white/10 rounded-t-[2.5rem] p-6 animate-slide-up shadow-[0_-20px_50px_rgba(0,0,0,0.8)] pb-12">
            <div className="w-10 h-1 bg-slate-700 rounded-full mx-auto mb-6" />
            
            <div className="flex flex-col items-center mb-6">
                <div className={`p-3 rounded-full mb-3 ${needsBatters ? 'bg-brand-500/20 text-brand-500' : 'bg-indigo-500/20 text-indigo-400'}`}>
                    {needsBatters ? <UserPlus className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                </div>
                <h3 className="text-2xl font-black text-white tracking-tighter">
                    {needsBatters ? "Select Batters" : "Select Bowler"}
                </h3>
                <p className="text-slate-500 text-xs mt-1 text-center font-bold">
                    {needsBatters ? "Choose active striker & non-striker" : `Select bowler for ${bowlingTeam}`}
                </p>
            </div>

            <div className="grid grid-cols-2 gap-2 max-h-[35vh] overflow-y-auto pb-6 scrollbar-none">
                {(needsBowler ? bowlingRoster : battingRoster).map(p => {
                    const isActive = (p.id === strikerId || p.id === nonStrikerId || p.id === currentBowlerId)
                    const isOut = stats?.outBatters?.some(out => out.id === p.id)
                    
                    return (
                      <button 
                          key={p.id}
                          disabled={isActive || isOut}
                          onClick={() => handleSelection(needsBatters ? (!strikerId ? 'striker' : 'nonStriker') : 'bowler', p.id)}
                          className={`p-3 rounded-xl font-black flex flex-col items-center gap-0.5 transition-all text-sm
                            ${(isActive || isOut) ? 'opacity-20 bg-slate-800' : 'bg-slate-800 border border-slate-700 active:bg-brand-500 active:scale-95'}`}
                      >
                          <span className="text-white line-clamp-1 truncate">{p.name}</span>
                          <span className="text-[8px] text-slate-500 uppercase tracking-widest">{isOut ? 'OUT' : (isActive ? 'ON FIELD' : 'SELECT')}</span>
                      </button>
                    )
                })}
            </div>
        </div>
    )
  }

  const PlayerStatCard = ({ player, isStriker, label }) => {
      const pStats = stats?.[label === 'Striker' ? 'striker' : 'nonStriker']
      const isEmpty = !player

      return (
          <div className={`p-3 rounded-xl border transition-all duration-300 flex-1 relative
            ${isStriker ? 'bg-brand-500/10 border-brand-500 shadow-lg' : 'bg-white/5 border-white/5 opacity-70'}`}>
              
              <div className="flex justify-between items-center mb-1">
                  <span className={`text-[8px] font-black uppercase tracking-widest flex items-center gap-1 ${isStriker ? 'text-brand-400' : 'text-slate-500'}`}>
                      {label} {isStriker && <Circle className="w-1.5 h-1.5 fill-brand-500 text-brand-500 animate-pulse" />}
                  </span>
                  {isStriker && <button onClick={swapStrikeManual} className="p-1 hover:bg-white/10 rounded-md"><Repeat className="w-2.5 h-2.5 text-slate-500"/></button>}
              </div>

              {isEmpty ? (
                  <div className="text-[10px] font-black text-slate-700 italic uppercase py-1">Waiting...</div>
              ) : (
                  <>
                    <div className="text-sm font-black truncate text-white uppercase tracking-tighter">{player.name}</div>
                    <div className="flex justify-between items-end mt-1">
                        <div className="flex gap-2">
                             <span className="text-xs font-black text-white">{pStats?.runs || 0}<span className="text-[9px] text-slate-500 ml-0.5">({pStats?.balls || 0})</span></span>
                        </div>
                        <span className="text-[9px] font-black text-brand-400">SR {pStats?.sr || "0.0"}</span>
                    </div>
                  </>
              )}
          </div>
      )
  }

  const BowlerHUD = () => {
      const b = stats?.bowler
      return (
          <div className="bg-slate-900 border border-white/10 rounded-2xl p-3 flex items-center gap-3 shadow-xl">
              <div className={`w-10  h-10 rounded-xl flex items-center justify-center ${currentBowlerId ? 'bg-indigo-500/20 text-indigo-400' : 'bg-slate-800 text-slate-600'}`}>
                  <UserCheck className="w-6 h-6" />
              </div>
              <div className="flex-1 min-w-0">
                  <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">BOWLER</div>
                  <div className="text-xs font-black text-white truncate uppercase">{currentBowlerId ? (bowlingRoster.find(r => r.id === currentBowlerId)?.name) : "AWAITING"}</div>
              </div>
              <div className="flex gap-3 items-center text-xs">
                  <div className="text-center"><div className="text-[8px] font-black text-slate-600">O</div><div className="font-black text-indigo-400 tabular-nums">{b?.overs || "0.0"}</div></div>
                  <div className="text-center"><div className="text-[8px] font-black text-slate-600">W-R</div><div className="font-black text-white tabular-nums">{b?.wickets || 0}-{b?.runs || 0}</div></div>
                  <div className="text-center"><div className="text-[8px] font-black text-slate-600">E</div><div className="font-black text-slate-500 tabular-nums">{b?.econ || "0.0"}</div></div>
              </div>
          </div>
      )
  }

  if (isLoading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center font-black text-brand-500 animate-pulse uppercase tracking-widest">Hydrating Match...</div>

  return (
    <div className="flex flex-col h-screen max-h-screen bg-slate-950 text-white overflow-hidden relative z-10 w-full font-sans pb-safe">
      
      {overlayMessage && (
          <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-8 text-center">
             <h2 className="text-5xl font-black text-white tracking-widest mb-4 uppercase">{overlayMessage.title}</h2>
             <p className="text-xl text-brand-400 font-bold mb-12 uppercase">{overlayMessage.subtitle}</p>
             <button onClick={() => navigate('/')} className="bg-slate-800 text-white px-10 py-5 rounded-2xl font-black text-lg w-full active:scale-95 transition-all shadow-2xl border border-slate-700">Exit Match</button>
          </div>
      )}

      <SelectionOverlay />

      {/* Header */}
      <div className="px-5 py-3 bg-slate-900 border-b border-white/5 flex flex-col z-10 flex-none">
         <div className="flex justify-between items-center mb-2">
            <div>
                <div className="text-[8px] font-black text-slate-500 tracking-[0.2em] flex items-center gap-1.5 uppercase">
                    {mode} ANALYTICS 
                    <div className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'} animate-pulse`} />
                </div>
                <div className="text-sm font-black tracking-tight uppercase">{teamA} <span className="text-brand-500">v</span> {teamB}</div>
            </div>
            <button 
                onClick={() => setUseAiCamera(!useAiCamera)} 
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[9px] font-black transition-all ${useAiCamera ? 'bg-brand-500 text-white' : 'bg-slate-800 text-slate-400'}`}
            >
                {useAiCamera ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                {useAiCamera ? 'AI ON' : 'AI OFF'}
            </button>
         </div>
         {target && (
             <div className="bg-brand-500/10 border border-brand-500/20 py-2 rounded-xl text-center">
                <span className="text-brand-400 text-[9px] font-black tracking-widest uppercase">Target {target} | Need {Math.max(0, target - runs)} from {Math.max(0, (overs * 6) - (oversCount * 6 + ballsThisOver))} balls</span>
             </div>
         )}
      </div>

      {/* Main Content Area (Flexible) */}
      <div className="flex-1 flex flex-col overflow-hidden px-4">
        
        {/* Batters */}
        <div className="py-2 flex gap-2">
            <PlayerStatCard label="Striker" isStriker={true} player={battingRoster.find(r => r.id === strikerId)} />
            <PlayerStatCard label="Non-Striker" isStriker={false} player={battingRoster.find(r => r.id === nonStrikerId)} />
        </div>

        {/* Big Score */}
        <div className="flex-none text-center py-1">
            <div className="text-5xl font-black tabular-nums tracking-tighter">
                {runs}<span className="text-3xl text-slate-800">/</span><span className="text-brand-400">{wickets}</span>
            </div>
            <div className="text-xs font-black text-slate-500 tracking-widest uppercase">
                {oversCount}.{ballsThisOver} <span className="text-[8px]">Overs</span>
            </div>
        </div>

        {/* Over History Sidebar Replacement (Inline Scroll) */}
        <div className="py-2 flex items-center gap-2 overflow-x-auto scrollbar-none snap-x h-10">
            <div className="text-[8px] font-black text-slate-700 uppercase tracking-widest pr-2 border-r border-white/10">Recent</div>
            {currentOverHistory.map((ball, i) => (
                <div key={i} className={`flex-none w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px] snap-center
                    ${ball.wicketType !== 'none' ? 'bg-red-600' : ball.extras > 0 ? 'bg-orange-600' : 'bg-slate-800 border border-white/5'}`}>
                    {ball.label}
                </div>
            ))}
        </div>

        {/* Stats Section Tabs/Accordion */}
        <div className="flex-1 overflow-y-auto space-y-2 py-2 pr-1 scrollbar-none">
            
            {/* Wickets Analytics */}
            <div>
                <button onClick={() => setShowOutList(!showOutList)} className="flex items-center justify-between w-full p-2 bg-slate-900 border border-white/5 rounded-xl">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <ShieldAlert className="w-3.5 h-3.5 text-red-500"/> Fallen Wickets ({stats?.outBatters?.length || 0})
                    </span>
                    {showOutList ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
                {showOutList && (
                    <div className="mt-2 space-y-1.5 animate-fade-in px-1">
                        {stats?.outBatters?.map((p, i) => (
                            <div key={i} className="bg-black/40 p-3 rounded-2xl border-l-4 border-red-500 flex flex-col gap-1">
                                <div className="flex justify-between items-center">
                                    <span className="text-xs font-black text-white uppercase">{p.name}</span>
                                    <span className="text-xs font-black text-white">{p.runs} <span className="text-[10px] opacity-40">({p.balls})</span></span>
                                </div>
                                <div className="text-[9px] font-black text-slate-500 italic flex items-center gap-1.5 mt-0.5">
                                    <Circle className="w-1.5 h-1.5 fill-red-500/40 text-transparent" />
                                    b <span className="text-brand-400 opacity-90">{p.bowledBy}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Bowler Analytics */}
            <div>
                <button onClick={() => setShowBowlerStats(!showBowlerStats)} className="flex items-center justify-between w-full p-2 bg-slate-900 border border-white/5 rounded-xl">
                    <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                        <BarChart3 className="w-3.5 h-3.5 text-brand-500"/> Bowler History
                    </span>
                    {showBowlerStats ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
                </button>
                {showBowlerStats && (
                    <div className="mt-2 space-y-2 animate-fade-in px-1 pb-4">
                        {stats?.allBowlers?.map((b, i) => (
                            <div key={b.id} className="bg-white/5 rounded-2xl overflow-hidden border border-white/5">
                                <button 
                                    onClick={() => setExpandedBowlerId(expandedBowlerId === b.id ? null : b.id)}
                                    className="w-full p-3 flex items-center gap-3 active:bg-white/5 transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 font-black text-xs">
                                        {b.wickets}W
                                    </div>
                                    <div className="flex-1 text-left">
                                        <div className="text-xs font-black text-white uppercase truncate">{b.name}</div>
                                        <div className="text-[9px] font-black text-slate-500 tracking-tighter uppercase">{b.overs} O · {b.runs} R · {b.econ} ERA</div>
                                    </div>
                                    {expandedBowlerId === b.id ? <ChevronDown className="w-4 h-4 text-slate-600" /> : <History className="w-4 h-4 text-slate-600" />}
                                </button>
                                
                                {expandedBowlerId === b.id && (
                                    <div className="bg-black/40 p-3 space-y-2 border-t border-white/5">
                                        {b.overHistory?.map((oh, idx) => (
                                            <div key={idx} className="flex items-center justify-between">
                                                <span className="text-[9px] font-black text-slate-500 uppercase italic">Over {oh.overNumber}</span>
                                                <div className="flex gap-1.5">
                                                    {oh.balls.split(' ').map((ball, bidx) => (
                                                        <span key={bidx} className={`w-5 h-5 rounded-md flex items-center justify-center text-[8px] font-black
                                                            ${ball === 'W' ? 'bg-red-500/20 text-red-400 border border-red-500/20' : 
                                                              ball === '6' || ball === '4' ? 'bg-brand-500/20 text-brand-400' : 'bg-white/5 text-slate-500 border border-white/5'}`}>
                                                            {ball}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Camera Spacer if Camera is on */}
            {useAiCamera && (
                <div className="min-h-[140px] my-2 bg-slate-900 border border-white/5 rounded-3xl relative overflow-hidden flex flex-col items-center justify-center">
                    <div className="absolute top-3 left-3 right-3 z-10"><BowlerHUD /></div>
                    <Camera className="w-6 h-6 text-slate-800 animate-pulse" />
                </div>
            )}
            
            {!useAiCamera && <BowlerHUD />}

        </div>

      </div>

      {/* Control Tray */}
      <div className={`flex-none p-5 bg-slate-900 border-t border-white/10 rounded-t-[2.5rem] shadow-2xl transition-all duration-500 ${(isSelectionRequired || overlayMessage) ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
         <div className="grid grid-cols-4 gap-3 mb-3">
               <button onClick={() => sendDelivery(0)} disabled={isPending} className="bg-slate-800 h-14 rounded-2xl font-black active:scale-90 transition-all text-sm border-b-2 border-black">DOT</button>
               <button onClick={() => sendDelivery(1)} disabled={isPending} className="bg-slate-800 h-14 rounded-2xl font-black text-sm border-b-2 border-black">1</button>
               <button onClick={() => sendDelivery(2)} disabled={isPending} className="bg-slate-800 h-14 rounded-2xl font-black text-sm border-b-2 border-black">2</button>
               <button onClick={() => sendDelivery(3)} disabled={isPending} className="bg-slate-800 h-14 rounded-2xl font-black text-sm border-b-2 border-black">3</button>
               <button onClick={() => sendDelivery(4)} disabled={isPending} className="col-span-2 bg-brand-600 h-16 rounded-2xl font-black text-2xl border-b-4 border-brand-900 active:border-b-2 active:translate-y-0.5">4</button>
               <button onClick={() => sendDelivery(6)} disabled={isPending} className="col-span-2 bg-brand-500 h-16 rounded-2xl font-black text-2xl border-b-4 border-brand-800 active:border-b-2 active:translate-y-0.5 ring-4 ring-brand-400 ring-inset">6</button>
         </div>
         <div className="grid grid-cols-3 gap-3">
               <button onClick={() => sendDelivery(0, true, 'wide', false)} className="bg-orange-600/10 text-orange-400 border border-orange-500/20 h-12 rounded-xl font-black text-[10px] uppercase">Wide</button>
               <button onClick={() => sendDelivery(0, true, 'no-ball', false)} className="bg-orange-600/10 text-orange-400 border border-orange-500/20 h-12 rounded-xl font-black text-[10px] uppercase">No Ball</button>
               <button onClick={() => sendDelivery(0, false, '', true)} className="bg-red-600 h-12 rounded-xl font-black text-[10px] uppercase border-b-4 border-red-900 shadow-lg">Wicket</button>
         </div>
      </div>
    </div>
  )
}
