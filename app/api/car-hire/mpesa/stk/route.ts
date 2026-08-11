import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mpesaConfigured, stkPush } from '@/lib/mpesa/daraja'
import { ForbiddenError, requirePermission } from '@/lib/rbac/require'
import { PERMISSIONS } from '@/lib/rbac/registry'

function authErrorResponse(error: unknown) {
  if (error instanceof ForbiddenError) {
    return NextResponse.json({ error: error.message }, { status: 403 })
  }
  if (
    error instanceof Error &&
    (error.message === 'Unauthorized' || error.message === 'Account is not active')
  ) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  return null
}

export async function POST(request: NextRequest) {
  try {
    await requirePermission(PERMISSIONS.PAYMENT_STK)

    if (!mpesaConfigured()) {
      return NextResponse.json({ error: 'M-Pesa is not configured.' }, { status: 503 })
    }
    const body = (await request.json()) as {
      bookingId?: string
      phone?: string
      amount?: number
      accountRef?: string
    }
    const { phone, amount } = body
    const bookingId = body.bookingId?.trim() || undefined
    if (!phone || !amount || amount <= 0) {
      return NextResponse.json({ error: 'Phone and a positive amount are required.' }, { status: 400 })
    }

    let accountReference = (body.accountRef || 'INSTAPAY').slice(0, 12)
    if (bookingId) {
      const booking = await prisma.carBooking.findUnique({ where: { id: bookingId } })
      if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
      accountReference = booking.reference.slice(0, 12)
    }

    const response = await stkPush({
      phone,
      amount,
      accountReference,
      description: 'Doxa car hire',
    })

    await prisma.carPayment.create({
      data: {
        bookingId: bookingId || null,
        amount,
        phone,
        method: 'MPESA',
        status: 'PENDING',
        checkoutId: response.CheckoutRequestID,
        notes: bookingId ? null : 'Insta Pay — awaiting reconcile',
      },
    })

    return NextResponse.json({
      ok: true,
      checkoutId: response.CheckoutRequestID,
      message: response.CustomerMessage,
    })
  } catch (error) {
    const auth = authErrorResponse(error)
    if (auth) return auth
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'STK Push failed.' },
      { status: 500 },
    )
  }
}
