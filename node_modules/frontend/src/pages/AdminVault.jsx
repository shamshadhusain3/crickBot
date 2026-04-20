import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { matchService } from '../services/matchService'
import { ShieldAlert, Lock, Trash2, ArrowLeft, Loader2, Database, ShieldCheck } from 'lucide-react'

export default function AdminVault() {
    const navigate = useNavigate()
    const queryClient = useQueryClient()
    const [pin, setPin] = useState('')
    const [isVerified, setIsVerified] = useState(() => {
        return localStorage.getItem('crick-vault-auth') === 'true'
    })
    const [error, setError] = useState('')

    const { data: matches, isLoading } = useQuery({
        queryKey: ['all-matches-vault'],
        queryFn: async () => {
            const live = await matchService.getMatches('live')
            const completed = await matchService.getMatches('completed')
            return [...live, ...completed].sort((a, b) => b.id.localeCompare(a.id))
        },
        enabled: isVerified
    })

    const purgeMutation = useMutation({
        mutationFn: (matchId) => matchService.deleteMatch(matchId, pin || '0011'), // Use verified session or current pin
        onSuccess: () => {
            queryClient.invalidateQueries(['all-matches-vault'])
            alert("Match purged from existence.")
        },
        onError: (err) => alert(err.response?.data?.error || "Purge failed")
    })

    const handleLogin = (e) => {
        e.preventDefault()
        if (pin === '0011') {
            setIsVerified(true)
            localStorage.setItem('crick-vault-auth', 'true')
            setError('')
        } else {
            setError('ACCESS DENIED: INVALID MASTER PIN')
            setPin('')
        }
    }

    const handleLogout = () => {
        setIsVerified(false)
        localStorage.removeItem('crick-vault-auth')
        setPin('')
        navigate('/')
    }

    if (!isVerified) {
        return (
            <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 animate-fade-in">
                <div className="w-full max-w-sm">
                    <div className="flex flex-col items-center mb-12">
                        <div className="w-20 h-20 bg-red-500/10 rounded-3xl flex items-center justify-center mb-6 ring-1 ring-red-500/20 shadow-2xl shadow-red-500/10">
                            <Lock className="w-10 h-10 text-red-500" />
                        </div>
                        <h1 className="text-3xl font-black text-white tracking-widest uppercase">Admin Vault</h1>
                        <p className="text-slate-600 text-[10px] font-black tracking-[0.3em] uppercase mt-2">Restricted Access only</p>
                    </div>

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-4">Security PIN</label>
                            <input 
                                type="password" 
                                value={pin}
                                onChange={(e) => setPin(e.target.value)}
                                placeholder="____"
                                maxLength={4}
                                className="w-full bg-slate-900 border-2 border-slate-700 text-center text-4xl py-6 rounded-[2.5rem] font-black tracking-[1em] focus:border-red-600 outline-none transition-all text-white"
                                autoFocus
                            />
                            {error && <p className="text-red-500 text-[9px] font-black uppercase text-center mt-2 animate-pulse">{error}</p>}
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            <button type="button" onClick={() => navigate('/')} className="bg-slate-800 text-slate-400 p-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest">Abort</button>
                            <button type="submit" className="bg-red-600 text-white p-5 rounded-[2rem] font-black text-[10px] uppercase tracking-widest shadow-xl shadow-red-600/20">Decrypt</button>
                        </div>
                    </form>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-slate-950 p-6 pt-12 pb-40 font-sans relative">
            <div className="flex justify-between items-center mb-12">
                <button onClick={() => navigate('/')} className="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-slate-400 border border-white/5 active:scale-90 transition-all">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div className="flex flex-col items-center">
                    <h2 className="text-xl font-black text-white uppercase tracking-tighter">System Vault</h2>
                    <div className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                        <span className="text-[8px] font-black text-green-500 uppercase tracking-widest">Admin Authorized</span>
                    </div>
                </div>
                <button onClick={handleLogout} className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/10 active:scale-90 transition-all shadow-lg shadow-red-500/5">
                    <Lock className="w-5 h-5" />
                </button>
            </div>

            <div className="space-y-4">
                <div className="flex items-center gap-3 mb-6 px-2">
                    <Database className="w-5 h-5 text-slate-700" />
                    <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest">Stored Matches ({matches?.length || 0})</h3>
                </div>

                {isLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 opacity-20">
                        <Loader2 className="w-10 h-10 animate-spin mb-4" />
                        <span className="text-[10px] font-black uppercase tracking-widest italic">Syncing Database...</span>
                    </div>
                ) : matches?.map(match => (
                    <div key={match.id} className="bg-slate-900/50 border border-white/5 p-6 rounded-[2.5rem] flex items-center justify-between group hover:border-red-500/30 transition-all">
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">ID: {match.id.slice(0, 8)}...</span>
                            <h4 className="text-base font-black text-white uppercase tracking-tighter">{match.teamA} <span className="text-slate-800 italic">vs</span> {match.teamB}</h4>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${match.status === 'live' ? 'bg-red-500/20 text-red-500' : 'bg-yellow-500/10 text-yellow-500 border border-yellow-500/10'}`}>
                                    {match.status}
                                </span>
                                <span className="text-[9px] font-black text-slate-600 uppercase italic">{match.overs} Overs</span>
                            </div>
                        </div>
                        <button 
                            disabled={purgeMutation.isPending}
                            onClick={() => { if(window.confirm("FATAL ACTION: This will permanently wipe this match. Proceed?")) purgeMutation.mutate(match.id) }} 
                            className="w-12 h-12 bg-red-500/10 rounded-2xl flex items-center justify-center text-red-500 border border-red-500/10 active:scale-90 active:bg-red-500 active:text-white transition-all disabled:opacity-20"
                        >
                            {purgeMutation.isPending && purgeMutation.variables === match.id ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash2 className="w-5 h-5" />}
                        </button>
                    </div>
                ))}
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-slate-950 via-slate-950 to-transparent pointer-events-none">
                <div className="max-w-xs mx-auto bg-slate-900/80 backdrop-blur-xl border border-red-500/20 p-4 rounded-3xl flex items-center gap-4 pointer-events-auto shadow-2xl">
                    <ShieldCheck className="w-8 h-8 text-red-600" />
                    <div>
                        <p className="text-[10px] font-black text-white uppercase leading-none mb-1">Master Control Active</p>
                        <p className="text-[8px] font-black text-slate-500 uppercase tracking-tighter leading-none">All purges are final and irreversible</p>
                    </div>
                </div>
            </div>
        </div>
    )
}
