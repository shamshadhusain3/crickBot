import { Link } from 'react-router-dom'
import { Video, Trophy, History, ShieldAlert } from 'lucide-react'

export default function Home() {
  return (
    <div className="p-6 flex flex-col h-full min-h-screen animate-fade-in relative z-10">
      <div className="mt-8 mb-12 text-center">
        <div className="inline-flex items-center justify-center p-4 bg-brand-500/20 rounded-full mb-4 ring-1 ring-brand-500/50">
          <ShieldAlert className="w-10 h-10 text-brand-400" />
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight bg-gradient-to-br from-white to-slate-400 bg-clip-text text-transparent pb-1">
          CrickBot
        </h1>
        <p className="text-slate-400 mt-2 font-medium tracking-wide uppercase text-sm">AI Web Umpire & Scorer</p>
      </div>

      <div className="space-y-4 flex-1">
        <Link to="/setup" className="glass-panel block p-6 active:scale-[0.98] transition-transform group relative overflow-hidden backdrop-blur-xl bg-white/5 border-white/10 hover:border-brand-500/30">
          <div className="absolute inset-0 bg-gradient-to-r from-brand-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center gap-4 relative z-10">
            <div className="p-4 bg-brand-500 rounded-2xl shadow-xl shadow-brand-500/30 transform group-hover:scale-110 transition-transform">
              <Video className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white mb-0.5">Start Match</h2>
              <p className="text-sm text-slate-400">Live AI tracking & automated scoring</p>
            </div>
          </div>
        </Link>
        
        <div className="glass-panel p-6 opacity-60 cursor-not-allowed border-dashed bg-transparent border-white/10">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-slate-800 rounded-2xl">
              <Trophy className="w-7 h-7 text-slate-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-300 mb-0.5">Tournaments</h2>
              <p className="text-sm text-slate-500">Coming soon in Phase 3</p>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 opacity-60 cursor-not-allowed border-dashed bg-transparent border-white/10">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-slate-800 rounded-2xl">
              <History className="w-7 h-7 text-slate-500" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-300 mb-0.5">Match History</h2>
              <p className="text-sm text-slate-500">View past scorecards & stats</p>
            </div>
          </div>
        </div>
      </div>
      
      <div className="text-center pb-6">
        <p className="text-xs text-slate-600 font-medium">v1.0.0-MVP • Local Instance</p>
      </div>
      
      {/* Background Decor */}
      <div className="absolute top-[10%] left-[-20%] w-80 h-80 bg-brand-600/20 blur-[120px] rounded-full pointer-events-none" />
    </div>
  )
}
