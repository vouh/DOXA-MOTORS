import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { mpesaConfigured, stkPush } from '@/lib/mpesa/daraja'

export async function POST(request: NextRequest) {
  try {
    if (!mpesaConfigured()) return NextResponse.json({ error: 'M-Pesa is not configured.' }, { status: 503 })
    const { bookingId, phone, amount } = await request.json() as { bookingId?: string; phone?: string; amount?: number }
    if (!bookingId || !phone || !amount || amount <= 0) return NextResponse.json({ error: 'Booking, phone and a positive amount are required.' }, { status: 400 })
    const booking = await prisma.carBooking.findUnique({ where: { id: bookingId } })
    if (!booking) return NextResponse.json({ error: 'Booking not found.' }, { status: 404 })
    const response = await stkPush({
      phone, amount, accountReference: booking.reference, description: 'Doxa car hire',
    })
    await prisma.carPayment.create({
      data: {
        bookingId, amount, phone, method: 'MPESA', status: 'PENDING',
        checkoutId: response.CheckoutRequestID,
      },
    })
    return NextResponse.json({ ok: true, checkoutId: response.CheckoutRequestID, message: response.CustomerMessage })
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : 'STK Push failed.' }, { status: 500 })
  }
}
