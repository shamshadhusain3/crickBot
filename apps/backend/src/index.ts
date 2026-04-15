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

fastify.register(cors, { origin: '*' })
fastify.register(socketioServer, {
  cors: {
    origin: '*',
    methods: ["GET", "POST"]
  }
})

// === REST API ENDPOINTS ===

fastify.get('/ping', async (request, reply) => {
  return { status: 'ok', brand: 'CrickBot MVP Phase 2' }
})

// Create a Match with the settings
fastify.post('/api/matches', async (request, reply) => {
  const { teamA, teamB, overs, includeExtras, battingTeam, mode, rosterA, rosterB } = request.body as any
  
  const match = await prisma.match.create({
    data: {
      teamA,
      teamB,
      overs: parseInt(overs),
      includeExtras,
      mode: mode || 'quick',
      status: 'live',
      innings: {
        create: [{
           battingTeam
        }]
      }
    },
    include: { innings: true }
  })

  // If pro mode, create mock player records to attach IDs
  if (mode === 'pro' && rosterA && rosterB) {
     const dbRosterA = await Promise.all(rosterA.map((p: any) => prisma.player.create({ data: { name: p.name } })))
     const dbRosterB = await Promise.all(rosterB.map((p: any) => prisma.player.create({ data: { name: p.name } })))
     return { ...match, rosterA: dbRosterA, rosterB: dbRosterB }
  }
  
  return match
})

// Record a delivery and broadcast via WebSockets
fastify.post('/api/matches/:id/deliveries', async (request, reply) => {
  const { id } = request.params as any
  const { run, isExtra, extraType, isWicket } = request.body as any

  const match = await prisma.match.findUnique({
    where: { id },
    include: { innings: true }
  })
  
  if (!match) return reply.status(404).send({ error: "Match not found" })
  
  const currentInning = match.innings[match.innings.length - 1]

  // Business Logic based on User Request for Byes/Extras calculation
  let finalRuns = run
  if (isExtra && match.includeExtras) {
     finalRuns += 1 // e.g., Wide = 1 Run
  }
  
  // Here we would typically also handle over validation, but keeping MVP simple
  const delivery = await prisma.delivery.create({
    data: {
      inningId: currentInning.id,
      overNumber: 1, // Simplified for MVP
      ballNumber: 1,
      runs: finalRuns,
      extras: isExtra ? 1 : 0,
      extraType: extraType || 'none',
      wicketType: isWicket ? 'fall' : 'none'
    }
  })

  // Update Inning Totals
  const updatedInning = await prisma.inning.update({
    where: { id: currentInning.id },
    data: {
      totalRuns: { increment: finalRuns },
      totalWickets: { increment: isWicket ? 1 : 0 }
    }
  })

  // Broadcast the update to anyone watching
  fastify.io.to(id).emit('match-update', {
     matchId: id,
     delivery,
     score: {
       runs: updatedInning.totalRuns,
       wickets: updatedInning.totalWickets
     }
  })

  return { delivery, score: updatedInning }
})

// Get match score
fastify.get('/api/matches/:id', async (request, reply) => {
  const { id } = request.params as any
  return await prisma.match.findUnique({
    where: { id },
    include: { innings: { include: { deliveries: true } } }
  })
})

// === WEBSOCKETS ===
fastify.ready(err => {
  if (err) throw err
  fastify.io.on('connection', (socket) => {
    fastify.log.info(`Client connected: ${socket.id}`)
    
    socket.on('join-match', (matchId) => {
      socket.join(matchId)
      fastify.log.info(`Client joined match room: ${matchId}`)
    })
  })
})

const start = async () => {
  try {
    await fastify.listen({ port: 3001, host: '0.0.0.0' })
  } catch (err) {
    fastify.log.error(err)
    process.exit(1)
  }
}
start()
