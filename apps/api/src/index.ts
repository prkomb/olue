import Fastify from 'fastify'
import cors from '@fastify/cors'
import { config } from './config.js'
import { connect, close } from './db/mongo.js'
import { ensureIndexes } from './db/indexes.js'
import { startScheduler } from './cron/schedule.js'
import { close as closeChromium } from './services/crawl/chromium.js'
import { close as closeLightpanda } from './services/crawl/lightpanda.js'
import { healthRoutes } from './routes/health.js'
import { competitorsRoutes } from './routes/competitors.js'
import { changesRoutes } from './routes/changes.js'
import { pagesRoutes } from './routes/pages.js'

const app = Fastify({ logger: { level: config.NODE_ENV === 'production' ? 'info' : 'debug' } })

await app.register(cors, { origin: true })

await connect()
await ensureIndexes()
app.log.info('mongo connected, indexes ensured')

const scheduler = startScheduler(app.log)

await app.register(healthRoutes, { prefix: '/api' })
await app.register(competitorsRoutes, { prefix: '/api' })
await app.register(changesRoutes, { prefix: '/api' })
await app.register(pagesRoutes, { prefix: '/api' })

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, async () => {
    app.log.info({ signal }, 'shutting down')
    try {
      scheduler.stop()
      await app.close()
      await closeLightpanda()
      await closeChromium()
      await close()
      process.exit(0)
    } catch (err) {
      app.log.error(err)
      process.exit(1)
    }
  })
}

try {
  await app.listen({ port: config.PORT, host: config.HOST })
} catch (err) {
  app.log.error(err)
  process.exit(1)
}
