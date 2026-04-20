import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Shield, ChevronLeft, Users, Settings2, Trophy, Zap, Lock, Hash, Gauge } from 'lucide-react'
import { useMatchStore } from '../store/useMatchStore'

// Zod Validation Schema
const schema = z.object({
  mode: z.enum(['quick', 'pro']),
  teamA: z.string().min(1, "Team A is required").max(20, "Name too long"),
  teamB: z.string().min(1, "Team B is required").max(20, "Name too long"),
  overs: z.number().min(1).max(50),
  includeExtras: z.boolean(),
  umpirePin: z.string().regex(/^\d{4}$/, "PIN must be exactly 4 digits"),
  bowlerOverLimit: z.number().min(0).max(50),
  rosterA: z.array(z.object({ name: z.string(), isCaptain: z.boolean().optional() })).optional(),
  rosterB: z.array(z.object({ name: z.string(), isCaptain: z.boolean().optional() })).optional(),
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
  const [showCustomOvers, setShowCustomOvers] = useState(false)

  const { register, control, handleSubmit, setValue, watch, formState: { errors, isValid } } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      mode: 'quick',
      teamA: '',
      teamB: '',
      overs: 5,
      includeExtras: true,
      umpirePin: Math.floor(1000 + Math.random() * 9000).toString(),
      bowlerOverLimit: 2,
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
    <div className="p-6 min-h-screen flex flex-col animate-fade-in relative z-10 w-full mb-10">
      <button type="button" onClick={() => navigate(-1)} className="p-2 -ml-2 mb-4 w-fit inline-block opacity-70 hover:opacity-100 transition-opacity">
        <ChevronLeft className="w-7 h-7" />
      </button>

      <div className="mb-6">
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Match Setup</h1>
        <p className="text-slate-400 mt-1 font-medium">Define rules and secure your session.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 flex-1 flex flex-col">
        
        {/* MODE SELECTOR */}
        <div className="p-2 flex bg-white/5 border border-slate-700/50 rounded-2xl">
           <button 
             type="button" 
             onClick={() => setValue('mode', 'quick')}
             className={`flex-1 py-4 flex items-center justify-center gap-2 rounded-xl font-bold transition-all ${mode === 'quick' ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' : 'text-slate-400 hover:text-white'}`}
           >
             <Zap className="w-5 h-5" /> Quick Match
           </button>
           <button 
             type="button" 
             onClick={() => setValue('mode', 'pro')}
             className={`flex-1 py-4 flex items-center justify-center gap-2 rounded-xl font-bold transition-all ${mode === 'pro' ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30' : 'text-slate-400 hover:text-white'}`}
           >
             <Trophy className="w-5 h-5" /> Pro Analytics
           </button>
        </div>

        <div className="space-y-6 flex-1">
          
          {/* Security PIN */}
          <div className="glass-panel p-5 bg-white/5 border-l-4 border-brand-500">
             <div className="flex items-center gap-2 mb-4 text-brand-400">
                <Lock className="w-5 h-5"/>
                <h3 className="font-bold text-sm tracking-widest uppercase text-white">UMPIRE SECURITY</h3>
             </div>
             <div>
                <label className="block text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase mb-2 text-center">Set Umpire PIN (4 Digits)</label>
                <input 
                  {...register('umpirePin')}
                  maxLength={4}
                  placeholder="1234" 
                  className="bg-slate-900 border-2 border-slate-700 text-center text-4xl py-3 rounded-2xl font-black tracking-[1em] text-brand-500 focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none w-full tabular-nums"
                />
                {errors.umpirePin && <p className="text-red-400 text-[10px] font-bold mt-2 text-center uppercase">{errors.umpirePin.message}</p>}
                <p className="text-[9px] text-slate-500 mt-2 text-center font-bold">ONLY THE PERSON WITH THIS PIN CAN UPDATE THE SCORE.</p>
             </div>
          </div>

          <div className="p-5 space-y-5 bg-white/5 border border-white/5 rounded-3xl relative overflow-hidden">
             {mode === 'pro' && <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />}
             
             <div className="flex items-center gap-2 mb-2 text-brand-400">
               <Users className="w-5 h-5"/>
               <h3 className="font-bold text-sm text-white">TEAMS</h3>
             </div>
             
             <div>
              <label className="block text-xs font-black tracking-widest text-slate-500 uppercase mb-2">Team A Name</label>
              <input 
                {...register('teamA')}
                placeholder="e.g. Royal Challengers" 
                className="premium-input text-lg font-black"
              />
              {errors.teamA && <p className="text-red-400 text-xs mt-1">{errors.teamA.message}</p>}
            </div>

            {mode === 'pro' && (
               <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800">
                  <p className="text-[10px] font-black text-indigo-400 uppercase mb-3 flex justify-between">
                    <span>Team A (11 Players)</span>
                    <span className="text-slate-500">Radio for (C)</span>
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                     {fieldsA.map((field, index) => (
                        <div key={field.id} className="flex flex-row items-center gap-2">
                           <input 
                               type="radio" 
                               name="captainA"
                               defaultChecked={index === 0}
                               onChange={() => {
                                   fieldsA.forEach((_, i) => setValue(`rosterA.${i}.isCaptain`, i === index));
                               }}
                               className="w-4 h-4 accent-indigo-500 bg-slate-800 border-slate-700 cursor-pointer"
                           />
                           <div className="flex-1 relative">
                               <input 
                                  {...register(`rosterA.${index}.name`)} 
                                  placeholder={index === 0 ? "Captain Name" : `Player ${index + 1}`} 
                                  className={`w-full bg-slate-800 border ${watch(`rosterA.${index}.isCaptain`) ? 'border-indigo-500/50 ring-1 ring-indigo-500/20' : 'border-slate-700'} text-sm font-bold text-white px-3 py-2 rounded-lg outline-none transition-all`}
                               />
                               {watch(`rosterA.${index}.isCaptain`) && (
                                   <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">Captain</span>
                               )}
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            )}
            
            <div className="flex items-center justify-center py-2">
              <div className="px-5 py-1.5 rounded-full bg-slate-800 text-xs font-black text-slate-300 border border-slate-700/50 shadow-inner italic uppercase">Versus</div>
            </div>

            <div>
              <label className="block text-xs font-black tracking-widest text-slate-500 uppercase mb-2">Team B Name</label>
              <input 
                 {...register('teamB')}
                placeholder="e.g. Super Kings" 
                className="premium-input text-lg font-black"
              />
              {errors.teamB && <p className="text-red-400 text-xs mt-1">{errors.teamB.message}</p>}
            </div>

            {mode === 'pro' && (
               <div className="bg-slate-900/50 p-4 rounded-xl border border-slate-800 mt-4">
                  <p className="text-[10px] font-black text-indigo-400 uppercase mb-3 flex justify-between">
                    <span>Team B (11 Players)</span>
                    <span className="text-slate-500">Radio for (C)</span>
                  </p>
                  <div className="grid grid-cols-1 gap-2">
                     {fieldsB.map((field, index) => (
                        <div key={field.id} className="flex flex-row items-center gap-2">
                             <input 
                               type="radio" 
                               name="captainB"
                               defaultChecked={index === 0}
                               onChange={() => {
                                   fieldsB.forEach((_, i) => setValue(`rosterB.${i}.isCaptain`, i === index));
                               }}
                               className="w-4 h-4 accent-indigo-500 bg-slate-800 border-slate-700 cursor-pointer"
                           />
                           <div className="flex-1 relative">
                               <input 
                                  {...register(`rosterB.${index}.name`)} 
                                  placeholder={index === 0 ? "Captain Name" : `Player ${index + 1}`} 
                                  className={`w-full bg-slate-800 border ${watch(`rosterB.${index}.isCaptain`) ? 'border-indigo-500/50 ring-1 ring-indigo-500/20' : 'border-slate-700'} text-sm font-bold text-white px-3 py-2 rounded-lg outline-none transition-all`}
                               />
                               {watch(`rosterB.${index}.isCaptain`) && (
                                   <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[8px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">Captain</span>
                               )}
                           </div>
                        </div>
                     ))}
                  </div>
               </div>
            )}
          </div>

          <div className="p-5 bg-white/5 rounded-3xl border border-white/5">
            <div className="flex items-center gap-2 mb-4">
               <Hash className="w-5 h-5 text-brand-500"/>
               <h3 className="font-bold text-sm text-white">MATCH FORMAT</h3>
            </div>
            
            <div className="mb-6">
                <label className="block text-[10px] font-black tracking-widest text-slate-500 uppercase mb-4">Total Overs per Inning</label>
                {!showCustomOvers ? (
                    <div className="flex flex-wrap gap-2">
                        {[5, 10, 20].map(num => (
                            <button 
                            key={num}
                            type="button"
                            onClick={() => setValue('overs', num, { shouldValidate: true })}
                            className={`flex-1 min-w-[60px] py-4 rounded-xl font-black text-lg transition-all ${oversValue === num ? 'bg-brand-500 text-white shadow-xl shadow-brand-500/20' : 'bg-slate-800 text-slate-500 border border-white/5'}`}
                            >
                            {num}
                            </button>
                        ))}
                        <button 
                            type="button"
                            onClick={() => setShowCustomOvers(true)}
                            className="flex-1 min-w-[100px] py-4 rounded-xl font-black text-[10px] uppercase bg-slate-800 text-slate-500 border border-white/5"
                        >
                            Custom
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 bg-slate-900 border-2 border-brand-500/40 rounded-2xl p-1">
                        <input 
                            type="number"
                            {...register('overs', { valueAsNumber: true })}
                            className="flex-1 bg-transparent text-center text-xl py-2 font-black text-white outline-none min-w-0"
                            placeholder="00"
                        />
                        <button 
                            type="button" 
                            onClick={() => setShowCustomOvers(false)} 
                            className="flex-none px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-[10px] font-black uppercase text-slate-400 transition-colors"
                        >
                            Back
                        </button>
                    </div>
                )}
            </div>

            <div>
                <label className="block text-[10px] font-black tracking-widest text-slate-500 uppercase mb-4">Overs Limit per Bowler</label>
                {!watch('showCustomBowlerLimit') ? (
                    <div className="flex flex-wrap gap-2">
                        {[1, 2, 4, 10].map(num => (
                            <button 
                            key={num}
                            type="button"
                            onClick={() => setValue('bowlerOverLimit', num, { shouldValidate: true })}
                            className={`flex-1 min-w-[60px] py-3 rounded-xl font-black text-sm transition-all ${watch('bowlerOverLimit') === num ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/20' : 'bg-slate-800 text-slate-500 border border-white/5'}`}
                            >
                            {num}
                            </button>
                        ))}
                        <button 
                            type="button"
                            onClick={() => setValue('showCustomBowlerLimit', true)}
                            className="flex-1 min-w-[100px] py-3 rounded-xl font-black text-[10px] uppercase bg-slate-800 text-slate-500 border border-white/5"
                        >
                            Custom
                        </button>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 bg-slate-900 border-2 border-indigo-500/40 rounded-2xl p-1">
                        <input 
                            type="number"
                            {...register('bowlerOverLimit', { valueAsNumber: true })}
                            className="flex-1 bg-transparent text-center text-lg py-2 font-black text-white outline-none min-w-0"
                            placeholder="0"
                        />
                        <button 
                            type="button" 
                            onClick={() => setValue('showCustomBowlerLimit', false)} 
                            className="flex-none px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded-xl text-[10px] font-black uppercase text-slate-400 transition-colors"
                        >
                            Back
                        </button>
                    </div>
                )}
            </div>
          </div>
          
          <div className="p-5 bg-white/5 border border-white/5 rounded-3xl">
            <div className="flex items-center gap-2 mb-4 text-brand-400">
               <Settings2 className="w-5 h-5"/>
               <h3 className="font-bold text-sm text-white uppercase tracking-widest">RULES</h3>
             </div>
             
             <div className="flex items-center justify-between bg-slate-800/80 p-4 rounded-2xl border border-white/5 transition-all active:scale-[0.98]">
                <div>
                   <h4 className="text-white font-black text-sm uppercase">Extras & Byes</h4>
                   <p className="text-slate-500 text-[10px] mt-0.5 font-bold uppercase">Wides & No-balls add +1 run</p>
                </div>
                <button 
                  type="button" 
                  onClick={() => setValue('includeExtras', !includeExtrasValue)}
                  className={`w-14 h-7 rounded-full transition-all relative flex items-center ${includeExtrasValue ? 'bg-brand-500 shadow-lg shadow-brand-500/20' : 'bg-slate-700'}`}
                >
                  <div className={`w-5 h-5 rounded-full bg-white absolute transition-transform shadow-md ${includeExtrasValue ? 'translate-x-8' : 'translate-x-1'}`} />
                </button>
             </div>
          </div>
        </div>

        <div className="pb-8">
          <button 
            type="submit" 
            disabled={!isValid}
            className="w-full bg-brand-500 h-20 rounded-[2.5rem] font-black text-xl text-white shadow-2xl shadow-brand-500/30 active:scale-95 disabled:opacity-30 disabled:grayscale transition-all flex items-center justify-center gap-4 group"
          >
            PROCEED TO TOSS
            <Gauge className="w-6 h-6 animate-pulse group-hover:rotate-45 transition-transform" />
          </button>
        </div>
      </form>
    </div>
  )
}
