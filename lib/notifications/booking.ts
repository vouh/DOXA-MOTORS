import { prisma } from '@/lib/prisma'
import { sendTransactionalEmail } from '@/lib/email/resend'
import { sendSms } from '@/lib/sms/send'

type ClientNotifyBase = {
  clientId: string
  clientName: string
  clientEmail: string | null
  clientPhone: string
}

type BookingNotifyInput = ClientNotifyBase & {
  bookingId: string
  reference: string
  vehicleLabel: string
  startAt: Date
  expectedReturnAt: Date
  days: number
  totalCharge: number
}

type DispatchNotifyInput = ClientNotifyBase & {
  bookingId: string
  reference: string
  vehicleLabel: string
  expectedReturnAt: Date
  fuelLevel: number
  odometer: number
}

function money(n: number) {
  return `KES ${Number(n).toLocaleString('en-KE')}`
}

function when(d: Date) {
  return d.toLocaleString('en-KE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function resolveEmailTo(clientEmail: string | null) {
  return (
    clientEmail?.trim() ||
    process.env.RESEND_TEST_EMAIL?.trim() ||
    process.env.FROM_EMAIL ||
    'noreply@doxacarhire.com'
  )
}

async function sendClientEmail(opts: {
  clientId: string
  clientName: string
  emailTo: string
  template: string
  subject: string
  plain: string
  htmlBody: string
}) {
  const emailLog = await prisma.messageLog.create({
    data: {
      recipientType: 'CLIENT',
      recipientId: opts.clientId,
      recipientName: opts.clientName,
      destination: opts.emailTo,
      channel: 'EMAIL',
      template: opts.template,
      subject: opts.subject,
      body: opts.plain,
      status: 'QUEUED',
    },
  })

  try {
    const sent = await sendTransactionalEmail({
      to: opts.emailTo,
      subject: opts.subject,
      htmlBody: opts.htmlBody,
    })
    await prisma.messageLog.update({
      where: { id: emailLog.id },
      data: sent.skipped
        ? { status: 'SKIPPED', error: 'RESEND_API_KEY missing — email not sent' }
        : { status: 'SENT', sentAt: new Date(), error: null },
    })
  } catch (err) {
    await prisma.messageLog.update({
      where: { id: emailLog.id },
      data: {
        status: 'FAILED',
        error: err instanceof Error ? err.message : 'Email send failed',
      },
    })
  }
}

async function sendClientSms(opts: {
  clientId: string
  clientName: string
  phone: string
  template: string
  body: string
}) {
  const smsLog = await prisma.messageLog.create({
    data: {
      recipientType: 'CLIENT',
      recipientId: opts.clientId,
      recipientName: opts.clientName,
      destination: opts.phone,
      channel: 'SMS',
      template: opts.template,
      body: opts.body,
      status: 'QUEUED',
    },
  })

  const sms = await sendSms({ to: opts.phone, message: opts.body })
  if (!sms.ok) {
    await prisma.messageLog.update({
      where: { id: smsLog.id },
      data: { status: 'FAILED', error: sms.error },
    })
  } else if (sms.skipped) {
    await prisma.messageLog.update({
      where: { id: smsLog.id },
      data: { status: 'QUEUED', error: sms.reason },
    })
  } else {
    await prisma.messageLog.update({
      where: { id: smsLog.id },
      data: { status: 'SENT', sentAt: new Date(), providerRef: sms.providerRef, error: null },
    })
  }
}

/**
 * Booking confirmed — email + SMS.
 * Email uses RESEND_TEST_EMAIL (onboarding inbox) until the domain is verified.
 * SMS is attempted automatically; without API keys it stays queued for later.
 */
export async function notifyBookingConfirmed(input: BookingNotifyInput) {
  const subject = `Booking confirmed — ${input.reference}`
  const plain = [
    `Hello ${input.clientName},`,
    ``,
    `Your Doxa Car Hire booking is confirmed.`,
    `Reference: ${input.reference}`,
    `Vehicle: ${input.vehicleLabel}`,
    `Start: ${when(input.startAt)}`,
    `Return: ${when(input.expectedReturnAt)}`,
    `Days: ${input.days}`,
    `Charge: ${money(input.totalCharge)}`,
    ``,
    `Thank you for choosing Doxa.`,
  ].join('\n')

  const htmlBody = `
    <p style="margin:0 0 12px;">Hello <strong>${escapeHtml(input.clientName)}</strong>,</p>
    <p style="margin:0 0 16px;">Your Doxa Car Hire booking is confirmed.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:6px 0;color:#666;">Reference</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(input.reference)}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Vehicle</td><td style="padding:6px 0;">${escapeHtml(input.vehicleLabel)}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Start</td><td style="padding:6px 0;">${escapeHtml(when(input.startAt))}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Return</td><td style="padding:6px 0;">${escapeHtml(when(input.expectedReturnAt))}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Days</td><td style="padding:6px 0;">${input.days}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Charge</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(money(input.totalCharge))}</td></tr>
    </table>
    <p style="margin:20px 0 0;color:#555;">Thank you for choosing Doxa.</p>
  `

  const emailTo = resolveEmailTo(input.clientEmail)
  await sendClientEmail({
    clientId: input.clientId,
    clientName: input.clientName,
    emailTo,
    template: 'booking_confirmed',
    subject,
    plain,
    htmlBody,
  })

  const smsBody = `Doxa: Booking ${input.reference} confirmed. ${input.vehicleLabel}. Return ${when(input.expectedReturnAt)}. Charge ${money(input.totalCharge)}.`
  await sendClientSms({
    clientId: input.clientId,
    clientName: input.clientName,
    phone: input.clientPhone,
    template: 'booking_confirmed',
    body: smsBody,
  })
}

/**
 * Vehicle dispatched — email + SMS after condition recorded and car released.
 */
export async function notifyVehicleDispatched(input: DispatchNotifyInput) {
  const subject = `Vehicle released — ${input.reference}`
  const plain = [
    `Hello ${input.clientName},`,
    ``,
    `Your vehicle has been released for hire.`,
    `Reference: ${input.reference}`,
    `Vehicle: ${input.vehicleLabel}`,
    `Please return by: ${when(input.expectedReturnAt)}`,
    `Fuel at release: ${input.fuelLevel}%`,
    `Odometer at release: ${input.odometer.toLocaleString('en-KE')} km`,
    ``,
    `Drive safely — thank you for choosing Doxa.`,
  ].join('\n')

  const htmlBody = `
    <p style="margin:0 0 12px;">Hello <strong>${escapeHtml(input.clientName)}</strong>,</p>
    <p style="margin:0 0 16px;">Your vehicle has been released for hire.</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px;">
      <tr><td style="padding:6px 0;color:#666;">Reference</td><td style="padding:6px 0;font-weight:600;">${escapeHtml(input.reference)}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Vehicle</td><td style="padding:6px 0;">${escapeHtml(input.vehicleLabel)}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Return by</td><td style="padding:6px 0;">${escapeHtml(when(input.expectedReturnAt))}</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Fuel at release</td><td style="padding:6px 0;">${input.fuelLevel}%</td></tr>
      <tr><td style="padding:6px 0;color:#666;">Odometer</td><td style="padding:6px 0;">${input.odometer.toLocaleString('en-KE')} km</td></tr>
    </table>
    <p style="margin:20px 0 0;color:#555;">Drive safely — thank you for choosing Doxa.</p>
  `

  const emailTo = resolveEmailTo(input.clientEmail)
  await sendClientEmail({
    clientId: input.clientId,
    clientName: input.clientName,
    emailTo,
    template: 'vehicle_dispatched',
    subject,
    plain,
    htmlBody,
  })

  const smsBody = `Doxa: ${input.vehicleLabel} released (${input.reference}). Return by ${when(input.expectedReturnAt)}. Fuel ${input.fuelLevel}%, odo ${input.odometer} km.`
  await sendClientSms({
    clientId: input.clientId,
    clientName: input.clientName,
    phone: input.clientPhone,
    template: 'vehicle_dispatched',
    body: smsBody,
  })
}
