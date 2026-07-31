import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

type CallbackBody = {
  Body?: {
    stkCallback?: {
      MerchantRequestID?: string
      CheckoutRequestID?: string
      ResultCode?: number
      ResultDesc?: string
      CallbackMetadata?: {
        Item?: Array<{ Name: string; Value?: string | number }>
      }
    }
  }
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as CallbackBody
  const cb = body.Body?.stkCallback
  if (!cb) return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })

  const checkoutRequestId = cb.CheckoutRequestID
  const carPayment = checkoutRequestId
    ? await prisma.carPayment.findUnique({ where: { checkoutId: checkoutRequestId } })
    : null

  if (!carPayment) {
    return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
  }

  const items = cb.CallbackMetadata?.Item || []
  const receipt = String(items.find((i) => i.Name === 'MpesaReceiptNumber')?.Value || '')
  const amount = Number(items.find((i) => i.Name === 'Amount')?.Value || carPayment.amount)

  if (cb.ResultCode === 0) {
    if (receipt) {
      const dup = await prisma.carPayment.findFirst({
        where: { mpesaRef: receipt, NOT: { id: carPayment.id } },
      })
      if (dup) {
        return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
      }
    }
    await prisma.carPayment.update({
      where: { id: carPayment.id },
      data: {
        status: 'COMPLETED',
        amount,
        mpesaRef: receipt || carPayment.mpesaRef,
        paidAt: new Date(),
      },
    })
  } else {
    await prisma.carPayment.update({
      where: { id: carPayment.id },
      data: { status: 'FAILED' },
    })
  }

  return NextResponse.json({ ResultCode: 0, ResultDesc: 'Accepted' })
}
