import { z } from 'zod'

const optionalText = z.string().trim().optional().transform((value) => value || undefined)
const phone = z.string().trim().min(9, 'Enter a valid phone number').max(20)

export const clientSchema = z.object({
  fullName: z.string().trim().min(2),
  phone,
  email: z.string().trim().email().optional().or(z.literal('')),
  idOrPassportNo: z.string().trim().min(4),
  licenceNo: z.string().trim().min(3),
  licenceExpiry: z.coerce.date().optional(),
  physicalAddress: optionalText,
  nextOfKin: optionalText,
  employer: optionalText,
  secondContact: optionalText,
  notes: optionalText,
})

export const ownerSchema = z.object({
  fullName: z.string().trim().min(2),
  phone,
  email: z.string().trim().email().optional().or(z.literal('')),
  nationalId: z.string().trim().min(4),
  kraPin: optionalText,
  bankDetails: optionalText,
  mpesaNumber: optionalText,
  nextOfKin: optionalText,
  commissionType: z.enum(['PERCENTAGE', 'FIXED']).default('PERCENTAGE'),
  commissionValue: z.coerce.number().min(0),
  recurringDeduction: z.coerce.number().min(0).default(0),
})

export const vehicleSchema = z.object({
  ownerId: z.string().min(1),
  regNumber: z.string().trim().min(5).transform((value) => value.toUpperCase()),
  make: z.string().trim().min(2),
  model: z.string().trim().min(1),
  year: z.coerce.number().int().min(1980).max(2100).optional(),
  color: optionalText,
  type: z.enum(['SALOON', 'SUV_4X4', 'VAN_MINIBUS', 'PICKUP', 'ECONOMY']),
  dailyRate: z.coerce.number().positive(),
  insuranceExpiry: z.coerce.date().optional(),
  inspectionExpiry: z.coerce.date().optional(),
})

export const bookingSchema = z.object({
  clientId: z.string().min(1),
  vehicleId: z.string().min(1),
  startAt: z.coerce.date(),
  expectedReturnAt: z.coerce.date(),
  dailyRate: z.coerce.number().positive(),
  dispatchNotes: optionalText,
}).refine((value) => value.expectedReturnAt > value.startAt, {
  message: 'Return must be after dispatch.',
  path: ['expectedReturnAt'],
})

export const conditionSchema = z.object({
  dentsNotes: optionalText,
  fuelLevel: z.coerce.number().int().min(0).max(100).optional(),
  odometer: z.coerce.number().int().min(0).optional(),
  componentsOk: z.coerce.boolean().default(true),
})

export const penaltyRuleSchema = z.object({
  name: z.string().trim().min(2),
  graceMinutes: z.coerce.number().int().min(0),
  rate: z.coerce.number().min(0),
  rateUnit: z.enum(['HOUR', 'DAY']),
  cap: z.coerce.number().positive().optional(),
})

export const paymentSchema = z.object({
  bookingId: z.string().min(1),
  amount: z.coerce.number().positive(),
  method: z.enum(['CASH', 'MPESA', 'BANK', 'OTHER']),
  mpesaRef: optionalText,
  phone: optionalText,
})

export const expenseSchema = z.object({
  vehicleId: z.string().min(1),
  description: z.string().trim().min(2),
  category: z.string().trim().min(2),
  amount: z.coerce.number().positive(),
  incurredAt: z.coerce.date(),
})
