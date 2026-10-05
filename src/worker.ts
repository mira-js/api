// SPDX-License-Identifier: AGPL-3.0-only
import { Worker } from 'bullmq'
import type { ResearchJobInput, ResearchResult } from '@mira/shared-core'
import { logger } from '@mira/shared-core/logger'
import { runPipeline } from './services/pipeline.js'
import { redisConnection } from './services/redis.js'

export function startWorker(): void {
  const worker = new Worker<ResearchJobInput, ResearchResult>(
    'research',
    async (job) => {
      const result = await runPipeline(job.data)
      if (!result.ok) throw result.error
      return result.value
    },
    { connection: redisConnection() },
  )

  worker.on('completed', (job) => {
    logger.info('[worker] job completed', { jobId: job.id })
  })

  worker.on('failed', (job, err) => {
    logger.error('[worker] job failed', { jobId: job?.id, err })
  })
}
