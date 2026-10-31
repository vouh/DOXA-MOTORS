import { PrismaClient } from '@prisma/client'

/** Relational hire data only. Auth and Storage stay on Supabase JS. */
import { isDatabaseConfigured, withPrismaConnectionParams } from '@/lib/database-config'
import { withDbRetry } from '@/lib/db-retry'
import { isConnectionError } from '@/lib/errors'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
  prismaRev?: number
  prismaWarm?: Promise<void>
}

/** Bump after adding models/relations so a running `next dev` drops a stale client. */
const PRISMA_CLIENT_REV = 6

function createTestPrisma(): PrismaClient {
  let proxy: PrismaClient
  const model = new Proxy({}, {
    get(_target, operation: string) {
      if (operation === 'findMany' || operation === 'groupBy') return async () => []
      if (operation === 'findFirst' || operation === 'findUnique') return async () => null
      if (operation === 'count') return async () => 0
      if (operation === 'aggregate') return async () => ({ _sum: { amount: 0 }, _count: 0 })
      if (operation === 'createMany' || operation === 'updateMany' || operation === 'deleteMany') {
        return async () => ({ count: 0 })
      }
      return async () => {
        throw new Error('This action needs a connected database. Test mode currently provides read-only dashboards.')
      }
    },
  })
  proxy = new Proxy({}, {
    get(_target, property: string) {
      if (property === '$connect' || property === '$disconnect') return async () => undefined
      if (property === '$transaction') {
        return async (input: unknown) => {
          if (Array.isArray(input)) return Promise.all(input)
          if (typeof input === 'function') return input(proxy)
          return input
        }
      }
      return model
    },
  }) as PrismaClient
  return proxy
}

function createPrisma() {
  const url = withPrismaConnectionParams(process.env.DATABASE_URL)
  const debug = process.env.NODE_ENV === 'development'
  const base = new PrismaClient({
    datasources: url ? { db: { url } } : undefined,
    log: debug
      ? [
          { emit: 'event', level: 'query' },
          { emit: 'stdout', level: 'error' },
          { emit: 'stdout', level: 'warn' },
        ]
      : ['error'],
  })
  if (debug) {
    // console.log is forwarded to the browser in `next dev`, matching prisma:error.
    base.$on('query', (event) => {
      console.log(`prisma:query ${event.duration}ms`, event.query)
    })
  }

  // Re-run failed queries when the pooler is briefly unreachable (first hit / idle drop).
  const client = base.$extends({
    query: {
      async $allOperations({ args, query }) {
        return withDbRetry(async () => {
          try {
            return await query(args)
          } catch (error) {
            if (isConnectionError(error)) {
              try {
                await base.$disconnect()
              } catch {
                /* ignore */
              }
            }
            throw error
          }
        }, 'prisma')
      },
    },
  })

  return client as unknown as PrismaClient
}

if (globalForPrisma.prismaRev !== PRISMA_CLIENT_REV && globalForPrisma.prisma) {
  void globalForPrisma.prisma.$disconnect()
  globalForPrisma.prisma = undefined
  globalForPrisma.prismaWarm = undefined
}

export const prisma = isDatabaseConfigured()
  ? globalForPrisma.prisma ?? createPrisma()
  : createTestPrisma()

if (process.env.NODE_ENV !== 'production' && isDatabaseConfigured()) {
  globalForPrisma.prisma = prisma
  globalForPrisma.prismaRev = PRISMA_CLIENT_REV
}

/** Open the pool early (with retries) so the first user request is less likely to fail. */
export function warmPrismaConnection(): Promise<void> {
  if (!isDatabaseConfigured()) return Promise.resolve()
  if (!globalForPrisma.prismaWarm) {
    globalForPrisma.prismaWarm = withDbRetry(() => prisma.$connect(), 'prisma-warm').catch((error) => {
      globalForPrisma.prismaWarm = undefined
      throw error
    })
  }
  return globalForPrisma.prismaWarm
}
