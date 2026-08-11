import { PrismaClient } from '@prisma/client'
import { isDatabaseConfigured, withPrismaConnectionParams } from '@/lib/database-config'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

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
  return new PrismaClient({
    datasources: url ? { db: { url } } : undefined,
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  })
}

export const prisma = isDatabaseConfigured()
  ? globalForPrisma.prisma ?? createPrisma()
  : createTestPrisma()

if (process.env.NODE_ENV !== 'production' && isDatabaseConfigured()) globalForPrisma.prisma = prisma
