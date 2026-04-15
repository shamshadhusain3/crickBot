import { useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Shield, ChevronLeft, Users, Settings2 } from 'lucide-react'
import { useMatchStore } from '../store/useMatchStore'

// Zod Validation Schema
const schema = z.object({
  teamA: z.string().min(1, "Team A is required").max(20, "Name too long"),
  teamB: z.string().min(1, "Team B is required").max(20, "Name too long"),
  overs: z.number().min(1).max(50),
  includeExtras: z.boolean(),
})

export default function MatchSetup() {
  const navigate = useNavigate()
  const setSetupData = useMatchStore((state) => state.setSetupData)

  const { register, handleSubmit, setValue, watch, formState: { errors, isValid } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      teamA: '',
      teamB: '',
      overs: 5,
      includeExtras: true
    },
    mode: "onChange"
  })

  // Watch values that require custom UI bindings (like buttons replacing radio inputs)
  const oversValue = watch('overs')
  const includeExtrasValue = watch('includeExtras')

  const onSubmit = (data) => {
    // 1. Commit to Zustand Store
    setSetupData(data)
    
    // 2. Navigate away (No more messy location.state passing)
    navigate('/toss')
  }

  return (
    <div className="p-6 min-h-screen flex flex-col animate-fade-in relative z-10">
      <button type="button" onClick={() => navigate(-1)} className="p-2 -ml-2 mb-4 inline-block opacity-70 hover:opacity-100 transition-opacity">
        <ChevronLeft className="w-7 h-7" />
      </button>

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold text-white">Match Setup</h1>
        <p className="text-slate-400 mt-1">Configure the rules and teams.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 flex-1 flex flex-col">
        <div className="space-y-6 flex-1">
          <div className="glass-panel p-5 space-y-5 bg-white/5">
             <div className="flex items-center gap-2 mb-2 text-brand-400">
               <Users className="w-5 h-5"/>
               <h3 className="font-semibold text-sm">TEAMS</h3>
             </div>
             
             <div>
              <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Team A Name</label>
              <input 
                {...register('teamA')}
                placeholder="e.g. Royal Challengers" 
                className="premium-input text-lg font-semibold"
              />
              {errors.teamA && <p className="text-red-400 text-xs mt-1">{errors.teamA.message}</p>}
            </div>
            
            <div className="flex items-center justify-center py-2">
              <div className="px-5 py-1.5 rounded-full bg-slate-800 text-xs font-bold text-slate-300 border border-slate-700/50 shadow-inner">VS</div>
            </div>

            <div>
              <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-2">Team B Name</label>
              <input 
                 {...register('teamB')}
                placeholder="e.g. Super Kings" 
                className="premium-input text-lg font-semibold"
              />
              {errors.teamB && <p className="text-red-400 text-xs mt-1">{errors.teamB.message}</p>}
            </div>
          </div>

          <div className="glass-panel p-5 bg-white/5">
            <label className="block text-xs font-bold tracking-wider text-slate-400 uppercase mb-4">Total Overs per Inning</label>
            <div className="flex gap-3">
              {[2, 5, 10, 20].map(num => (
                <button 
                  key={num}
                  type="button"
                  onClick={() => setValue('overs', num, { shouldValidate: true })}
                  className={`flex-1 py-3 rounded-xl font-extrabold text-lg transition-all ${oversValue === num ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/40 ring-2 ring-brand-400 transform scale-105' : 'bg-slate-800 text-slate-400 hover:bg-slate-700 border border-slate-700/50'}`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
          
          <div className="glass-panel p-5 bg-white/5">
            <div className="flex items-center gap-2 mb-4 text-brand-400">
               <Settings2 className="w-5 h-5"/>
               <h3 className="font-semibold text-sm">MATCH RULES</h3>
             </div>
             
             <div className="flex items-center justify-between bg-slate-800/80 p-4 rounded-xl border border-slate-700">
                <div>
                   <h4 className="text-white font-bold text-sm">Include Extras & Byes</h4>
                   <p className="text-slate-400 text-xs mt-1">If enabled, wides/no balls yield runs</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setValue('includeExtras', !includeExtrasValue)}
                  className={`w-14 h-7 rounded-full transition-colors relative flex items-center ${includeExtrasValue ? 'bg-brand-500' : 'bg-slate-600'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white absolute transition-transform ${includeExtrasValue ? 'translate-x-8' : 'translate-x-1'}`} />
                </button>
             </div>
          </div>
        </div>

        <div className="pb-8">
          <button 
            type="submit" 
            disabled={!isValid}
            className="btn-primary py-4 text-lg disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed group"
          >
            <span>Proceed to Toss</span>
            <Shield className="w-5 h-5 ml-1 opacity-80 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </form>
    </div>
  )
}
