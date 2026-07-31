import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import { SITE_LOGO } from '@/lib/constants'

const NAVY = rgb(0.016, 0.231, 0.663)
const DARK = rgb(0.1, 0.1, 0.1)
const GREY = rgb(0.44, 0.44, 0.44)
const W = 595
const H = 842
const M = 50

export type HireReceiptInput = {
  reference: string
  clientName: string
  amount: number
  method: string
  mpesaRef?: string | null
  paidAt: Date
  vehicleReg?: string
}

export async function buildHireReceiptPdf(input: HireReceiptInput): Promise<Uint8Array> {
  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold)
  const page = pdf.addPage([W, H])
  let y = H - M

  try {
    const res = await fetch(SITE_LOGO)
    if (res.ok) {
      const buf = await res.arrayBuffer()
      const logo = await pdf.embedPng(buf).catch(() => pdf.embedJpg(buf))
      const logoImg = await logo
      page.drawImage(logoImg, { x: M, y: y - 40, width: 40, height: 40 })
    }
  } catch {
    /* logo optional */
  }

  page.drawText('Doxa Car Hire', { x: M + 50, y: y - 20, size: 16, font: bold, color: NAVY })
  page.drawText('Payment receipt', { x: M + 50, y: y - 38, size: 11, font, color: GREY })
  y -= 80

  const lines: [string, string][] = [
    ['Booking', input.reference],
    ['Client', input.clientName],
    ['Vehicle', input.vehicleReg || '—'],
    ['Amount (KES)', input.amount.toLocaleString()],
    ['Method', input.method],
    ['M-Pesa ref', input.mpesaRef || '—'],
    ['Paid at', input.paidAt.toLocaleString()],
  ]
  for (const [label, value] of lines) {
    page.drawText(label, { x: M, y, size: 10, font, color: GREY })
    page.drawText(String(value), { x: M + 140, y, size: 10, font: bold, color: DARK })
    y -= 22
  }

  return pdf.save()
}

/** @deprecated alias — prefer buildHireReceiptPdf */
export const buildReceiptPdf = buildHireReceiptPdf
