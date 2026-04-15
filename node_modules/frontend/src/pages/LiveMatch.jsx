import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Camera, Settings, Circle, Wifi, WifiOff } from 'lucide-react'
import { useSocket } from '../hooks/useSocket'
import { useMatchStore } from '../store/useMatchStore'
import { matchService } from '../services/matchService'
import { useMutation } from '@tanstack/react-query'

export default function LiveMatch() {
   const navigate = useNavigate()

   // Extract strictly from Zustand! No location.state fragility.
   const { activeMatchId, includeExtras, battingTeam, teamA, teamB } = useMatchStore()

   if (!activeMatchId && !teamA) {
      return <div className="p-6 text-center text-white min-h-screen pt-20">Match corrupted.<br /><button onClick={() => navigate('/setup')} className="mt-4 px-4 py-2 bg-brand-500 rounded-full font-bold">Go Back</button></div>
   }

   const bowlingTeam = battingTeam === teamA ? teamB : teamA

   // Score UI State
   const [runs, setRuns] = useState(0)
   const [wickets, setWickets] = useState(0)
   const [oversCount, setOversCount] = useState(0)
   const [ballsThisOver, setBallsThisOver] = useState(0)
   const [currentOverHistory, setCurrentOverHistory] = useState([])

   // Bind WebSocket using Custom Hook
   const { isConnected, matchData } = useSocket(activeMatchId);

   useEffect(() => {
      if (matchData) {
         setRuns(matchData.score.runs)
         setWickets(matchData.score.wickets)

         let label = matchData.delivery.wicketType !== 'none' ? 'W' : (matchData.delivery.extras > 0 ? `${matchData.delivery.extraType.charAt(0).toUpperCase()}` : matchData.delivery.runs.toString())

         setCurrentOverHistory(prev => [...prev, { label, isExtra: matchData.delivery.extras > 0, isWicket: matchData.delivery.wicketType !== 'none', run: matchData.delivery.runs }])

         if (matchData.delivery.extras === 0) setBallsThisOver(prev => prev + 1)
      }
   }, [matchData])

   // Automatic over progression
   useEffect(() => {
      if (ballsThisOver >= 6) {
         setTimeout(() => {
            setOversCount(prev => prev + 1)
            setBallsThisOver(0)
            setCurrentOverHistory([])
         }, 2000)
      }
   }, [ballsThisOver])

   // TanStack Query API Mutator for tracking balls
   const { mutateAsync: postDelivery } = useMutation({
      mutationFn: (payload) => matchService.recordDelivery(activeMatchId, payload),
      onError: (err) => console.error("Failed API delivery post", err)
   })

   // Umpire Action Handler
   const sendDelivery = async (run, isExtra = false, extraType = '', isWicket = false) => {

      // Offline / Fallback handling gracefully
      if (!activeMatchId) {
         if (!isExtra) setBallsThisOver(prev => prev + 1)
         setRuns(prev => prev + run + (isExtra && includeExtras ? 1 : 0))
         if (isWicket) setWickets(prev => prev + 1)
         let label = isWicket ? 'W' : (isExtra ? `${extraType.charAt(0).toUpperCase()}` : run.toString())
         setCurrentOverHistory([...currentOverHistory, { label, isExtra, isWicket, run }])
         return
      }

      try {
         await postDelivery({ run, isExtra, extraType, isWicket })
      } catch (err) {
         // Toast notification could exist here
      }
   }

   const ActionBtn = ({ label, bgClass, onClick }) => (
      <button
         onClick={onClick}
         className={`font-extrabold text-xl py-4 rounded-2xl shadow-lg active:scale-95 transition-transform ${bgClass}`}
      >
         {label}
      </button>
   )

   return (
      <div className="flex flex-col h-screen max-h-screen bg-slate-950 text-white overflow-hidden animate-fade-in relative z-10 w-full">
         {/* Top Meta Bar */}
         <div className="px-4 py-3 bg-slate-900 border-b border-white/5 flex justify-between items-center z-10 flex-none relative">
            <div className="flex flex-col">
               <span className="text-xs font-bold text-slate-400 tracking-wider flex items-center gap-1">
                  LIVE
                  {isConnected ? <Wifi className="w-3 h-3 text-green-400" /> : <WifiOff className="w-3 h-3 text-red-500" />}
               </span>
               <span className="text-sm font-medium">{battingTeam} <span className="text-brand-500 font-bold px-1">v</span> {bowlingTeam}</span>
            </div>
         </div>

         {/* Main Score Area */}
         <div className="flex-none p-6 text-center z-10 relative">
            <div className="text-5xl font-black tabular-nums tracking-tighter">
               {runs} <span className="text-3xl text-slate-400 font-bold mx-1">-</span> <span className="text-brand-400">{wickets}</span>
            </div>
            <div className="mt-2 text-xl font-bold text-slate-300 tabular-nums flex items-center justify-center gap-2">
               Over {oversCount}.{ballsThisOver}
               {ballsThisOver >= 6 && (
                  <span className="px-2 py-0.5 text-xs bg-yellow-500/20 text-yellow-400 rounded-full ml-2 animate-pulse">OVER DONE</span>
               )}
            </div>
            {!includeExtras && (
               <p className="text-xs text-brand-400 mt-2 tracking-widest uppercase font-bold opacity-60">Extras Rules Disabled</p>
            )}
         </div>

         {/* The Current Over Timeline */}
         <div className="flex-none px-4 py-3 shadow-inner z-10">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none snap-x h-12">
               <div className="text-xs font-bold text-slate-500 mr-2 whitespace-nowrap snap-start">THIS OVER</div>
               {currentOverHistory.map((ball, i) => (
                  <div key={i} className={`flex-none w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-md snap-center
                 ${ball.isWicket ? 'bg-red-500 text-white ring-2 ring-red-400/50' :
                        ball.isExtra ? 'bg-orange-500 text-white' :
                           ball.run === 4 || ball.run === 6 ? 'bg-brand-500 text-white ring-2 ring-brand-400/50' :
                              'bg-slate-800 text-white border border-slate-700'}`}>
                     {ball.label}
                  </div>
               ))}
               {currentOverHistory.length === 0 && (
                  <Circle className="w-8 h-8 text-slate-700 mx-auto opacity-50" />
               )}
            </div>
         </div>

         {/* Camera / AI Feed Placeholder */}
         <div className="flex-1 bg-slate-900 border-y border-white/5 relative overflow-hidden flex flex-col items-center justify-center">
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20"></div>
            <div className="relative z-10 flex flex-col items-center gap-3">
               <div className="relative">
                  <Camera className="w-12 h-12 text-slate-600" />
                  <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-ping"></div>
               </div>
               <p className="text-slate-500 font-bold tracking-widest text-sm">AI CAMERA OFFLINE</p>
            </div>
         </div>

         {/* Umpire Controls (HUD) */}
         <div className="flex-none p-4 pb-8 bg-slate-900 z-10 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] border-t border-white/10 rounded-t-[2.5rem]">
            <div className="grid grid-cols-4 gap-3 mb-3">
               <ActionBtn onClick={() => sendDelivery(0)} label="DOT" bgClass="col-span-1 bg-slate-800 text-slate-300 border border-slate-700/50" />
               <ActionBtn onClick={() => sendDelivery(1)} label="1" bgClass="bg-slate-700 text-white hover:bg-slate-600" />
               <ActionBtn onClick={() => sendDelivery(2)} label="2" bgClass="bg-slate-700 text-white hover:bg-slate-600" />
               <ActionBtn onClick={() => sendDelivery(3)} label="3" bgClass="bg-slate-700 text-white hover:bg-slate-600" />

               <ActionBtn onClick={() => sendDelivery(4)} label="4" bgClass="col-span-2 bg-brand-600 text-white" />
               <ActionBtn onClick={() => sendDelivery(6)} label="6" bgClass="col-span-2 bg-brand-500 text-white ring-2 ring-brand-400 inset-ring" />
            </div>

            <div className="grid grid-cols-3 gap-3">
               <ActionBtn onClick={() => sendDelivery(0, true, 'wide', false)} label="WIDE" bgClass="bg-orange-500/20 text-orange-400 border border-orange-500/30" />
               <ActionBtn onClick={() => sendDelivery(0, true, 'no-ball', false)} label="NO BALL" bgClass="bg-orange-500/20 text-orange-400 border border-orange-500/30" />
               <ActionBtn onClick={() => sendDelivery(0, false, '', true)} label="WICKET" bgClass="bg-red-500 text-white shadow-red-500/30" />
            </div>
         </div>
      </div>
   )
}
