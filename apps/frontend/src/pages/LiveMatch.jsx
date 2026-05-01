import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { Camera, Settings, Circle, Wifi, WifiOff, UserPlus, Repeat, UserCheck, ShieldAlert, ChevronDown, ChevronUp, Eye, EyeOff, BarChart3, History, PlayCircle, LogOut, XCircle, CheckCircle2, Share2, Lock, Unlock, Clipboard, ArrowLeftRight, Trophy, ChevronLeft, Calendar, Star, ArrowRight } from 'lucide-react'
import { useSocket } from '../hooks/useSocket'
import { useMatchStore } from '../store/useMatchStore'
import { matchService } from '../services/matchService'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

export default function LiveMatch() {
    const { matchId: matchIdFromParams } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const { search, state } = location
    const queryParams = new URLSearchParams(search)
    const queryClient = useQueryClient()

    const role = queryParams.get('role') || 'viewer' // Default to viewer for safety
    const { activeMatchId, mode, rosterA: storeRosterA, rosterB: storeRosterB, teamA, teamB, overs, liveCache, updateLiveCache, pendingActions, addToPendingActions, clearPendingActions } = useMatchStore()
    const [isOnline, setIsOnline] = useState(navigator.onLine)



    const matchId = activeMatchId || matchIdFromParams

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
    const [matchDataFull, setMatchDataFull] = useState(null)

    const [overlayMessage, setOverlayMessage] = useState(null)
    const [target, setTarget] = useState(null)
    const [showOutList, setShowOutList] = useState(false)
    const [showBowlerStats, setShowBowlerStats] = useState(false)
    const [expandedInnings, setExpandedInnings] = useState([]) // For scorecard
    const [expandedBowlerId, setExpandedBowlerId] = useState(null)
    const [useAiCamera, setUseAiCamera] = useState(false)
    const [showExitConfirm, setShowExitConfirm] = useState(false)
    const [activeTab, setActiveTab] = useState('live') // 'live', 'scorecard'
    const [isSelectionDismissed, setIsSelectionDismissed] = useState(false)


    // Security
    const [umpirePin, setUmpirePin] = useState(state?.autoVerifyPin || '')
    const [isPinVerified, setIsPinVerified] = useState(!!state?.autoVerifyPin)
    const [showPinPrompt, setShowPinPrompt] = useState(role === 'umpire' && !state?.autoVerifyPin)

    // --- API HYDRATION ---
    const { data: initialData, isLoading, refetch } = useQuery({
        queryKey: ['match', matchId],
        queryFn: () => matchService.getMatch(matchId),
        staleTime: 1000 * 60 // 1 minute
    })

    // --- HYDRATION FROM CACHE ---
    useEffect(() => {
        const cached = liveCache?.[matchId]
        if (cached && !initialData) {
            setRuns(cached.runs || 0)
            setWickets(cached.wickets || 0)
            setOversCount(cached.oversCount || 0)
            setBallsThisOver(cached.ballsThisOver || 0)
            setStrikerId(cached.strikerId || null)
            setNonStrikerId(cached.nonStrikerId || null)
            setCurrentBowlerId(cached.currentBowlerId || null)
            setStats(cached.stats || null)
            setTarget(cached.target || null)
        }
    }, [matchId])


    useEffect(() => {
        if (initialData && !initialData.error) {
            setMatchDataFull(initialData)
            const lastInning = initialData.innings[initialData.innings.length - 1]
            setRuns(lastInning.totalRuns)
            setWickets(lastInning.totalWickets)
            setStrikerId(lastInning.strikerId || null)
            setNonStrikerId(lastInning.nonStrikerId || null)
            setCurrentBowlerId(lastInning.currentBowlerId || null)
            setTarget(initialData.target)
            setStats(initialData.stats)
            setExpandedInnings([initialData.innings.length - 1]) // Expand current inning by default

            const legalBalls = lastInning.deliveries.filter(d => d.extras === 0).length
            setOversCount(Math.floor(legalBalls / 6))
            setBallsThisOver(legalBalls % 6)

            // Cache it
            updateLiveCache(matchId, {
                runs: lastInning.totalRuns,
                wickets: lastInning.totalWickets,
                oversCount: Math.floor(legalBalls / 6),
                ballsThisOver: legalBalls % 6,
                strikerId: lastInning.strikerId,
                nonStrikerId: lastInning.nonStrikerId,
                currentBowlerId: lastInning.currentBowlerId,
                stats: initialData.stats,
                target: initialData.target
            })

            if (initialData.status === 'completed') {
                setOverlayMessage({
                    title: "Match Over!",
                    winningTeam: initialData.winningTeam,
                    reason: initialData.reason,
                    type: 'final'
                })
            } else if (lastInning.status === 'completed' && initialData.innings.length === 1) {
                setOverlayMessage({ title: "Inning Break", subtitle: `First inning over. Target for ${initialData.innings[0].battingTeam === (initialData.teamA) ? initialData.teamB : initialData.teamA} is ${initialData.target} runs.`, type: 'break' })
            }
        }
    }, [initialData])

    // --- SOCKET SYNC ---
    const { isConnected, matchData } = useSocket(matchId);

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

            if (matchData.innings) {
                setMatchDataFull(prev => ({ ...prev, innings: matchData.innings }))
            }

            // Sync Cache
            updateLiveCache(matchId, {
                runs: matchData.score?.runs || runs,
                wickets: matchData.score?.wickets || wickets,
                oversCount: matchData.score?.overs || oversCount,
                ballsThisOver: matchData.score?.balls || ballsThisOver,
                strikerId: matchData.strikerId || strikerId,
                nonStrikerId: matchData.nonStrikerId || nonStrikerId,
                currentBowlerId: matchData.currentBowlerId || currentBowlerId,
                stats: matchData.stats || stats,
                target: matchData.target || target
            })


            if (matchData.event === 'inning-break') {
                setTarget(matchData.target);
                setOverlayMessage({ title: "Inning Break", subtitle: `Target for ${matchData.newBattingTeam} is ${matchData.target} runs.`, type: 'break' })
                refetch()
            } else if (matchData.event === 'match-completed') {
                setOverlayMessage({
                    title: "Match Over!",
                    winningTeam: matchData.winningTeam,
                    reason: matchData.reason,
                    type: 'final'
                })
            }
        }
    }, [matchData])

    // --- OFFLINE SYNC LOGIC ---
    useEffect(() => {
        const handleOnline = () => {
            setIsOnline(true)
            syncPendingActions()
        }
        const handleOffline = () => setIsOnline(false)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [pendingActions])

    const syncPendingActions = async () => {
        const myActions = pendingActions.filter(a => a.matchId === matchId)
        if (myActions.length === 0) return

        for (const action of myActions) {
            try {
                await postDelivery(action.payload)
            } catch (e) {
                console.error("Failed to sync action", e)
                break; // Stop and retry later if server is still down
            }
        }
        clearPendingActions(matchId)
    }


    // --- ACTIONS ---
    const { mutateAsync: postDelivery, isPending } = useMutation({
        mutationFn: (payload) => matchService.recordDelivery(matchId, { ...payload, pin: umpirePin }),
        onError: (err) => alert(err.response?.data?.error || "Failed to record ball")
    })

    const { mutate: updatePlayers } = useMutation({
        mutationFn: (ids) => matchService.updateActivePlayers(matchId, { ...ids, pin: umpirePin }),
        onError: (err) => alert(err.response?.data?.error || "Failed to update players")
    })

    const handlePinSubmit = () => {
        setIsPinVerified(true)
        setShowPinPrompt(false)
    }

    const handleSelection = (type, playerId) => {
        const payload = {}
        if (type === 'striker') payload.strikerId = playerId
        if (type === 'nonStriker') payload.nonStrikerId = playerId
        if (type === 'bowler') payload.currentBowlerId = playerId
        updatePlayers(payload)
    }

    const shareMatch = () => {
        const shareUrl = `${window.location.origin}/match/${matchId}?role=viewer`
        const text = `\u{1F3CF} Watch ${initialData?.teamA} vs ${initialData?.teamB} Live on CrickBot!`
        if (navigator.share) {
            navigator.share({ title: 'Live Match', text, url: shareUrl })
        } else {
            window.open(`https://wa.me/?text=${encodeURIComponent(text + " " + shareUrl)}`)
        }
    }

    const resumeNextInning = async () => {
        setOverlayMessage(null)
        setCurrentOverHistory([])
        await refetch()
    }

    const sendDelivery = async (run, isExtra = false, extraType = '', isWicket = false) => {
        if (overlayMessage || isPending) return;

        // --- OPTIMISTIC UPDATE (Instant UI) ---
        const finalRuns = run + (isExtra ? 1 : 0) // Assume +1 for extras
        let nextStriker = strikerId
        let nextNonStriker = nonStrikerId
        let nextWickets = wickets + (isWicket ? 1 : 0)
        let nextBalls = ballsThisOver
        let nextOvers = oversCount

        // 1. Update Score & Wickets
        setRuns(prev => prev + finalRuns)
        if (isWicket) setWickets(prev => prev + 1)

        // 2. Update Balls (Legal only)
        if (!isExtra) {
            nextBalls = (ballsThisOver + 1) % 6
            if (nextBalls === 0) nextOvers += 1
            setBallsThisOver(nextBalls)
            setOversCount(nextOvers)
        }

        // 3. Strike Rotation (Simplified Prediction)
        if (finalRuns % 2 !== 0) {
            const temp = nextStriker
            nextStriker = nextNonStriker
            nextNonStriker = temp
        }
        if (isWicket) nextStriker = null
        if (!isExtra && nextBalls === 0) { // Over end swap
            const temp = nextStriker
            nextStriker = nextNonStriker
            nextNonStriker = temp
        }

        setStrikerId(nextStriker)
        setNonStrikerId(nextNonStriker)
        if (!isExtra && nextBalls === 0) setCurrentBowlerId(null)

        // Local cache update for instant hydration
        updateLiveCache(matchId, { 
            runs: runs + finalRuns, 
            wickets: nextWickets, 
            oversCount: nextOvers, 
            ballsThisOver: nextBalls,
            strikerId: nextStriker,
            nonStrikerId: nextNonStriker
        })

        // --- BACKGROUND SYNC ---
        if (navigator.onLine) {
            try {
                await postDelivery({ run, isExtra, extraType, isWicket })
            } catch (e) {
                addToPendingActions(matchId, { run, isExtra, extraType, isWicket })
            }
        } else {
            addToPendingActions(matchId, { run, isExtra, extraType, isWicket })
        }
    }

    const swapStrikeManual = () => {
        updatePlayers({ strikerId: nonStrikerId, nonStrikerId: strikerId })
    }

    const toggleInningExpansion = (idx) => {
        setExpandedInnings(prev => prev.includes(idx) ? prev.filter(i => i !== idx) : [...prev, idx])
    }

    const [forcingChange, setForcingChange] = useState(null) // 'striker', 'nonStriker', 'bowler'

    const isUmpire = role === 'umpire' && isPinVerified
    const isMatchOver = initialData?.status === 'completed' || overlayMessage?.type === 'final'
    const needsBatters = initialData?.mode === 'pro' && (!strikerId || !nonStrikerId || forcingChange === 'striker' || forcingChange === 'nonStriker')
    const needsBowler = initialData?.mode === 'pro' && !needsBatters && (!currentBowlerId || forcingChange === 'bowler')
    const isSelectionRequired = isUmpire && !isMatchOver && !isSelectionDismissed && (needsBatters || needsBowler)


    const handleSelectionUpdate = (type, playerId) => {
        handleSelection(type, playerId)
        setForcingChange(null)
        setIsSelectionDismissed(false)
    }

    const handleRetiredHurt = (targetType) => {
        if (targetType === 'striker') updatePlayers({ strikerId: null })
        else updatePlayers({ nonStrikerId: null })
        setForcingChange(targetType)
    }

    const currentRosterA = initialData?.rosterA || storeRosterA || []
    const currentRosterB = initialData?.rosterB || storeRosterB || []

    const remainingBalls = useMemo(() => {
        if (!target || !initialData) return 0
        const totalBalls = initialData.overs * 6
        const bowled = (oversCount * 6) + ballsThisOver
        return Math.max(0, totalBalls - bowled)
    }, [target, oversCount, ballsThisOver, initialData])

    const PlayerStatCard = ({ player, isStriker, label }) => {
        const type = label === 'Striker' ? 'striker' : 'nonStriker'
        const pStats = stats?.[type]
        const isEmpty = !player
        const hasPlayed = (pStats?.balls || 0) > 0

        return (
            <div className={`p-4 rounded-2xl border transition-all duration-300 flex-1 relative
            ${isStriker ? 'bg-brand-500/10 border-brand-500/30' : 'bg-white/5 border-white/5 opacity-70'}`}>
                <div className="flex justify-between items-center mb-1">
                    <span className={`text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 ${isStriker ? 'text-brand-400' : 'text-slate-500'}`}>
                        {label} {isStriker && <Circle className="w-1.5 h-1.5 fill-brand-500 text-brand-500 animate-pulse" />}
                    </span>
                    <div className="flex gap-2">
                        {pStats?.isCaptain && <span className="p-0.5 px-1 bg-yellow-500 text-black text-[7px] font-black rounded uppercase leading-none">C</span>}
                        {isUmpire && !isEmpty && hasPlayed && (
                            <button
                                onClick={() => { handleRetiredHurt(type); setIsSelectionDismissed(false); }}
                                className="p-1 px-2 bg-red-500/10 hover:bg-red-500/20 rounded-lg text-[8px] font-black text-red-500 uppercase tracking-tighter"
                            >
                                Retire
                            </button>
                        )}
                        {isUmpire && !hasPlayed && (
                            <button
                                onClick={() => { setForcingChange(type); setIsSelectionDismissed(false); }}
                                className="p-1 px-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-[8px] font-black text-slate-400 uppercase tracking-tighter"
                            >
                                Change
                            </button>
                        )}
                        {isStriker && isUmpire && !isEmpty && (
                            <button onClick={swapStrikeManual} className="p-1 px-2 bg-slate-800 rounded-lg transition-all active:rotate-180">
                                <Repeat className="w-3 h-3 text-slate-400" />
                            </button>
                        )}
                    </div>
                </div>
                {isEmpty ? (
                    <div 
                        onClick={() => { if(isUmpire) { setForcingChange(type); setIsSelectionDismissed(false); } }}
                        className="text-[10px] font-black text-slate-700 italic uppercase py-2 animate-pulse cursor-pointer hover:text-slate-500 transition-colors"
                    >
                        Assign Player...
                    </div>
                ) : (
                    <>
                        <div className="text-base font-black truncate text-white uppercase tracking-tighter">{player?.name || pStats?.name || 'Unknown Player'}</div>
                        <div className="flex justify-between items-end mt-1.5">
                            <div className="flex gap-2">
                                <span className="text-sm font-black text-white">{pStats?.runs || 0}<span className="text-[10px] text-slate-500 ml-1">({pStats?.balls || 0})</span></span>
                            </div>
                            <span className="text-[9px] font-black text-brand-400 uppercase">SR {pStats?.sr || "0.0"}</span>
                        </div>
                    </>
                )}
            </div>
        )
    }

    if (isLoading) return <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center font-black text-brand-500 animate-pulse uppercase tracking-[0.5em] gap-4"><Settings className="w-12 h-12 animate-spin-slow" /><span>Syncing Match</span></div>

    return (
        <div className="flex flex-col h-screen max-h-screen bg-slate-950 text-white overflow-hidden relative z-10 w-full font-sans pb-safe">

            {/* PIN PROMPT OVERLAY */}
            {showPinPrompt && (
                <div className="fixed inset-0 z-[200] bg-slate-950/90 backdrop-blur-3xl flex flex-col items-center justify-center p-8 animate-fade-in shadow-inner">
                    <div className="w-20 h-20 rounded-[2rem] bg-indigo-500/20 flex items-center justify-center mb-8 shadow-2xl shadow-indigo-500/10">
                        <Lock className="w-10 h-10 text-indigo-500" />
                    </div>
                    <h2 className="text-3xl font-black text-white tracking-tighter mb-2 uppercase">Umpire Security</h2>
                    <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-10 text-center">Enter the 4-digit PIN to start scoring</p>
                    <div className="w-full max-w-xs space-y-6">
                        <input
                            type="password"
                            maxLength={4}
                            value={umpirePin}
                            onChange={(e) => setUmpirePin(e.target.value)}
                            placeholder="____"
                            className="w-full bg-slate-900 border-2 border-slate-700 text-center text-4xl py-5 rounded-[2.5rem] font-black tracking-[1em] focus:border-indigo-500 outline-none transition-all text-white tabular-nums"
                            autoFocus
                        />
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => navigate(`/match/${matchId}?role=viewer`)} className="bg-slate-800 text-slate-400 p-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest">Watcher Mode</button>
                            <button onClick={handlePinSubmit} className="bg-indigo-600 text-white p-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-indigo-600/20">Login</button>
                        </div>
                    </div>
                </div>
            )}

            {overlayMessage && (
                <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl flex flex-col items-center justify-center p-8 text-center animate-fade-in">
                    <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-20">
                        <div className="absolute -top-1/4 -left-1/4 w-1/2 h-1/2 bg-brand-500 blur-[120px] rounded-full animate-pulse" />
                        <div className="absolute -bottom-1/4 -right-1/4 w-1/2 h-1/2 bg-indigo-500 blur-[120px] rounded-full animate-pulse delay-700" />
                    </div>

                    {overlayMessage.type === 'break' ? (
                        <>
                            <div className="w-20 h-20 rounded-[2rem] bg-indigo-500/20 flex items-center justify-center mb-6 ring-4 ring-indigo-500/10 relative z-10">
                                <ArrowRight className="w-10 h-10 text-indigo-400" />
                            </div>
                            <h2 className="text-4xl font-black text-white tracking-tighter mb-4 uppercase relative z-10">INNING OVER!</h2>
                            <div className="bg-white/5 border border-white/10 rounded-2xl px-8 py-6 mb-10 relative z-10 max-w-sm">
                                <p className="text-sm text-slate-500 font-bold uppercase tracking-widest mb-2 italic">The Target is</p>
                                <p className="text-5xl font-black text-brand-400 tracking-tighter mb-2">{overlayMessage.subtitle.match(/\d+/)[0]}</p>
                                <p className="text-xs text-slate-400 font-bold uppercase tracking-tight">Needed by {overlayMessage.subtitle.match(/for (.*) is/)?.[1] || 'Team'}</p>
                            </div>
                            <div className="w-full max-w-xs relative z-10">
                                <button
                                    onClick={resumeNextInning}
                                    className="bg-brand-500 text-white px-10 py-5 rounded-[2rem] font-black text-sm w-full active:scale-95 transition-all shadow-xl shadow-brand-500/20 uppercase tracking-widest"
                                >
                                    Resume Next Inning
                                </button>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="w-20 h-20 rounded-[2rem] bg-brand-500/20 flex items-center justify-center mb-6 ring-4 ring-brand-500/10 shadow-[0_0_40px_rgba(251,191,36,0.1)] relative z-10">
                                <Trophy className="w-10 h-10 text-brand-500" />
                            </div>

                            <h2 className="text-5xl font-black text-white tracking-tighter mb-4 uppercase relative z-10">MATCH OVER!</h2>
                            <div className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3 mb-10 relative z-10 transition-all hover:bg-white/10">
                                <p className="text-lg text-brand-400 font-bold uppercase tracking-tight">
                                    {overlayMessage.winningTeam} <span className="text-slate-500 font-black">Won By</span> {overlayMessage.reason}
                                </p>
                            </div>

                            {stats?.potm && (
                                <div className="w-full max-w-sm bg-gradient-to-b from-yellow-500/20 to-transparent border border-yellow-500/30 rounded-[2.5rem] p-8 mb-12 animate-slide-up relative overflow-hidden group shadow-2xl shadow-yellow-500/10 z-10">
                                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-yellow-500 to-transparent" />
                                    <Star className="w-6 h-6 text-yellow-500 mx-auto mb-4 animate-spin-slow" />
                                    <span className="text-[10px] font-black text-yellow-500 uppercase tracking-[0.3em] block mb-2 opacity-70">Player of the Match</span>
                                    <h4 className="text-3xl font-black text-white uppercase tracking-tighter mb-1">{stats.potm.name}</h4>
                                    <p className="text-[9px] font-black text-slate-500 uppercase tracking-widest mb-4 italic">{stats.potm.teamName}</p>
                                    <div className="inline-flex items-center gap-2 bg-yellow-500/10 px-4 py-1.5 rounded-full border border-yellow-500/20">
                                        <span className="text-xs font-black text-yellow-400 uppercase tracking-tight">{stats.potm.summary}</span>
                                    </div>
                                </div>
                            )}

                            <div className="w-full max-w-xs space-y-4 relative z-10">
                                <button
                                    onClick={() => { setOverlayMessage(null); setActiveTab('scorecard'); }}
                                    className="bg-indigo-600 text-white px-10 py-5 rounded-[2rem] font-black text-sm w-full active:scale-95 transition-all shadow-xl shadow-indigo-600/20 uppercase tracking-widest border-b-4 border-indigo-900"
                                >
                                    View Full Scorecard
                                </button>
                                <button
                                    onClick={() => navigate('/')}
                                    className="bg-slate-800 text-slate-400 px-10 py-5 rounded-[2rem] font-black text-sm w-full active:scale-95 transition-all border border-slate-700 uppercase tracking-widest"
                                >
                                    Back to Lobby
                                </button>
                            </div>
                        </>
                    )}
                </div>
            )}

            {showExitConfirm && (
                <div className="fixed inset-0 z-[110] bg-black/80 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in">
                    <div className="bg-slate-900 w-full max-w-sm rounded-[2.5rem] p-8 border border-white/10 shadow-3xl">
                        <ShieldAlert className="w-12 h-12 text-yellow-500 mx-auto mb-6" />
                        <h3 className="text-2xl font-black text-center mb-2 uppercase tracking-tighter">Are you sure?</h3>
                        <p className="text-slate-500 text-center text-sm font-bold mb-8 italic uppercase tracking-tighter">Progress is saved. You can always resume later.</p>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => setShowExitConfirm(false)} className="bg-slate-800 p-4 rounded-2xl font-black text-sm uppercase tracking-widest border border-white/5">Cancel</button>
                            <button onClick={() => navigate('/')} className="bg-red-600 p-4 rounded-2xl font-black text-sm uppercase tracking-widest border-b-4 border-red-900">Confirm</button>
                        </div>
                    </div>
                </div>
            )}

            {/* SELECTION OVERLAY */}
            {isSelectionRequired && (
                <div className="absolute inset-x-0 bottom-0 z-50 bg-slate-900 border-t border-white/10 rounded-t-[2.5rem] p-6 animate-slide-up shadow-[0_-20px_50px_rgba(0,0,0,0.8)] pb-12">
                    <div className="flex justify-between items-center mb-6">
                        <div className="w-10 h-1 bg-slate-700 rounded-full" />
                        <XCircle className="w-6 h-6 text-slate-600 cursor-pointer hover:text-white transition-colors" onClick={() => setIsSelectionDismissed(true)} />
                    </div>
                    <div className="flex flex-col items-center mb-6">
                        <div className={`p-3 rounded-full mb-3 ${needsBatters ? 'bg-brand-500/20 text-brand-500' : 'bg-indigo-500/20 text-indigo-400'}`}>
                            {needsBatters ? <UserPlus className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
                        </div>
                        <h3 className="text-2xl font-black text-white tracking-tighter">
                            {needsBatters ? (forcingChange ? `Replace ${forcingChange}` : "Select Batters") : (forcingChange ? "Swap Bowler" : "Select Bowler")}
                        </h3>
                        <p className="text-slate-500 text-xs mt-1 text-center font-bold">
                            {needsBatters ? "Choose active striker & non-striker" : (needsBowler && stats?.lastBowlerId && !forcingChange ? "Cricket Rule: Change the bowler." : "Pick a fresh bowler")}
                        </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 max-h-[35vh] overflow-y-auto pb-6 scrollbar-none">
                        {(needsBowler ? (matchDataFull?.innings[matchDataFull.innings.length - 1]?.battingTeam === initialData?.teamA ? currentRosterB : currentRosterA) : (matchDataFull?.innings[matchDataFull.innings.length - 1]?.battingTeam === initialData?.teamA ? currentRosterA : currentRosterB)).map(p => {
                            const isStrikerOrNonStriker = (p.id === strikerId || p.id === nonStrikerId)
                            const isCurrentBowler = (p.id === currentBowlerId)
                            const isActiveInCurrentRole = needsBatters ? isStrikerOrNonStriker : isCurrentBowler
                            const isOut = stats?.outBatters?.some(out => out.id === p.id)
                            const isConsecutive = needsBowler && p.id === stats?.lastBowlerId && !forcingChange
                            const bowlerStat = stats?.allBowlers?.find(b => b.id === p.id)
                            const isLimitReached = needsBowler && initialData?.bowlerOverLimit > 0 && (bowlerStat?.overCount || 0) >= initialData.bowlerOverLimit
                            return (
                                <button
                                    key={p.id}
                                    disabled={(needsBatters && isStrikerOrNonStriker) || (needsBowler && (isCurrentBowler || isConsecutive || isLimitReached)) || isOut}
                                    onClick={() => handleSelectionUpdate(needsBatters ? (forcingChange === 'nonStriker' || (forcingChange === null && strikerId) ? 'nonStriker' : 'striker') : 'bowler', p.id)}
                                    className={`p-3 rounded-xl font-black flex flex-col items-center gap-0.5 transition-all text-sm
                                 ${((needsBatters && isStrikerOrNonStriker) || (needsBowler && (isCurrentBowler || isConsecutive || isLimitReached)) || isOut) ? 'opacity-20 bg-slate-800' : 'bg-slate-800 border border-slate-700 active:bg-brand-500 active:scale-95'}`}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-white line-clamp-1 truncate">{p.name}{p.isCaptain ? ' (C)' : ''}</span>
                                    </div>
                                    <span className="text-[8px] text-slate-500 uppercase tracking-widest">
                                        {isOut ? 'OUT' : isConsecutive ? 'JUST BOWLED' : isLimitReached ? 'LIMIT REACHED' : (isActiveInCurrentRole ? 'ON FIELD' : 'SELECT')}
                                    </span>
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            <div className="px-5 py-4 bg-slate-900/80 border-b border-white/5 flex flex-col z-10 flex-none relative backdrop-blur-md">
                <div className="flex justify-between items-center mb-4">
                    <button onClick={() => navigate('/')} className="p-2 -ml-2 text-slate-500"><ChevronLeft className="w-6 h-6" /></button>
                    <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Umpire Console</span>
                            {(isPending || pendingActions.length > 0) && (
                                <div className="flex items-center gap-1 bg-brand-500/10 px-1.5 py-0.5 rounded-full">
                                    <div className="w-1 h-1 bg-brand-500 rounded-full animate-pulse" />
                                    <span className="text-[7px] font-black text-brand-500 uppercase">
                                        {pendingActions.length > 0 ? `Queued (${pendingActions.length})` : 'Saving...'}
                                    </span>
                                </div>
                            )}
                            {!isOnline && (
                                <div className="flex items-center gap-1 bg-red-500/10 px-1.5 py-0.5 rounded-full">
                                    <WifiOff className="w-2.5 h-2.5 text-red-500" />
                                    <span className="text-[7px] font-black text-red-500 uppercase">Offline</span>
                                </div>
                            )}
                        </div>
                        <h1 className="text-xl font-black text-white tracking-tighter uppercase italic">
                            {initialData?.teamA} <span className="text-brand-500">VS</span> {initialData?.teamB}
                        </h1>
                    </div>
                    <div className="flex items-center gap-1">
                        <button onClick={shareMatch} className="p-2.5 bg-brand-500/10 rounded-xl text-brand-500 transition-all active:scale-95"><Share2 className="w-5 h-5" /></button>
                    </div>
                </div>
                <div className="flex p-1 bg-black/20 rounded-2xl border border-white/5">
                    <button
                        onClick={() => setActiveTab('live')}
                        className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'live' ? 'bg-white/10 text-white shadow-lg shadow-white/5' : 'text-slate-600'}`}
                    >LIVE HUB</button>
                    <button
                        onClick={() => setActiveTab('scorecard')}
                        className={`flex-1 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'scorecard' ? 'bg-white/10 text-white shadow-lg shadow-white/5' : 'text-slate-600'}`}
                    >SCORECARD</button>
                </div>
            </div>

            <div className="flex-1 flex flex-col overflow-hidden px-4 pt-4">
                {activeTab === 'live' ? (
                    <>
                        <div className="flex justify-between items-center px-1 mb-1">
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800/50 rounded-full border border-white/5">
                                <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                                <span className="text-[9px] font-black text-white uppercase tracking-widest">Inning {matchDataFull?.innings?.length || 1}</span>
                            </div>
                            <div className="flex items-center gap-1.5 px-3 py-1 bg-slate-800/50 rounded-full border border-white/5">
                                <Calendar className="w-3 h-3 text-brand-400" />
                                <span className="text-[9px] font-black text-white uppercase tracking-widest">Overs: {initialData?.overs || '0'}</span>
                            </div>
                        </div>

                        <div className="py-2 flex gap-3">
                            <PlayerStatCard label="Striker" isStriker={true} player={currentRosterA.concat(currentRosterB).find(r => r.id === strikerId)} />
                            <PlayerStatCard label="Non-Striker" isStriker={false} player={currentRosterA.concat(currentRosterB).find(r => r.id === nonStrikerId)} />
                        </div>
                        <div className="flex-none text-center py-4 relative group">
                            <div className="absolute inset-0 bg-brand-500/5 blur-3xl rounded-full opacity-20 scale-150" />
                            <div className="text-7xl font-black tabular-nums tracking-tighter relative z-10">
                                {runs}<span className="text-4xl text-slate-800">/</span><span className="text-brand-400">{wickets}</span>
                            </div>
                            <div className="text-xl font-black text-slate-600 tracking-[0.4em] uppercase mt-1 relative z-10">
                                {oversCount}.{ballsThisOver} <span className="text-[12px] opacity-40">Overs</span>
                            </div>
                        </div>
                        {target ? (
                            isUmpire ? (
                                /* MINI VERSION FOR UMPIRE */
                                <div className="mb-3 p-3 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-between text-[10px] font-black uppercase tracking-tighter shadow-lg">
                                    <div className="flex items-center gap-1.5">
                                        <Trophy className="w-3.5 h-3.5 text-indigo-400" />
                                        <span className="text-slate-500">Target</span>
                                        <span className="text-white text-xs">{target}</span>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="flex items-center gap-1">
                                            <span className="text-slate-500">Need</span>
                                            <span className="text-brand-400 text-xs">{Math.max(0, target - runs)}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                            <span className="text-slate-500">Balls</span>
                                            <span className="text-indigo-400 text-xs">{remainingBalls}</span>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                /* FULL VERSION FOR VIEWERS */
                                <div className="mb-6 p-6 bg-indigo-500/10 border-2 border-indigo-500/20 rounded-[2.5rem] relative overflow-hidden group shadow-2xl">
                                    <div className="absolute top-0 right-0 p-4 opacity-10">
                                        <Trophy className="w-12 h-12 text-indigo-400" />
                                    </div>
                                    <div className="flex justify-between items-start relative z-10 mb-4">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Target</span>
                                            <span className="text-4xl font-black text-white tabular-nums tracking-tighter">{target}</span>
                                        </div>
                                        <div className="text-center flex flex-col">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Need</span>
                                            <span className="text-4xl font-black text-brand-400 tabular-nums tracking-tighter">{Math.max(0, target - runs)}</span>
                                        </div>
                                        <div className="text-right flex flex-col">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Balls</span>
                                            <span className="text-4xl font-black text-indigo-400 tabular-nums tracking-tighter">{remainingBalls}</span>
                                        </div>
                                    </div>
                                    <div className="pt-3 border-t border-white/5 text-center relative z-10">
                                        <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">
                                            <span className="text-brand-400">{Math.max(0, target - runs)}</span> Runs needed off <span className="text-indigo-400">{remainingBalls}</span> balls
                                        </p>
                                    </div>
                                    <div className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-indigo-500/30 to-transparent" />
                                </div>
                            )
                        ) : null}

                        <div className="flex-1 overflow-y-auto space-y-3 py-2 pr-1 scrollbar-none">
                            <div className="py-3 flex items-center gap-3 overflow-x-auto scrollbar-none snap-x h-14 bg-slate-900/30 rounded-2xl px-3 border border-white/5">
                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest border-r border-white/10 pr-3 h-full flex items-center">Recent</span>
                                {currentOverHistory.map((ball, i) => (
                                    <div key={i} className={`flex-none w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs snap-center transition-all shadow-lg
                                ${ball.wicketType !== 'none' ? 'bg-red-600 shadow-red-600/20' : ball.extras > 0 ? 'bg-orange-600' : 'bg-slate-800 border border-white/10'}`}>
                                        {ball.label}
                                    </div>
                                ))}
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => setShowBowlerStats(!showBowlerStats)} className="flex items-center justify-between p-4 bg-slate-900/50 border border-white/10 rounded-2xl">
                                    <div className="flex items-center gap-2">
                                        <BarChart3 className="w-5 h-5 text-brand-500" />
                                        <span className="text-[10px] font-black text-white uppercase tracking-tighter">Bowlers</span>
                                    </div>
                                    {showBowlerStats ? <ChevronDown className="w-4 h-4 text-slate-600" /> : <ChevronUp className="w-4 h-4 text-slate-600" />}
                                </button>
                                <button onClick={() => setShowOutList(!showOutList)} className="flex items-center justify-between p-4 bg-slate-900/50 border border-white/10 rounded-2xl">
                                    <div className="flex items-center gap-2">
                                        <ShieldAlert className="w-5 h-5 text-red-500" />
                                        <span className="text-[10px] font-black text-white uppercase tracking-tighter">Out List</span>
                                    </div>
                                    {showOutList ? <ChevronDown className="w-4 h-4 text-slate-600" /> : <ChevronUp className="w-4 h-4 text-slate-600" />}
                                </button>
                            </div>
                            {showBowlerStats && (
                                <div className="space-y-2 animate-slide-up">
                                    {stats?.allBowlers?.map(b => (
                                        <div key={b.id} className="bg-white/5 p-4 rounded-2xl flex items-center justify-between border border-white/5">
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-black text-white uppercase">{b.name}</span>
                                                <span className="text-[10px] font-black text-slate-600 uppercase tracking-tighter">{b.overCount}/{initialData?.bowlerOverLimit || '\u221E'} Overs Limit</span>
                                            </div>
                                            <div className="flex gap-4 font-black text-xs text-brand-400 tabular-nums">
                                                <div>{b.wickets} <span className="text-[9px] text-slate-700">W</span></div>
                                                <div>{b.runs} <span className="text-[9px] text-slate-700">R</span></div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                             {!useAiCamera && <div className="mt-2 text-center">
                                <div className="bg-slate-900 p-4 rounded-2xl border border-white/10 flex items-center justify-between shadow-xl">
                                    <div className="flex items-center gap-3">
                                        <UserCheck className="w-5 h-5 text-brand-500" />
                                        <div className="flex flex-col text-left">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Active Bowler</span>
                                                {isUmpire && !isMatchOver && currentBowlerId && (
                                                    (stats?.bowler?.overs === '0.0') ? (
                                                        <button
                                                            onClick={() => { setForcingChange('bowler'); setIsSelectionDismissed(false); }}
                                                            className="p-1 px-2 bg-slate-800 hover:bg-slate-700 rounded-lg text-[7px] font-black text-slate-400 uppercase"
                                                        >
                                                            Change
                                                        </button>
                                                    ) : (
                                                        <button
                                                            onClick={() => { setForcingChange('bowler'); setIsSelectionDismissed(false); }}
                                                            className="p-1 px-2 bg-indigo-500/10 hover:bg-indigo-500/20 rounded-lg text-[7px] font-black text-indigo-400 uppercase"
                                                        >
                                                            Swap Mid-Over
                                                        </button>
                                                    )
                                                )}
                                                {isUmpire && !isMatchOver && !currentBowlerId && (
                                                     <button
                                                        onClick={() => { setIsSelectionDismissed(false); }}
                                                        className="p-1 px-2 bg-brand-500/10 hover:bg-brand-500/20 rounded-lg text-[7px] font-black text-brand-400 uppercase"
                                                    >
                                                        Assign Bowler
                                                    </button>
                                                )}
                                            </div>
                                            <span className="text-sm font-black text-white uppercase truncate max-w-[120px]">{currentBowlerId ? (currentRosterA.concat(currentRosterB).find(r => r.id === currentBowlerId)?.name) : "Waiting..."}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="text-center"><p className="text-[8px] font-black text-slate-700">O</p><p className="text-sm font-black text-white">{stats?.bowler?.overs || '0.0'}</p></div>
                                        <div className="text-center"><p className="text-[8px] font-black text-slate-700">W-R</p><p className="text-sm font-black text-indigo-400">{stats?.bowler?.wickets}-{stats?.bowler?.runs}</p></div>
                                    </div>
                                </div>
                            </div>}
                        </div>
                    </>
                ) : (
                    /* SCORECARD VIEW */
                    <div className="flex-1 overflow-y-auto space-y-6 pb-20 animate-fade-in scrollbar-none">
                        {matchDataFull?.innings?.map((inn, idx) => {
                            const isExpanded = expandedInnings.includes(idx)
                            return (
                                <div key={idx} className="bg-slate-900/50 border border-white/5 rounded-[2.5rem] overflow-hidden transition-all duration-300">
                                    <button
                                        onClick={() => toggleInningExpansion(idx)}
                                        className="w-full bg-slate-800 p-5 flex justify-between items-center active:bg-slate-700 transition-colors"
                                    >
                                        <div className="flex flex-col text-left">
                                            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Inning {idx + 1}</span>
                                            <h3 className="text-xl font-black text-white uppercase tracking-tighter">{inn.battingTeam}</h3>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right">
                                                <span className="text-2xl font-black text-brand-400 tabular-nums">{inn.totalRuns}/{inn.totalWickets}</span>
                                                <p className="text-[10px] font-black text-slate-500 uppercase">Score</p>
                                            </div>
                                            {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-600" /> : <ChevronDown className="w-5 h-5 text-slate-600" />}
                                        </div>
                                    </button>

                                    {isExpanded && (
                                        <div className="p-4 space-y-4 animate-slide-up">
                                            <div className="grid grid-cols-1 gap-2">
                                                <div className="flex justify-between px-2 text-[9px] font-black text-slate-600 uppercase tracking-widest border-b border-white/5 pb-2">
                                                    <span>Batter</span>
                                                    <div className="flex gap-4"><span className="w-6 text-center">R</span><span className="w-6 text-center">B</span><span className="w-8 text-right pr-1">SR</span></div>
                                                </div>
                                                {inn.stats?.outBatters?.map((b, bidx) => (
                                                    <div key={bidx} className="flex flex-col p-2 bg-black/20 rounded-xl">
                                                        <div className="flex justify-between">
                                                            <span className="text-xs font-black text-white uppercase">{b.name}</span>
                                                            <div className="flex gap-4 font-black">
                                                                <span className="w-6 text-center">{b.runs}</span>
                                                                <span className="w-6 text-center opacity-40">{b.balls}</span>
                                                                <span className="w-8 text-right text-brand-400 text-[10px] pr-1">{b.sr}</span>
                                                            </div>
                                                        </div>
                                                        <span className="text-[9px] font-black text-slate-600 italic mt-0.5">b {b.bowledBy}</span>
                                                    </div>
                                                ))}
                                                {inn.stats?.retiredBatters?.map((b, bidx) => (
                                                    <div key={'retired-' + bidx} className="flex flex-col p-2 bg-yellow-500/5 border border-yellow-500/10 rounded-xl">
                                                        <div className="flex justify-between">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-black text-white uppercase">{b.name}</span>
                                                                <span className="text-[7px] font-black bg-yellow-500 text-black px-1 rounded uppercase">Retired</span>
                                                            </div>
                                                            <div className="flex gap-4 font-black">
                                                                <span className="w-6 text-center">{b.runs}</span>
                                                                <span className="w-6 text-center opacity-40">{b.balls}</span>
                                                                <span className="w-8 text-right text-brand-400 text-[10px] pr-1">{b.sr}</span>
                                                            </div>
                                                        </div>
                                                        <span className="text-[9px] font-black text-slate-600 italic mt-0.5">Not Out (Retired)</span>
                                                    </div>
                                                ))}
                                                {[inn.stats?.striker, inn.stats?.nonStriker].filter(Boolean).map((b, bidx) => (
                                                    <div key={'active-' + bidx} className="flex flex-col p-2 bg-brand-500/5 border border-brand-500/10 rounded-xl">
                                                        <div className="flex justify-between">
                                                            <span className="text-xs font-black text-brand-400 uppercase">{b.name}*</span>
                                                            <div className="flex gap-4 font-black">
                                                                <span className="w-6 text-center">{b.runs}</span>
                                                                <span className="w-6 text-center opacity-40">{b.balls}</span>
                                                                <span className="w-8 text-right text-brand-400 text-[10px] pr-1">{b.sr}</span>
                                                            </div>
                                                        </div>
                                                        <span className="text-[9px] font-black text-brand-500/50 uppercase tracking-tighter mt-0.5">Not Out</span>
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="grid grid-cols-1 gap-2 pt-4">
                                                <div className="flex justify-between px-2 text-[9px] font-black text-slate-600 uppercase tracking-widest border-b border-white/5 pb-2">
                                                    <span>Bowler</span>
                                                    <div className="flex gap-4"><span>O</span><span>R</span><span>W</span></div>
                                                </div>
                                                {inn.stats?.allBowlers?.map((b, bidx) => (
                                                    <div key={bidx} className="flex flex-col bg-black/20 rounded-xl overflow-hidden border border-white/5">
                                                        <button
                                                            onClick={() => setExpandedBowlerId(expandedBowlerId === b.id ? null : b.id)}
                                                            className="flex justify-between p-3 active:bg-white/5 transition-colors"
                                                        >
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-xs font-black text-white uppercase">{b.name}</span>
                                                                <ChevronDown className={`w-3 h-3 text-slate-600 transition-transform ${expandedBowlerId === b.id ? 'rotate-180' : ''}`} />
                                                            </div>
                                                            <div className="flex gap-4 font-black tabular-nums text-xs">
                                                                <span className="w-6 text-center text-brand-400">{b.overs}</span>
                                                                <span className="w-6 text-center tabular-nums opacity-60">{b.runs}</span>
                                                                <span className="w-6 text-center text-indigo-400">{b.wickets}</span>
                                                            </div>
                                                        </button>
                                                        {expandedBowlerId === b.id && (
                                                            <div className="px-3 pb-3 space-y-2 animate-slide-up">
                                                                <div className="h-[1px] bg-white/5 mb-2" />
                                                                {b.overHistory?.map((over, oidx) => (
                                                                    <div key={oidx} className="flex items-center justify-between">
                                                                        <span className="text-[8px] font-black text-slate-500 uppercase">Over {over.overNumber}</span>
                                                                        <div className="flex gap-1 overflow-x-auto scrollbar-none">
                                                                            {over.balls.split(' ').map((ball, ballIdx) => (
                                                                                <span key={ballIdx} className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-black flex-none
                                                                                    ${ball === 'W' ? 'bg-red-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
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
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {isUmpire && activeTab === 'live' && initialData?.status !== 'completed' && (
                <div className={`p-5 bg-slate-900 border-t border-white/10 rounded-t-[3rem] shadow-[0_-20px_60px_rgba(0,0,0,0.8)] transition-all duration-500 ${(isSelectionRequired || overlayMessage || showExitConfirm) ? 'translate-y-full opacity-0 pointer-events-none' : 'translate-y-0 opacity-100'}`}>
                    <div className="grid grid-cols-4 gap-3 mb-3">
                        <button onClick={() => sendDelivery(0)} disabled={isPending} className="bg-slate-800 h-14 rounded-2xl font-black active:scale-90 transition-all text-xs border-b-4 border-black uppercase">Dot</button>
                        <button onClick={() => sendDelivery(1)} disabled={isPending} className="bg-slate-800 h-14 rounded-2xl font-black text-xs border-b-4 border-black">1</button>
                        <button onClick={() => sendDelivery(2)} disabled={isPending} className="bg-slate-800 h-14 rounded-2xl font-black text-xs border-b-4 border-black">2</button>
                        <button onClick={() => sendDelivery(3)} disabled={isPending} className="bg-slate-800 h-14 rounded-2xl font-black text-xs border-b-4 border-black">3</button>
                        <button onClick={() => sendDelivery(4)} disabled={isPending} className="col-span-2 bg-brand-600 h-16 rounded-[1.5rem] font-black text-3xl border-b-4 border-brand-900 active:border-b-2 active:translate-y-0.5 hover:brightness-110 shadow-lg shadow-brand-600/20">4</button>
                        <button onClick={() => sendDelivery(6)} disabled={isPending} className="col-span-2 bg-brand-500 h-16 rounded-[1.5rem] font-black text-3xl border-b-4 border-brand-800 active:border-b-2 active:translate-y-0.5 hover:brightness-110 shadow-lg shadow-brand-500/20 ring-4 ring-brand-400 ring-inset">6</button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        <button onClick={() => sendDelivery(0, true, 'wide', false)} className="bg-orange-600/10 text-orange-400 border border-orange-500/30 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95">Wide</button>
                        <button onClick={() => sendDelivery(0, true, 'no-ball', false)} className="bg-orange-600/10 text-orange-400 border border-orange-500/30 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest active:scale-95">No Ball</button>
                        <button onClick={() => sendDelivery(0, false, '', true)} className="bg-red-600 h-12 rounded-2xl font-black text-[10px] uppercase tracking-widest border-b-4 border-red-900 shadow-xl shadow-red-900/30 active:scale-95">Wicket</button>
                    </div>
                </div>
            )}
        </div>
    )
}
