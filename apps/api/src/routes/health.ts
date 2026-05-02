import type { FastifyInstance } from 'fastify'
import { ping as pingMongo } from '../db/mongo.js'
import { probe as probeLightpanda } from '../services/crawl/lightpanda.js'

export async function healthRoutes(app: FastifyInstance) {
  app.get('/health', async () => {
    const [mongo, lightpanda] = await Promise.all([pingMongo(), probeLightpanda()])
    return { ok: mongo && lightpanda, mongo, lightpanda, ts: Date.now() }
  })
}
