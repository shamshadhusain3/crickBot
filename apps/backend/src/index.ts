import Fastify from 'fastify'
import cors from '@fastify/cors'
import socketioServer from 'fastify-socket.io'
import { PrismaClient } from '@prisma/client'
import { Server } from 'socket.io'

declare module 'fastify' {
  interface FastifyInstance {
    io: Server
  }
}

const prisma = new PrismaClient()
const fastify = Fastify({ logger: true })

const allowedOrigins = [
  process.env.FRONTEND_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'https://crickbot.netlify.app'
].filter(Boolean) as string[]

fastify.register(cors, { 
    origin: allowedOrigins.length ? allowedOrigins : '*',
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
})
fastify.register(socketioServer, {
  cors: {
    origin: allowedOrigins.length ? allowedOrigins : '*',
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"]
  }
})

// === HELPERS ===
async function calculatePlayerStats(inningId: string, strikerId: string | null, nonStrikerId: string | null, activeBowlerId: string | null) {
    const deliveries = await prisma.delivery.findMany({ where: { inningId } });
    
    // Fetch all players associated with this match/innings to get names
    const involvedPlayerIds = Array.from(new Set([
        ...deliveries.map(d => d.batterId),
        ...deliveries.map(d => d.bowlerId),
        strikerId, nonStrikerId, activeBowlerId
    ].filter(id => id !== null) as string[]));

    const playersMap = (await prisma.player.findMany({
        where: { id: { in: involvedPlayerIds } }
    })).reduce((acc, p) => ({ ...acc, [p.id]: p.name }), {} as Record<string, string>);

    const getBatterStats = (pid: string) => {
        const balls = deliveries.filter(d => d.batterId === pid);
        const legalBallsForBatter = balls.filter(d => d.extraType !== 'wide');
        const runs = balls.reduce((acc, d) => acc + d.runs, 0);
        const fours = balls.filter(d => d.runs === 4).length;
        const sixes = balls.filter(d => d.runs === 6).length;
        const wicketBall = balls.find(d => d.wicketType !== 'none');
        const bowledBy = wicketBall ? (playersMap[wicketBall.bowlerId!] || 'Unknown') : null;

        return { 
            id: pid, 
            name: playersMap[pid] || 'Unknown',
            runs, balls: legalBallsForBatter.length, fours, sixes, 
            sr: legalBallsForBatter.length ? ((runs / legalBallsForBatter.length) * 100).toFixed(1) : "0.0",
            bowledBy 
        };
    }

    const getAllBowlersStats = () => {
        const bowlerIds = Array.from(new Set(deliveries.map(d => d.bowlerId).filter(id => id !== null) as string[]));
        
        return bowlerIds.map(pid => {
            const balls = deliveries.filter(d => d.bowlerId === pid);
            const legalBalls = balls.filter(d => d.extras === 0);
            const runsConceded = balls.reduce((acc, d) => acc + d.runs, 0);
            const wickets = balls.filter(d => d.wicketType !== 'none').length;
            const overs = Math.floor(legalBalls.length / 6);
            const remBalls = legalBalls.length % 6;

            const overNumbers = Array.from(new Set(balls.map(d => d.overNumber))).sort((a,b) => a-b);
            const overHistory = overNumbers.map(oNum => {
                const overDeliveries = balls.filter(d => d.overNumber === oNum);
                const dots = Array.from({length: overDeliveries.length}, (_, i) => {
                    const d = overDeliveries[i];
                    if (d.wicketType !== 'none') return 'W';
                    if (d.extras > 0) return d.extraType.charAt(0).toUpperCase();
                    return d.runs.toString();
                });
                return { overNumber: oNum, balls: dots.join(' ') };
            });

            return {
                id: pid,
                name: playersMap[pid] || 'Unknown',
                overs: `${overs}.${remBalls}`,
                overCount: overs + (remBalls > 0 ? 1 : 0),
                runs: runsConceded,
                wickets,
                econ: legalBalls.length ? ((runsConceded / (legalBalls.length / 6))).toFixed(2) : "0.00",
                overHistory
            };
        });
    }

    const outPlayerIds = Array.from(new Set(deliveries.filter(d => d.wicketType !== 'none').map(d => d.batterId).filter(id => id !== null) as string[]));
    const outBatters = outPlayerIds.map(pid => getBatterStats(pid));

    const playedBattersWithDeliveries = Array.from(new Set(deliveries.map(d => d.batterId).filter(id => id !== null) as string[]));
    const activeIds = [strikerId, nonStrikerId].filter(id => id !== null);
    const retiredPlayerIds = playedBattersWithDeliveries.filter(pid => 
        !activeIds.includes(pid) && !outPlayerIds.includes(pid)
    );
    const retiredBatters = retiredPlayerIds.map(pid => getBatterStats(pid));

    // Calculate Man of the Match (POTM) - AGGREGATE ACROSS ALL INNINGS
    const match = await prisma.match.findFirst({
        where: { innings: { some: { id: inningId } } },
        include: { 
            players: { include: { player: true } },
            innings: { include: { deliveries: true }, orderBy: { createdAt: 'asc' } }
        }
    });

    const allMatchDeliveries = match?.innings.flatMap(inn => inn.deliveries) || [];
    
    let bestScore = -1;
    let potm: any = null;

    const winnerTeamLabel = match?.winningTeam; 
    const isCompleted = match?.status === 'completed';

    // Involved players in the WHOLE match
    const matchPlayersMap = match?.players.reduce((acc, mp) => ({ ...acc, [mp.playerId]: mp.player.name }), {} as Record<string, string>) || {};
    const matchWidePlayerIds = Object.keys(matchPlayersMap);

    matchWidePlayerIds.forEach(pid => {
        const mPlayer = match?.players.find(mp => mp.playerId === pid);
        const playerTeamName = mPlayer?.team === 'A' ? match?.teamA : match?.teamB;
        
        // POTM only from winning team logic
        // If match is completed, we ONLY pick from the winning team
        if (isCompleted && winnerTeamLabel && playerTeamName !== winnerTeamLabel) return;

        // Batting Stats across match
        const bBalls = allMatchDeliveries.filter(d => d.batterId === pid);
        const runs = bBalls.reduce((acc, d) => acc + d.runs, 0);
        const ballsFaced = bBalls.length;

        // Bowling Stats across match
        const bowlBalls = allMatchDeliveries.filter(d => d.bowlerId === pid);
        const legalBowlBalls = bowlBalls.filter(d => d.extras === 0);
        const runsConceded = bowlBalls.reduce((acc, d) => acc + d.runs, 0);
        const wickets = bowlBalls.filter(d => d.wicketType !== 'none').length;
        const overs = `${Math.floor(legalBowlBalls.length / 6)}.${legalBowlBalls.length % 6}`;
        
        const score = (runs * 1.5) + (wickets * 30);
        
        if (score > bestScore) {
            bestScore = score;
            
            // Build comprehensive summary as requested
            let summaryParts = [];
            if (runs > 0 || ballsFaced > 0) {
                summaryParts.push(`${runs} runs (${ballsFaced} balls)`);
            }
            if (wickets > 0 || overs !== "0.0") {
                summaryParts.push(`${wickets}/${runsConceded} (${overs} overs)`);
            }

            potm = {
                id: pid,
                name: matchPlayersMap[pid] || "Unknown",
                teamName: playerTeamName,
                summary: summaryParts.join(' | ') || "No major contribution"
            };
        }
    });

    const allBowlers = getAllBowlersStats();

    const lastDelivery = await prisma.delivery.findFirst({
        where: { inningId },
        orderBy: { createdAt: 'desc' }
    });

    return {
        striker: strikerId ? getBatterStats(strikerId) : null,
        nonStriker: nonStrikerId ? getBatterStats(nonStrikerId) : null,
        bowler: activeBowlerId ? getAllBowlersStats().find(b => b.id === activeBowlerId) : null,
        outBatters,
        retiredBatters,
        allBowlers,
        potm,
        lastBowlerId: lastDelivery?.bowlerId || null
    };
}

// === REST API ENDPOINTS ===

fastify.get('/ping', async () => ({ status: 'ok', brand: 'CrickBot Pro Engine' }))

// MASTER VAULT PIN (Only for admin purge)
const MASTER_VAULT_PIN = "0011";

// List Live Matches (Lobby)
fastify.get('/api/matches', async (request) => {
    const { status } = request.query as any
    return prisma.match.findMany({
        where: status ? { status } : { status: 'live' },
        include: { innings: { orderBy: { createdAt: 'asc' } } },
        orderBy: { createdAt: 'desc' }
    });
})

// Delete Match (Admin Vault)
fastify.delete('/api/matches/:id', async (request, reply) => {
    const { id } = request.params as any;
    const { vaultPin } = request.body as any;

    if (vaultPin?.toString() !== MASTER_VAULT_PIN) {
        return reply.status(403).send({ error: "Unauthorized access to vault" });
    }

    try {
        // Manual Cascade for SQLite compatibility
        await prisma.$transaction(async (tx) => {
            // 1. Get all innings for this match
            const innings = await tx.inning.findMany({ where: { matchId: id } });
            const inningIds = innings.map(i => i.id);

            // 2. Delete all deliveries in those innings
            await tx.delivery.deleteMany({ where: { inningId: { in: inningIds } } });

            // 3. Delete all innings
            await tx.inning.deleteMany({ where: { matchId: id } });

            // 4. Delete all match players
            await tx.matchPlayer.deleteMany({ where: { matchId: id } });

            // 5. Delete the match itself
            await tx.match.delete({ where: { id } });
        });

        return { status: 'purged', id };
    } catch (err) {
        console.error("Purge Error:", err);
        return reply.status(500).send({ error: "Failed to purge match" });
    }
});

// Create Match
fastify.post('/api/matches', async (request) => {
  const { teamA, teamB, overs, includeExtras, battingTeam, mode, rosterA, rosterB, umpirePin, bowlerOverLimit } = request.body as any
  
  const match = await prisma.match.create({
    data: {
      teamA, teamB,
      overs: parseInt(overs),
      includeExtras,
      mode: mode || 'quick',
      status: 'live',
      umpirePin: umpirePin?.toString() || null,
      bowlerOverLimit: parseInt(bowlerOverLimit || 0),
      innings: { create: [{ battingTeam }] }
    },
    include: { innings: true }
  })

  if (mode === 'pro' && rosterA && rosterB) {
     const dbRosterA = await Promise.all(rosterA.map((p: any) => prisma.player.create({ data: { name: p.isCaptain ? `${p.name} (C)` : p.name } })))
     const dbRosterB = await Promise.all(rosterB.map((p: any) => prisma.player.create({ data: { name: p.isCaptain ? `${p.name} (C)` : p.name } })))
     
     // LINK ROSTERS
     await Promise.all([
         ...dbRosterA.map(p => prisma.matchPlayer.create({ data: { matchId: match.id, playerId: p.id, team: 'A' } })),
         ...dbRosterB.map(p => prisma.matchPlayer.create({ data: { matchId: match.id, playerId: p.id, team: 'B' } }))
     ])

     return { ...match, rosterA: dbRosterA, rosterB: dbRosterB }
  }
  return match
})

// Update Active Players
fastify.post('/api/matches/:id/innings/players', async (request, reply) => {
    const { id } = request.params as any
    const { strikerId, nonStrikerId, currentBowlerId, pin } = request.body as any
    
    const match = await prisma.match.findUnique({ where: { id }, include: { innings: { orderBy: { createdAt: 'asc' } } }})
    if (!match) return reply.status(404).send({ error: "Match not found" })
    
    if (match.umpirePin && match.umpirePin !== pin?.toString()) {
        return reply.status(403).send({ error: "Invalid Umpire PIN" })
    }

    const currentInning = match.innings[match.innings.length - 1]

    const updated = await prisma.inning.update({
        where: { id: currentInning.id },
        data: { 
            strikerId: strikerId !== undefined ? strikerId : currentInning.strikerId,
            nonStrikerId: nonStrikerId !== undefined ? nonStrikerId : currentInning.nonStrikerId,
            currentBowlerId: currentBowlerId !== undefined ? currentBowlerId : currentInning.currentBowlerId
        }
    })

    const updatedMatch = await prisma.match.findUnique({
        where: { id },
        include: { innings: true }
    })

    const inningsWithStats = await Promise.all(updatedMatch!.innings.map(async (inn) => {
        return {
            ...inn,
            stats: await calculatePlayerStats(inn.id, inn.strikerId, inn.nonStrikerId, inn.currentBowlerId)
        }
    }))

    const stats = await calculatePlayerStats(updated.id, updated.strikerId, updated.nonStrikerId, updated.currentBowlerId)
    const payload = { event: 'player-update', strikerId: updated.strikerId, nonStrikerId: updated.nonStrikerId, currentBowlerId: updated.currentBowlerId, stats, innings: inningsWithStats }
    fastify.io.to(id).emit('match-update', payload)
    return payload
})

// Record Delivery
fastify.post('/api/matches/:id/deliveries', async (request, reply) => {
  const { id } = request.params as any
  const { run, isExtra, extraType, isWicket, pin } = request.body as any

  const match = await prisma.match.findUnique({ where: { id }, include: { innings: { orderBy: { createdAt: 'asc' } } }})
  if (!match) return reply.status(404).send({ error: "Match not found" })

  if (match.umpirePin && match.umpirePin !== pin?.toString()) {
    return reply.status(403).send({ error: "Invalid Umpire PIN" })
  }

  const currentInning = match.innings[match.innings.length - 1]
  const { strikerId, nonStrikerId, currentBowlerId } = currentInning

  if (match.mode === 'pro' && (!strikerId || !nonStrikerId || !currentBowlerId)) {
      return reply.status(400).send({ error: "Striker, Non-Striker, or Bowler not selected" })
  }

  let finalRuns = run
  if (isExtra && match.includeExtras) finalRuns += 1

  const legalBallsInInning = await prisma.delivery.count({ where: { inningId: currentInning.id, extras: 0 }})
  const overNumber = Math.floor(legalBallsInInning / 6) + 1
  const ballNumber = (legalBallsInInning % 6) + 1

  const delivery = await prisma.delivery.create({
    data: {
      inningId: currentInning.id,
      overNumber, ballNumber,
      runs: finalRuns,
      extras: isExtra ? 1 : 0,
      extraType: extraType || 'none',
      wicketType: isWicket ? 'fall' : 'none',
      batterId: strikerId,
      bowlerId: currentBowlerId
    }
  })

  // Strike Rotation Logic
  let nextStrikerId = strikerId
  let nextNonStrikerId = nonStrikerId
  let nextBowlerId = currentBowlerId

  if (finalRuns % 2 !== 0) {
      nextStrikerId = nonStrikerId
      nextNonStrikerId = strikerId
  }
  if (isWicket) nextStrikerId = null

  const isOverEnd = (legalBallsInInning + (isExtra ? 0 : 1)) % 6 === 0 && !isExtra
  if (isOverEnd) {
      const temp = nextStrikerId
      nextStrikerId = nextNonStrikerId
      nextNonStrikerId = temp
      nextBowlerId = null 
  }

  const updatedInning = await prisma.inning.update({
    where: { id: currentInning.id },
    data: {
      totalRuns: { increment: finalRuns },
      totalWickets: { increment: isWicket ? 1 : 0 },
      strikerId: nextStrikerId,
      nonStrikerId: nextNonStrikerId,
      currentBowlerId: nextBowlerId
    }
  })

  const stats = await calculatePlayerStats(updatedInning.id, nextStrikerId, nextNonStrikerId, nextBowlerId)
  
  const updatedMatch = await prisma.match.findUnique({
    where: { id },
    include: { innings: { orderBy: { createdAt: 'asc' } } }
  })

  const inningsWithStats = await Promise.all(updatedMatch!.innings.map(async (inn) => {
      return {
          ...inn,
          stats: await calculatePlayerStats(inn.id, inn.strikerId, inn.nonStrikerId, inn.currentBowlerId)
      }
  }))

  let responseData: any = { 
     matchId: id, 
     delivery: { ...delivery, overNumber, ballNumber }, 
     score: { 
         runs: updatedInning.totalRuns, 
         wickets: updatedInning.totalWickets, 
         overs: Math.floor((legalBallsInInning + (isExtra ? 0 : 1)) / 6), 
         balls: (legalBallsInInning + (isExtra ? 0 : 1)) % 6 
     },
     strikerId: nextStrikerId,
     nonStrikerId: nextNonStrikerId,
     currentBowlerId: nextBowlerId,
     stats,
     innings: inningsWithStats, // ADDED for scorecard sync
     event: 'live' 
  };

  const totalLegalBalls = legalBallsInInning + (isExtra ? 0 : 1)
  const isOversUp = totalLegalBalls >= (match.overs * 6)
  const isAllOut = updatedInning.totalWickets >= 10

  // RE-FETCH match for precise logic check (especially for target and inning length)
  const freshMatch = await prisma.match.findUnique({ where: { id }, include: { innings: { orderBy: { createdAt: 'asc' } } }})
  if (!freshMatch) return responseData

  if (isAllOut || isOversUp) {
      await prisma.inning.update({ where: { id: currentInning.id }, data: { status: 'completed' }})
      if (freshMatch.innings.length === 1) {
          const target = updatedInning.totalRuns + 1
          await prisma.match.update({ where: { id }, data: { target } })
          const team2 = currentInning.battingTeam === freshMatch.teamA ? freshMatch.teamB : freshMatch.teamA
          await prisma.inning.create({ data: { matchId: freshMatch.id, battingTeam: team2 }})
          responseData.event = 'inning-break'
          responseData.target = target
          responseData.newBattingTeam = team2
      }
  }

  if (freshMatch.innings.length === 2 && freshMatch.target) {
      const isChased = updatedInning.totalRuns >= freshMatch.target
      const isDefended = (isAllOut || isOversUp) && updatedInning.totalRuns < freshMatch.target
      if (isChased || isDefended) {
          const winningTeam = isChased ? currentInning.battingTeam : (currentInning.battingTeam === freshMatch.teamA ? freshMatch.teamB : freshMatch.teamA)
          await prisma.match.update({ 
              where: { id }, 
              data: { 
                  status: 'completed',
                  winningTeam
              }
          })
          responseData.event = 'match-completed'
          responseData.winningTeam = winningTeam
          responseData.reason = isChased ? `${10 - updatedInning.totalWickets} wickets.` : `${freshMatch.target - 1 - updatedInning.totalRuns} runs.`
          
          // RE-CALCULATE stats one last time to ensure POTM is from the winning team
          const finalStats = await calculatePlayerStats(updatedInning.id, nextStrikerId, nextNonStrikerId, nextBowlerId)
          responseData.stats = finalStats
      }
  }

  fastify.io.to(id).emit('match-update', responseData)
  return responseData
})

fastify.get('/api/matches/:id', async (request) => {
  const { id } = request.params as any
  const match = await prisma.match.findUnique({
    where: { id },
    include: { 
        innings: { include: { deliveries: true }, orderBy: { createdAt: 'asc' } },
        players: { include: { player: true } }
    }
  })
  if (!match) return { error: "Not found" }
  
  // Transform Roster
  const rosterA = match.players.filter(p => p.team === 'A').map(p => p.player)
  const rosterB = match.players.filter(p => p.team === 'B').map(p => p.player)

  // Calculate stats for ALL innings
  const inningsWithStats = await Promise.all(match.innings.map(async (inn) => {
      return {
          ...inn,
          stats: await calculatePlayerStats(inn.id, inn.strikerId, inn.nonStrikerId, inn.currentBowlerId)
      }
  }))

  const currentInning = match.innings[match.innings.length - 1]
  const currentStats = await calculatePlayerStats(currentInning.id, currentInning.strikerId, currentInning.nonStrikerId, currentInning.currentBowlerId)
  
  return { ...match, rosterA, rosterB, innings: inningsWithStats, stats: currentStats }
})

fastify.ready(err => {
  if (err) throw err
  fastify.io.on('connection', (socket) => {
    socket.on('join-match', (matchId) => { socket.join(matchId) })
  })
})

const start = async () => {
    try { 
        const port = parseInt(process.env.PORT || '3001')
        await fastify.listen({ port, host: '0.0.0.0' }) 
    } 
    catch (err) { fastify.log.error(err); process.exit(1) }
}
start()
