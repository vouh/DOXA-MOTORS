import { PrismaClient, PaymentMethod, StaffRole, UserStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Doxa Car Hire…')

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

  const director = await prisma.user.create({
    data: {
      email: 'superadmin@doxacarhire.com',
      fullName: 'Super Administrator',
      phone: '+254700000001',
      staffRole: StaffRole.DIRECTOR,
      status: UserStatus.ACTIVE,
      isSuperAdmin: true,
    },
  })

  await prisma.user.create({
    data: {
      email: 'admin@doxacarhire.com',
      fullName: 'Director',
      phone: '+254700000002',
      staffRole: StaffRole.DIRECTOR,
      status: UserStatus.ACTIVE,
    },
  })

  await prisma.user.create({
    data: {
      email: 'dispatch@doxacarhire.com',
      fullName: 'Office Clerk',
      phone: '+254711111111',
      staffRole: StaffRole.CLERK,
      status: UserStatus.ACTIVE,
    },
  })

  await prisma.user.create({
    data: {
      email: 'fleet@doxacarhire.com',
      fullName: 'Yard Staff',
      phone: '+254722222222',
      staffRole: StaffRole.YARD,
      status: UserStatus.ACTIVE,
    },
  })

  await prisma.user.create({
    data: {
      email: 'finance@doxacarhire.com',
      fullName: 'Accountant',
      phone: '+254733333333',
      staffRole: StaffRole.ACCOUNTANT,
      status: UserStatus.ACTIVE,
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
      commissionValue: 20,
      recurringDeduction: 500,
    },
  })

  const owner2 = await prisma.carOwner.create({
    data: {
      fullName: 'Jane Njoki',
      phone: '0722222222',
      nationalId: '23456789',
      commissionType: 'FIXED',
      commissionValue: 2000,
    },
  })

  const vehicle = await prisma.carVehicle.create({
    data: {
      ownerId: owner.id,
      regNumber: 'KCA123A',
      make: 'Toyota',
      model: 'Fielder',
      year: 2018,
      color: 'Silver',
      type: 'SALOON',
      dailyRate: 2500,
      status: 'AVAILABLE',
    },
  })

  await prisma.carVehicle.create({
    data: {
      ownerId: owner2.id,
      regNumber: 'KDB456B',
      make: 'Toyota',
      model: 'Axio',
      year: 2019,
      type: 'ECONOMY',
      dailyRate: 2200,
      status: 'AVAILABLE',
    },
  })

  const expiry = new Date()
  expiry.setDate(expiry.getDate() + 7)
  await prisma.vehicleDocument.create({
    data: { vehicleId: vehicle.id, type: 'INSURANCE', expiryDate: expiry },
  })

  const client = await prisma.carClient.create({
    data: {
      fullName: 'James Kariuki',
      phone: '0712345678',
      email: 'james@example.com',
      idOrPassportNo: '87654321',
      licenceNo: 'DL-001',
      physicalAddress: 'Roysambu, Nairobi',
      nextOfKin: 'Mary Kariuki 0799999999',
      status: 'ACTIVE',
    },
  })

  await prisma.carClient.create({
    data: {
      fullName: 'Peter Otieno',
      phone: '0734567890',
      idOrPassportNo: '11223344',
      licenceNo: 'DL-002',
      status: 'SUSPENDED',
    },
  })

  const start = new Date()
  start.setHours(8, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 2)

  const booking = await prisma.carBooking.create({
    data: {
      reference: 'DX-SEED001',
      clientId: client.id,
      vehicleId: vehicle.id,
      penaltyRuleId: rule.id,
      startAt: start,
      expectedReturnAt: end,
      dailyRate: 2500,
      days: 2,
      baseCharge: 5000,
      totalCharge: 5000,
      status: 'RESERVED',
      createdBy: director.id,
    },
  })

  await prisma.carVehicle.update({
    where: { id: vehicle.id },
    data: { status: 'RESERVED' },
  })

  await prisma.carPayment.create({
    data: {
      bookingId: booking.id,
      amount: 2500,
      method: PaymentMethod.MPESA,
      status: 'COMPLETED',
      mpesaRef: 'SEED-MPESA-001',
      paidAt: new Date(),
      receivedBy: director.fullName,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: director.id,
      action: 'seed.complete',
      entity: 'system',
      meta: { owners: 2, vehicles: 2, clients: 2, bookings: 1 },
    },
  })

  console.log('Seed complete:', {
    users: 5,
    owners: 2,
    vehicles: 2,
    clients: 2,
    bookings: 1,
  })
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
