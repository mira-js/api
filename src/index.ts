// SPDX-License-Identifier: AGPL-3.0-only
import 'dotenv/config'
import { serve } from '@hono/node-server'
import { logger } from '@mira/shared-core/logger'
import { app } from './app.js'
import { startWorker } from './worker.js'

const port = Number(process.env.PORT) || 3000

startWorker()

serve({ fetch: app.fetch, port }, () =>
  logger.info(`MIRA running on http://localhost:${port}`, { port }),
)
