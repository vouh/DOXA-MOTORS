import { PrismaClient, PaymentMethod, ProjectStatus, Role, MemberStatus, WelfareStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Seeding Doxa Car Hire database...')

  await prisma.auditLog.deleteMany()
  await prisma.emailLog.deleteMany()
  await prisma.contribution.deleteMany()
  await prisma.welfareRequest.deleteMany()
  await prisma.galleryPhoto.deleteMany()
  await prisma.announcement.deleteMany()
  await prisma.document.deleteMany()
  await prisma.meeting.deleteMany()
  await prisma.event.deleteMany()
  await prisma.project.deleteMany()
  await prisma.user.deleteMany()

  const admin = await prisma.user.create({
    data: {
      email: 'superadmin@doxacarhire.com',
      fullName: 'Super Administrator',
      phone: '+254700000001',
      role: Role.ADMIN,
      status: MemberStatus.ACTIVE,
      isSuperAdmin: true,
      dashboardAccess: [
        Role.ADMIN,
        Role.EXECUTIVE,
        Role.TREASURER,
        Role.SECRETARY,
        Role.ORGANIZER,
        Role.MEMBER,
      ],
    },
  })

  await prisma.user.create({
    data: {
      email: 'admin@doxacarhire.com',
      fullName: 'System Administrator',
      phone: '+254700000002',
      role: Role.ADMIN,
      status: MemberStatus.ACTIVE,
      isSuperAdmin: false,
      dashboardAccess: [Role.ADMIN],
    },
  })

  const executive = await prisma.user.create({
    data: {
      email: 'manager@doxacarhire.com',
      fullName: 'Operations Manager',
      role: Role.EXECUTIVE,
      status: MemberStatus.ACTIVE,
    },
  })

  const treasurer = await prisma.user.create({
    data: {
      email: 'finance@doxacarhire.com',
      fullName: 'Finance Officer',
      role: Role.TREASURER,
      status: MemberStatus.ACTIVE,
    },
  })

  const secretary = await prisma.user.create({
    data: {
      email: 'dispatch@doxacarhire.com',
      fullName: 'Dispatch Officer',
      role: Role.SECRETARY,
      status: MemberStatus.ACTIVE,
    },
  })

  const organizer = await prisma.user.create({
    data: {
      email: 'fleet@doxacarhire.com',
      fullName: 'Fleet Manager',
      role: Role.ORGANIZER,
      status: MemberStatus.ACTIVE,
    },
  })

  const member = await prisma.user.create({
    data: {
      email: 'staff@doxacarhire.com',
      fullName: 'Jane Staff',
      phone: '+254700000099',
      role: Role.MEMBER,
      status: MemberStatus.ACTIVE,
    },
  })

  await prisma.user.create({
    data: {
      email: 'pending@doxacarhire.com',
      fullName: 'Pending Applicant',
      role: Role.MEMBER,
      status: MemberStatus.PENDING,
    },
  })

  const members = [admin, executive, treasurer, secretary, organizer, member]

  for (const [i, u] of members.entries()) {
    await prisma.contribution.create({
      data: {
        userId: u.id,
        amount: 5000 + i * 1000,
        description: 'Booking payment',
        category: 'Hire',
        paymentMethod: i % 2 === 0 ? PaymentMethod.MPESA : PaymentMethod.CASH,
        receivedBy: treasurer.fullName,
        mpesaRef: i % 2 === 0 ? `MPESA-${1000 + i}` : null,
        paidAt: new Date(Date.now() - i * 86400000 * 7),
      },
    })
  }

  await prisma.welfareRequest.create({
    data: {
      userId: member.id,
      description: 'Vehicle maintenance reimbursement request',
      amount: 8000,
      status: WelfareStatus.PENDING,
    },
  })

  await prisma.project.createMany({
    data: [
      {
        title: 'Fleet Expansion Phase 1',
        description: 'Adding 5 new vehicles to the hire fleet.',
        status: ProjectStatus.ONGOING,
        startDate: new Date('2026-01-15'),
      },
      {
        title: 'GPS Tracking Installation',
        description: 'Installing trackers across all vehicles.',
        status: ProjectStatus.UPCOMING,
        startDate: new Date('2026-08-01'),
      },
      {
        title: 'Sound System Upgrade 2025',
        description: 'Completed sound system installations.',
        status: ProjectStatus.COMPLETED,
        startDate: new Date('2025-01-01'),
        endDate: new Date('2025-12-31'),
      },
    ],
  })

  await prisma.announcement.create({
    data: {
      title: 'Welcome to Doxa Car Hire',
      content: 'Staff can now manage bookings, fleet, and client records online.',
      authorId: secretary.id,
    },
  })

  await prisma.event.createMany({
    data: [
      {
        title: 'Monthly Fleet Inspection',
        description: 'Routine check of all vehicles in the fleet.',
        location: 'Doxa Car Hire Yard, Nairobi',
        startsAt: new Date(Date.now() + 14 * 86400000),
      },
      {
        title: 'Staff Training Day',
        description: 'Customer service and booking system training.',
        location: 'Head Office',
        startsAt: new Date(Date.now() + 45 * 86400000),
      },
    ],
  })

  await prisma.galleryPhoto.createMany({
    data: [
      {
        url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?w=800',
        caption: 'Fleet display 2026',
        category: 'Fleet',
        isPublic: true,
        approvedAt: new Date(),
        uploadedBy: organizer.id,
      },
      {
        url: 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800',
        caption: 'Pending approval',
        category: 'Fleet',
        isPublic: false,
        uploadedBy: organizer.id,
      },
    ],
  })

  await prisma.document.create({
    data: {
      title: 'Hire Terms & Conditions',
      fileUrl: '/documents/hire-terms.pdf',
      category: 'Legal',
      uploadedBy: secretary.id,
    },
  })

  await prisma.meeting.create({
    data: {
      title: 'January Operations Review',
      agenda: 'Fleet status, booking targets, finance review',
      opening: 'The Manager opened the meeting at 09:00.',
      minutes: 'Fleet utilisation at 78%. Two vehicles scheduled for maintenance.',
      attendees: 'Manager, Finance Officer, Dispatch Officer, Fleet Manager',
      nextMeetingAt: new Date('2026-02-17'),
      status: 'FINAL',
      heldAt: new Date('2026-01-20'),
      attendance: 6,
      recordedBy: secretary.id,
    },
  })

  await prisma.meeting.create({
    data: {
      title: 'February Planning Draft',
      agenda: 'Corporate client outreach, tour packages',
      opening: 'Draft notes — not yet finalized.',
      minutes: 'Fleet manager to assess 3 new vehicles for acquisition.',
      status: 'DRAFT',
      heldAt: new Date('2026-02-10'),
      attendance: 4,
      recordedBy: secretary.id,
    },
  })

  await prisma.auditLog.create({
    data: {
      userId: admin.id,
      action: 'SEED',
      entity: 'database',
      meta: {},
    },
  })

  console.log('Seed complete.')
  console.log('Login accounts (Auth via npm run db:bootstrap-auth):')
  console.log('- superadmin@doxacarhire.com (ADMIN / super)')
  console.log('- admin@doxacarhire.com (ADMIN)')
  console.log('- manager@doxacarhire.com (EXECUTIVE / Manager)')
  console.log('- finance@doxacarhire.com (TREASURER / Finance)')
  console.log('- dispatch@doxacarhire.com (SECRETARY / Dispatch)')
  console.log('- fleet@doxacarhire.com (ORGANIZER / Fleet)')
  console.log('- staff@doxacarhire.com (MEMBER / Staff)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
