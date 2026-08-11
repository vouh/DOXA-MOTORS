import { z } from 'zod'

const optionalText = z.string().trim().optional().transform((value) => value || undefined)

const phone = z
  .string()
  .trim()
  .transform((v) => v.replace(/\D/g, ''))
  .pipe(
    z
      .string()
      .min(9, 'Phone must be 9–12 digits')
      .max(12, 'Phone must be 9–12 digits')
      .regex(/^\d{9,12}$/, 'Phone must contain digits only'),
  )

/** Empty → undefined; otherwise 9–12 digits only. */
const optionalPhone = z.preprocess((raw) => {
  if (raw == null) return undefined
  const digits = String(raw).replace(/\D/g, '')
  return digits.length ? digits : undefined
}, z.string().regex(/^\d{9,12}$/, 'Contact phone must be 9–12 digits').optional())

const personName = z
  .string()
  .trim()
  .min(2, 'Enter a full name')
  .max(100)
  .regex(/^[\p{L}\s.'-]+$/u, 'Name may only contain letters, spaces, apostrophes, or hyphens')

const idOrPassport = z
  .string()
  .trim()
  .transform((v) => v.replace(/[^A-Za-z0-9]/g, ''))
  .pipe(
    z
      .string()
      .min(4, 'ID / passport must be at least 4 characters')
      .max(20)
      .regex(/^[A-Za-z0-9]+$/, 'ID / passport may only contain letters and numbers'),
  )

const licenceNo = z
  .string()
  .trim()
  .transform((v) => v.replace(/[^A-Za-z0-9-]/g, '').toUpperCase())
  .pipe(
    z
      .string()
      .min(3, 'Licence number is required')
      .max(30)
      .regex(/^[A-Za-z0-9-]+$/, 'Licence may only contain letters, numbers, and hyphens'),
  )

export const clientSchema = z.object({
  fullName: personName,
  phone,
  email: z
    .string()
    .trim()
    .max(120)
    .email('Enter a valid email')
    .optional()
    .or(z.literal('')),
  idOrPassportNo: idOrPassport,
  licenceNo,
  licenceExpiry: z.preprocess(
    (v) => (v === '' || v == null ? undefined : v),
    z.coerce.date().optional(),
  ),
  physicalAddress: z
    .string()
    .trim()
    .min(3, 'Physical address is required')
    .max(200)
    .regex(/^[\p{L}\p{N}\s,.#/'-]+$/u, 'Address has invalid characters'),
  nextOfKin: z
    .string()
    .trim()
    .min(2, 'Next of kin is required')
    .max(100)
    .regex(/^[\p{L}\s.'-]+$/u, 'Next of kin may only contain letters and spaces'),
  employer: z
    .string()
    .trim()
    .min(2, 'Employer is required')
    .max(120)
    .regex(/^[\p{L}\p{N}\s.&'-]+$/u, 'Employer has invalid characters'),
  secondContact: phone,
  notes: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((value) => value || undefined),
})

export const ownerSchema = z.object({
  fullName: personName,
  phone,
  email: z.string().trim().email().optional().or(z.literal('')),
  nationalId: idOrPassport,
  kraPin: optionalText,
  bankDetails: optionalText,
  mpesaNumber: optionalPhone,
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
  year: z.preprocess(
    (value) => (value === '' || value == null ? undefined : value),
    z.coerce.number().int().min(1980).max(2100).optional(),
  ),
  color: optionalText,
  type: z.enum(['SALOON', 'SUV_4X4', 'VAN_MINIBUS', 'PICKUP', 'ECONOMY']),
  dailyRate: z.coerce.number().positive(),
  insuranceExpiry: z.preprocess(
    (value) => (value === '' || value == null ? undefined : value),
    z.coerce.date().optional(),
  ),
  inspectionExpiry: z.preprocess(
    (value) => (value === '' || value == null ? undefined : value),
    z.coerce.date().optional(),
  ),
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
  phone: optionalPhone,
  notes: optionalText,
  receivedBy: optionalText,
})

export const instaPayManualSchema = z.object({
  amount: z.coerce.number().positive(),
  method: z.enum(['CASH', 'MPESA', 'BANK', 'OTHER']),
  bookingId: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : undefined)),
  mpesaRef: optionalText,
  phone: optionalPhone,
  notes: optionalText,
  receivedBy: optionalText,
})

export const instaStkSchema = z.object({
  phone,
  amount: z.coerce.number().positive(),
  bookingId: z
    .string()
    .optional()
    .transform((v) => (v && v.trim() ? v.trim() : undefined)),
  accountRef: optionalText,
})

export const reconcilePaymentSchema = z.object({
  paymentId: z.string().min(1),
  bookingId: z.string().min(1),
})

export const expenseSchema = z.object({
  vehicleId: z.string().min(1),
  description: z.string().trim().min(2),
  category: z.string().trim().min(2),
  amount: z.coerce.number().positive(),
  incurredAt: z.coerce.date(),
})
