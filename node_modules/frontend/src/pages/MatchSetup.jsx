import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Shield, ChevronLeft, Users, Settings2, Trophy, Zap } from 'lucide-react'
import { useMatchStore } from '../store/useMatchStore'

// Zod Validation Schema
const schema = z.object({
  mode: z.enum(['quick', 'pro']),
  teamA: z.string().min(1, "Team A is required").max(20, "Name too long"),
  teamB: z.string().min(1, "Team B is required").max(20, "Name too long"),
  overs: z.number().min(1).max(50),
  includeExtras: z.boolean(),
  rosterA: z.array(z.object({ name: z.string() })).optional(),
  rosterB: z.array(z.object({ name: z.string() })).optional(),
}).superRefine((data, ctx) => {
  if (data.mode === 'pro') {
    if (!data.rosterA || data.rosterA.length === 0 || data.rosterA.some(p => !p.name)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Rosters must be completely filled out for Pro Mode.", path: ["rosterA"] })
    }
  }
})

export default function MatchSetup() {
  const navigate = useNavigate()
  const setSetupData = useMatchStore((state) => state.setSetupData)

  const { register, control, handleSubmit, setValue, watch, formState: { errors, isValid } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      mode: 'quick',
      teamA: '',
      teamB: '',
      overs: 5,
      includeExtras: true,
      rosterA: Array.from({length: 11}, (_, i) => ({ name: '', isCaptain: i === 0 })),
      rosterB: Array.from({length: 11}, (_, i) => ({ name: '', isCaptain: i === 0 }))
    },
    mode: "onChange"
  })

  const { fields: fieldsA } = useFieldArray({ control, name: "rosterA" })
  const { fields: fieldsB } = useFieldArray({ control, name: "rosterB" })

  const mode = watch('mode')
  const oversValue = watch('overs')
  const includeExtrasValue = watch('includeExtras')

  const onSubmit = (data) => {
    setSetupData(data)
    navigate('/toss')
  }

  return (
    <div className="p-6 min-h-screen flex flex-col animate-fade-in relative z-10 w-full">
      <button type="button" onClick={() => navigate(-1)} className="p-2 -ml-2 mb-4 w-fit inline-block opacity-70 hover:opacity-100 transition-opacity">
        <ChevronLeft className="w-7 h-7" />
      </button>

      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-white">Match Setup</h1>
        <p className="text-slate-400 mt-1">Configure the rules and teams.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 flex-1 flex flex-col">
        
        {/* MODE SELECTOR */}
        <div className="glass-panel p-2 flex bg-white/5 border border-slate-700/50 rounded-2xl">
           <button 
             type="button" 
             onClick={() => setValue('mode', 'quick')}
             className={`flex-1 py-4 flex items-center justify-center gap-2 rounded-xl font-bold transition-all ${mode === 'quick' ? 'bg-brand-500 text-white shadow-md shadow-brand-500/20' : 'text-slate-400 hover:text-white'}`}
           >
             <Zap className="w-5 h-5" /> Quick Match
           </button>
           <button 
             type="button" 
             onClick={() => setValue('mode', 'pro')}
             className={`flex-1 py-4 flex items-center justify-center gap-2 rounded-xl font-bold transition-all ${mode === 'pro' ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30 ring-1 ring-indigo-400' : 'text-slate-400 hover:text-white'}`}
           >
             <Trophy className="w-5 h-5" /> Pro Analytics
           </button>
        </div>

        <div className="space-y-6 flex-1">
          <div className="glass-panel p-5 space-y-5 bg-white/5 relative overflow-hidden">
             {mode === 'pro' && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />}
             
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

            {/* TEAM A ROSTER */}
            {mode === 'pro' && (
               <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                  <p className="text-xs font-bold text-indigo-400 uppercase mb-3 flex justify-between">
                    <span>Team A 11-Man Roster</span>
                    <span className="text-[10px] text-slate-500">Select (C)</span>
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                     {fieldsA.map((field, index) => (
                        <div key={field.id} className="flex flex-row items-center gap-2">
                           <input 
                              type="radio" 
                              name="captainA"
                              defaultChecked={index === 0}
                              onChange={() => setValue(`rosterA.${index}.isCaptain`, true)}
                              onClick={() => {
                                 const currentRoster = watch('rosterA');
                                 currentRoster.forEach((_, i) => setValue(`rosterA.${i}.isCaptain`, i === index));
                              }}
                              className="w-4 h-4 text-indigo-500 bg-slate-800 border-slate-700 focus:ring-indigo-500"
                           />
                           <input 
                              {...register(`rosterA.${index}.name`)} 
                              placeholder={`Player ${index + 1}`} 
                              className="bg-slate-800 border border-slate-700 text-sm text-white px-3 py-2 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none flex-1"
                           />
                        </div>
                     ))}
                  </div>
               </div>
            )}
            
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

            {/* TEAM B ROSTER */}
            {mode === 'pro' && (
               <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mt-4">
                  <p className="text-xs font-bold text-indigo-400 uppercase mb-3 flex justify-between">
                    <span>Team B 11-Man Roster</span>
                    <span className="text-[10px] text-slate-500">Select (C)</span>
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                     {fieldsB.map((field, index) => (
                        <div key={field.id} className="flex flex-row items-center gap-2">
                            <input 
                              type="radio" 
                              name="captainB"
                              defaultChecked={index === 0}
                              onChange={() => setValue(`rosterB.${index}.isCaptain`, true)}
                              onClick={() => {
                                 const currentRoster = watch('rosterB');
                                 currentRoster.forEach((_, i) => setValue(`rosterB.${i}.isCaptain`, i === index));
                              }}
                              className="w-4 h-4 text-indigo-500 bg-slate-800 border-slate-700 focus:ring-indigo-500"
                           />
                           <input 
                              {...register(`rosterB.${index}.name`)} 
                              placeholder={`Player ${index + 1}`} 
                              className="bg-slate-800 border border-slate-700 text-sm text-white px-3 py-2 rounded-lg focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 outline-none flex-1"
                           />
                        </div>
                     ))}
                  </div>
                  {errors.rosterA && <p className="text-red-400 text-xs mt-3 text-center">Please fill out all roster fields completely.</p>}
               </div>
            )}
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
            className="btn-primary py-4 text-lg disabled:opacity-50 disabled:active:scale-100 disabled:cursor-not-allowed group w-full"
          >
            <span>Proceed to Toss</span>
            <Shield className="w-5 h-5 ml-1 opacity-80 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </form>
    </div>
  )
}
