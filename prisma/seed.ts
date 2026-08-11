import { PrismaClient, StaffRole, UserStatus } from '@prisma/client'
import {
  ALL_PERMISSION_KEYS,
  PERMISSION_CATALOG,
  SUPER_ADMIN_ROLE_NAME,
} from '../lib/rbac/registry'

const prisma = new PrismaClient()

async function syncPermissions() {
  for (const def of PERMISSION_CATALOG) {
    await prisma.permission.upsert({
      where: { key: def.key },
      create: {
        key: def.key,
        label: def.label,
        category: def.category,
        description: def.description,
      },
      update: {
        label: def.label,
        category: def.category,
        description: def.description,
      },
    })
  }
}

async function ensureSuperAdminRole() {
  let role = await prisma.role.findUnique({ where: { name: SUPER_ADMIN_ROLE_NAME } })
  if (!role) {
    role = await prisma.role.create({
      data: {
        name: SUPER_ADMIN_ROLE_NAME,
        description: 'System role — full access. Cannot be deleted.',
        isSystem: true,
        active: true,
      },
    })
  }

  const perms = await prisma.permission.findMany({
    where: { key: { in: [...ALL_PERMISSION_KEYS] } },
    select: { id: true },
  })
  for (const p of perms) {
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: p.id } },
      create: { roleId: role.id, permissionId: p.id },
      update: {},
    })
  }
  return role
}

async function main() {
  console.log('Seeding Doxa Car Hire (RBAC Stage 2 — Super Admin only)…')

  await prisma.messageLog.deleteMany()
  await prisma.carPenalty.deleteMany()
  await prisma.carHireExtension.deleteMany()
  await prisma.conditionCheck.deleteMany()
  await prisma.carPayment.deleteMany()
  await prisma.carBooking.deleteMany()
  await prisma.carExpense.deleteMany()
  await prisma.ownerPayout.deleteMany()
  await prisma.vehicleDocument.deleteMany()
  await prisma.carVehicle.deleteMany()
  await prisma.carClient.deleteMany()
  await prisma.carOwner.deleteMany()
  await prisma.penaltyRule.deleteMany()
  await prisma.carHireSetting.deleteMany()
  await prisma.attachment.deleteMany()
  await prisma.broadcast.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.user.deleteMany()
  await prisma.rolePermission.deleteMany()
  await prisma.role.deleteMany()
  await prisma.permission.deleteMany()
  await prisma.rbacMeta.deleteMany()

  await prisma.rbacMeta.create({ data: { id: 1, version: 1 } })
  await syncPermissions()
  const superRole = await ensureSuperAdminRole()

  const director = await prisma.user.create({
    data: {
      email: 'superadmin@doxacarhire.com',
      fullName: 'Super Administrator',
      phone: '+254700000001',
      staffRole: StaffRole.DIRECTOR,
      status: UserStatus.ACTIVE,
      isSuperAdmin: true,
      roleId: superRole.id,
    },
  })

  const rule = await prisma.penaltyRule.create({
    data: {
      name: 'Standard lateness',
      graceMinutes: 30,
      rate: 500,
      rateUnit: 'HOUR',
      cap: 5000,
      active: true,
      updatedBy: director.id,
    },
  })

  const owner = await prisma.carOwner.create({
    data: {
      fullName: 'John Kamau',
      phone: '0711111111',
      email: 'john.owner@example.com',
      nationalId: '12345678',
      kraPin: 'A123456789X',
      bankDetails: 'Equity 0123456789',
      mpesaNumber: '0711111111',
      nextOfKin: 'Jane Kamau 0722222222',
      commissionType: 'PERCENTAGE',
      commissionValue: 30,
    },
  })

  const vehicle = await prisma.carVehicle.create({
    data: {
      regNumber: 'KDA 123A',
      make: 'Toyota',
      model: 'Axio',
      year: 2019,
      type: 'SALOON',
      dailyRate: 4500,
      status: 'AVAILABLE',
      ownerId: owner.id,
    },
  })

  const client = await prisma.carClient.create({
    data: {
      fullName: 'James Otieno',
      phone: '0700123456',
      email: 'james@example.com',
      idOrPassportNo: '87654321',
      licenceNo: 'DL-001',
      physicalAddress: 'Westlands, Nairobi',
      status: 'ACTIVE',
    },
  })

  const start = new Date()
  start.setHours(9, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 3)

  await prisma.carBooking.create({
    data: {
      reference: 'DX-SEED-001',
      clientId: client.id,
      vehicleId: vehicle.id,
      startAt: start,
      expectedReturnAt: end,
      days: 3,
      dailyRate: 4500,
      baseCharge: 13500,
      totalCharge: 13500,
      status: 'RESERVED',
      penaltyRuleId: rule.id,
      createdBy: director.id,
    },
  })

  await prisma.carHireSetting.create({
    data: { key: 'company_name', value: 'Doxa Motor Solutions' },
  })

  console.log('Seed complete.')
  console.log('  Super Admin:', director.email, '→ role', SUPER_ADMIN_ROLE_NAME)
  console.log('  No other staff roles seeded — create them in /admin/staff')
  console.log('  Run: npm run db:bootstrap-auth  (password SuperAdmin@2026!)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
