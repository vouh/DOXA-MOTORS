import { describe, expect, it } from 'vitest'
import { extraChargesSum, parseExtraCharges } from './extra-charges'
import { commentChars, sanitizeComment } from './input-rules'
import { tryHireDays } from './calculations'

describe('booking comments', () => {
  it('allows line breaks and trims to a reasonable length', () => {
    expect(sanitizeComment('Fuel topped up.\nClient split fare.')).toBe(
      'Fuel topped up.\nClient split fare.',
    )
    expect(sanitizeComment('x'.repeat(800)).length).toBe(500)
  })

  it('strips scripts, URLs, and characters like # @', () => {
    expect(sanitizeComment('<script>alert(1)</script>Nice hire')).toBe('alert(1) Nice hire')
    expect(sanitizeComment('Meet @shell #fuel')).toBe('Meet shell fuel')
    expect(sanitizeComment('javascript:alert(1) and https://evil.test')).toBe('alert(1) and evil.test')
  })

  it('keeps typing-friendly newlines without collapsing a single break', () => {
    expect(commentChars('Line 1\nLine 2')).toBe('Line 1\nLine 2')
  })
})

describe('extra charges', () => {
  it('ignores blank rows and sums valid extras', () => {
    const form = new FormData()
    form.append('extraDescription', '')
    form.append('extraAmount', '')
    form.append('extraDescription', 'Fuel')
    form.append('extraAmount', '1500')
    const rows = parseExtraCharges(form)
    expect(rows).toEqual([{ description: 'Fuel', amount: 1500 }])
    expect(extraChargesSum(rows)).toBe(1500)
  })

  it('rejects an amount without a description', () => {
    const form = new FormData()
    form.append('extraDescription', '')
    form.append('extraAmount', '200')
    expect(() => parseExtraCharges(form)).toThrow(/description/)
  })
})

describe('hire days preview', () => {
  it('returns null until both dates are valid', () => {
    expect(tryHireDays(new Date('invalid'), new Date())).toBeNull()
  })

  it('uses whole hire days (minimum 1)', () => {
    expect(
      tryHireDays(new Date('2026-08-07T19:29:00Z'), new Date('2026-08-29T13:31:00Z')),
    ).toBe(22)
  })
})
