import { useNavigate } from 'react-router-dom'
import { PlusCircle, PlayCircle, Trophy, Users, BarChart3, Wifi, Smartphone, Gauge, ShieldCheck, Eye, Activity, XCircle } from 'lucide-react'

import { useQuery } from '@tanstack/react-query'
import { matchService } from '../services/matchService'
import { useMatchStore } from '../store/useMatchStore'
import { useEffect, useMemo, useState } from 'react'

export default function Home() {
    const navigate = useNavigate()
    const { myMatches } = useMatchStore()

    const [activeTab, setActiveTab] = useState('live') // 'live', 'completed'
    const [vaultClicks, setVaultClicks] = useState(0)
    const [deferredPrompt, setDeferredPrompt] = useState(null)
    const [showInstallBanner, setShowInstallBanner] = useState(true)
    const [isIOS, setIsIOS] = useState(false)
    const [isStandalone, setIsStandalone] = useState(false)


    // --- PWA INSTALL LOGIC ---
    useEffect(() => {
        // Check if already installed
        const isStandaloneMatch = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone
        setIsStandalone(isStandaloneMatch)

        // Check if iOS
        const userAgent = window.navigator.userAgent.toLowerCase()
        const ios = /iphone|ipad|ipod/.test(userAgent)
        setIsIOS(ios)

        const handler = (e) => {
            e.preventDefault()
            setDeferredPrompt(e)
        }
        window.addEventListener('beforeinstallprompt', handler)
        return () => window.removeEventListener('beforeinstallprompt', handler)
    }, [])


    const handleInstallClick = async () => {
        if (!deferredPrompt) return
        deferredPrompt.prompt()
        const { outcome } = await deferredPrompt.userChoice
        if (outcome === 'accepted') setDeferredPrompt(null)
    }


    const { data: matches, isLoading } = useQuery({
        queryKey: ['matches', activeTab],
        queryFn: () => matchService.getMatches(activeTab),
        refetchInterval: activeTab === 'live' ? 5000 : 30000
    })

    // Sort: My Matches first, then others
    const sortedMatches = useMemo(() => {
        if (!matches) return []
        return [...matches].sort((a, b) => {
            const aMine = myMatches.some(m => m.id === a.id)
            const bMine = myMatches.some(m => m.id === b.id)
            if (aMine && !bMine) return -1
            if (!aMine && bMine) return 1
            return 0
        })
    }, [matches, myMatches])

    const MatchCard = ({ match }) => {
        const isCompleted = match.status === 'completed';
        const currentInning = match.innings[match.innings.length - 1];
        const isSecondInning = match.innings.length > 1;
        const myMatchRecord = myMatches.find(m => m.id === match.id)
        const isMyMatch = !!myMatchRecord

        return (
            <div className={`p-6 shadow-2xl relative overflow-hidden group transition-all rounded-[2.5rem] border
            ${isMyMatch ? 'bg-indigo-500/10 border-indigo-500/30' : 'bg-slate-900/50 border-white/5'}`}>

                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                    {isCompleted ? <Trophy className="w-16 h-16 text-yellow-500" /> : (isMyMatch ? <ShieldCheck className="w-16 h-16 text-indigo-500" /> : <Activity className="w-20 h-20 text-brand-500" />)}
                </div>

                <div className="flex justify-between items-start mb-4 relative z-10">
                    <div className="flex gap-2">
                        {isCompleted ? (
                            <span className="bg-yellow-600/20 text-yellow-500 text-[9px] font-black px-3 py-1 rounded-full flex items-center gap-1 uppercase tracking-tighter border border-yellow-500/20">
                                Finished
                            </span>
                        ) : (
                            <span className="bg-red-500 text-white text-[9px] font-black px-3 py-1 rounded-full animate-pulse flex items-center gap-1">
                                <div className="w-1 h-1 bg-white rounded-full" /> LIVE
                            </span>
                        )}
                        {isMyMatch && <span className="bg-indigo-600 text-white text-[9px] font-black px-3 py-1 rounded-full flex items-center gap-1 uppercase tracking-tighter">Owner</span>}
                    </div>
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{match.overs} Overs Match</span>
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
                                {isSecondInning ? `${currentInning.totalRuns}/${currentInning.totalWickets}` : 'DNB'}
                            </span>
                        </div>
                    </div>

                    {isCompleted ? (
                        <div className="bg-brand-500/10 border border-brand-500/20 rounded-2xl py-3 px-4 text-center">
                            <p className="text-[11px] font-black text-brand-400 uppercase tracking-tight">RESULT</p>
                            <p className="text-xs font-black text-white uppercase mt-0.5">{match.winningTeam} Won</p>
                        </div>
                    ) : match.target ? (
                        <div className="bg-indigo-500/5 border border-indigo-500/10 rounded-xl py-2 px-3 text-center">
                            <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Target: {match.target} Runs</p>
                        </div>
                    ) : null}

                    <div className={`grid gap-3 pt-2 ${(!isCompleted && isMyMatch) ? 'grid-cols-2' : 'grid-cols-1'}`}>
                        <button
                            onClick={() => navigate(`/match/${match.id}?role=viewer`)}
                            className="bg-slate-800 hover:bg-slate-700 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 border border-white/5"
                        >
                            {isCompleted ? <BarChart3 className="w-4 h-4" /> : <Eye className="w-4 h-4" />} {isCompleted ? 'VIEW RESULT' : 'WATCH LIVE'}
                        </button>
                        {!isCompleted && isMyMatch && (
                            <button
                                onClick={() => navigate(`/match/${match.id}?role=umpire`, { state: { autoVerifyPin: myMatchRecord.pin } })}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                            >
                                <ShieldCheck className="w-4 h-4" /> MANAGE
                            </button>
                        )}
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="p-6 pb-40 max-w-lg mx-auto min-h-screen bg-slate-950 flex flex-col pt-8 relative z-10 w-full animate-fade-in">

            {/* PWA INSTALL BANNER (Android/Chrome) */}
            {deferredPrompt && showInstallBanner && !isStandalone && (
                <div className="mb-6 bg-indigo-600 p-4 rounded-[2.5rem] flex items-center justify-between shadow-2xl shadow-indigo-600/30 border border-white/10 animate-slide-up relative overflow-hidden group">
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-active:opacity-100 transition-opacity" />
                    <div className="flex items-center gap-4 relative z-10">
                        <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center">
                            <Smartphone className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-indigo-100 uppercase tracking-[0.2em] leading-none mb-1">Install App</p>
                            <p className="text-sm font-black text-white uppercase tracking-tight">CrickBot Pro</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 relative z-10">
                        <button
                            onClick={handleInstallClick}
                            className="bg-white text-indigo-600 px-6 py-2.5 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg active:scale-95 transition-all"
                        >
                            Get Now
                        </button>
                    </div>
                </div>
            )}

            {/* PWA INSTALL BANNER (iOS/General Fallback) */}
            {((isIOS && !isStandalone) || (!deferredPrompt && !isStandalone && showInstallBanner)) && (
                <div className="mb-6 bg-slate-900/50 p-5 rounded-[2.5rem] border border-white/5 animate-slide-up">
                    <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-indigo-500/20 rounded-2xl flex items-center justify-center flex-none">
                            <Smartphone className="w-6 h-6 text-indigo-400" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs font-black text-white uppercase tracking-tight mb-1">Download to Home Screen</p>
                            <p className="text-[10px] font-bold text-slate-500 uppercase leading-relaxed">
                                {isIOS ? (
                                    <>Tap <Share2 className="w-3 h-3 inline text-brand-500 mx-0.5" /> then <span className="text-white">"Add to Home Screen"</span></>
                                ) : (
                                    <>Open Menu <span className="text-white">⋮</span> and select <span className="text-white">"Install App"</span></>
                                )}
                            </p>
                        </div>
                        <button onClick={() => setShowInstallBanner(false)} className="text-slate-700"><XCircle className="w-5 h-5" /></button>
                    </div>
                </div>
            )}




            {/* Header Panel */}
            <div className="mb-8 text-center">
                <div className="inline-flex p-3 rounded-3xl bg-brand-500/10 mb-4 ring-1 ring-brand-500/20">
                    <Trophy className="w-8 h-8 text-brand-500" />
                </div>
                <h1
                    onClick={() => {
                        const newCount = vaultClicks + 1;
                        if (newCount >= 5) {
                            navigate('/admin-vault');
                            setVaultClicks(0);
                        } else {
                            setVaultClicks(newCount);
                        }
                    }}
                    className="text-5xl font-black text-white tracking-tighter leading-none mb-2 select-none cursor-default"
                >
                    CrickBot<span className="text-brand-500">PRO</span>
                </h1>
                <p className="text-slate-400 font-bold uppercase tracking-[0.3em] text-[10px]">Professional Analytics Platform</p>
            </div>

            {/* Tabs */}
            <div className="bg-slate-900/50 p-1.5 rounded-2xl flex mb-8 border border-white/5">
                <button
                    onClick={() => setActiveTab('live')}
                    className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'live' ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'text-slate-500 hover:text-white'}`}
                >
                    Live Matches
                </button>
                <button
                    onClick={() => setActiveTab('completed')}
                    className={`flex-1 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'completed' ? 'bg-slate-700 text-white' : 'text-slate-500 hover:text-white'}`}
                >
                    Past History
                </button>
            </div>

            {/* Lobby Section */}
            <div className="flex-1 space-y-6">
                <div className="space-y-4">
                    {isLoading ? (
                        <div className="bg-slate-900/30 h-40 rounded-[2.5rem] border border-white/5 animate-pulse flex items-center justify-center">
                            <span className="text-[10px] font-black text-slate-700 uppercase tracking-[0.5em]">Syncing Archive...</span>
                        </div>
                    ) : sortedMatches?.length > 0 ? (
                        sortedMatches.map(m => (
                            <MatchCard key={m.id} match={m} />
                        ))
                    ) : (
                        <div className="text-center py-12 px-6 bg-slate-900/20 border border-white/5 rounded-[2.5rem] border-dashed">
                            <div className="w-12 h-12 bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
                                <Wifi className="w-6 h-6 text-slate-600" />
                            </div>
                            <p className="text-slate-600 font-black text-xs uppercase tracking-widest">{activeTab === 'live' ? 'No Matches Live' : 'Archive is Empty'}</p>
                            <p className="text-slate-800 text-[9px] mt-1 font-bold uppercase">{activeTab === 'live' ? 'Be the first to start a tournament.' : 'Completed matches will appear here.'}</p>
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
