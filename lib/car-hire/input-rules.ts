/** Client-side input sanitizers + HTML constraint helpers for car-hire forms. */

import type { FormEvent } from 'react'

export const VETTING_NOTES_MAX = 500

export const ID_NUMBER_MAX = 10
export const LICENCE_NUMBER_MAX = 10
export const REG_NUMBER_MAX = 12
export const REG_NUMBER_MIN = 5
export const VEHICLE_MAKE_MAX = 40
export const VEHICLE_MODEL_MAX = 40
export const VEHICLE_COLOR_MAX = 30

export function digitsOnly(value: string, max = 12) {
  return value.replace(/\D/g, '').slice(0, max)
}

export function nameChars(value: string, max = 100) {
  return value.replace(/[^\p{L}\s.'-]/gu, '').slice(0, max)
}

export function alnumOnly(value: string, max = 20) {
  return value.replace(/[^A-Za-z0-9]/g, '').slice(0, max)
}

export function licenceChars(value: string, max = 30) {
  return value.replace(/[^A-Za-z0-9-]/g, '').slice(0, max).toUpperCase()
}

/** Plate: uppercase letters + digits + single spaces only, hard max length. */
export function regNumberChars(value: string, max = REG_NUMBER_MAX) {
  let next = String(value ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, '')
    .replace(/ {2,}/g, ' ')
  if (next.startsWith(' ')) next = next.trimStart()
  return next.slice(0, max)
}

export function vehicleMakeChars(value: string, max = VEHICLE_MAKE_MAX) {
  return nameChars(value, max)
}

export function vehicleModelChars(value: string, max = VEHICLE_MODEL_MAX) {
  return String(value ?? '')
    .replace(/[^\p{L}\p{N}\s.\-/]/gu, '')
    .slice(0, max)
}

export function vehicleColorChars(value: string, max = VEHICLE_COLOR_MAX) {
  return nameChars(value, max)
}

export function addressChars(value: string, max = 200) {
  return value.replace(/[^\p{L}\p{N}\s,.#/'-]/gu, '').slice(0, max)
}

export function orgChars(value: string, max = 120) {
  return value.replace(/[^\p{L}\p{N}\s.&'-]/gu, '').slice(0, max)
}

export function notesChars(value: string, max = VETTING_NOTES_MAX) {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, max)
}

/** Booking/return comments: line breaks allowed, scripts / @# and similar stripped. */
export const COMMENT_MAX = 500
export const EXTRA_DESC_MAX = 80
export const EXTRA_MAX_ROWS = 8

const COMMENT_FORBIDDEN = /[^\p{L}\p{N}\s.,;:!?'()/\-\n]/gu

export function commentChars(value: string, max = COMMENT_MAX) {
  return String(value ?? '')
    .replace(/\r\n?/g, '\n')
    .replace(/<[^>]*>/g, ' ')
    .replace(/https?:\/\//gi, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .replace(COMMENT_FORBIDDEN, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .slice(0, max)
}

export function sanitizeComment(value: unknown, max = COMMENT_MAX) {
  return commentChars(String(value ?? ''), max).trim()
}

/** Strip non-digits as the user types (uncontrolled inputs). */
export function onDigitsInput(max = 12) {
  return (e: FormEvent<HTMLInputElement>) => {
    e.currentTarget.value = digitsOnly(e.currentTarget.value, max)
  }
}

/**
 * Digits-only field that hard-caps length and flashes red when the user
 * tries to type/paste past the max.
 */
export function onCappedDigitsInput(max: number) {
  return (e: FormEvent<HTMLInputElement>) => {
    const el = e.currentTarget
    const rawDigits = el.value.replace(/\D/g, '')
    const over = rawDigits.length > max
    el.value = rawDigits.slice(0, max)
    if (over) {
      el.classList.add('doxa-input-over-limit')
    } else if (el.value.length < max) {
      el.classList.remove('doxa-input-over-limit')
    }
    el.setCustomValidity('')
  }
}

export function onNameInput(max = 100) {
  return (e: FormEvent<HTMLInputElement>) => {
    e.currentTarget.value = nameChars(e.currentTarget.value, max)
  }
}

export function onAlnumInput(max = 20) {
  return (e: FormEvent<HTMLInputElement>) => {
    e.currentTarget.value = alnumOnly(e.currentTarget.value, max)
  }
}

export function onLicenceInput(max = 30) {
  return (e: FormEvent<HTMLInputElement>) => {
    e.currentTarget.value = licenceChars(e.currentTarget.value, max)
  }
}

/**
 * Registration plate: force uppercase, letters/digits/single space, max length.
 * Shows over-limit styling only when the user tries to exceed the cap.
 */
export function onRegNumberInput(max = REG_NUMBER_MAX) {
  return (e: FormEvent<HTMLInputElement>) => {
    const el = e.currentTarget
    let next = el.value
      .toUpperCase()
      .replace(/[^A-Z0-9 ]/g, '')
      .replace(/ {2,}/g, ' ')
    if (next.startsWith(' ')) next = next.trimStart()
    const over = next.length > max
    el.value = next.slice(0, max)
    if (over) {
      el.classList.add('doxa-input-over-limit')
      el.setCustomValidity(`Maximum ${max} characters`)
    } else {
      el.classList.remove('doxa-input-over-limit')
      const keyLen = el.value.replace(/[^A-Z0-9]/g, '').length
      if (el.value && keyLen < REG_NUMBER_MIN) {
        el.setCustomValidity(`Enter at least ${REG_NUMBER_MIN} characters`)
      } else if (el.value.endsWith(' ')) {
        el.setCustomValidity('Remove the trailing space')
      } else {
        el.setCustomValidity('')
      }
    }
  }
}

export function onVehicleMakeInput(max = VEHICLE_MAKE_MAX) {
  return (e: FormEvent<HTMLInputElement>) => {
    e.currentTarget.value = vehicleMakeChars(e.currentTarget.value, max)
  }
}

export function onVehicleModelInput(max = VEHICLE_MODEL_MAX) {
  return (e: FormEvent<HTMLInputElement>) => {
    e.currentTarget.value = vehicleModelChars(e.currentTarget.value, max)
  }
}

export function onVehicleColorInput(max = VEHICLE_COLOR_MAX) {
  return (e: FormEvent<HTMLInputElement>) => {
    e.currentTarget.value = vehicleColorChars(e.currentTarget.value, max)
  }
}

export function onVehicleYearInput() {
  return (e: FormEvent<HTMLInputElement>) => {
    const el = e.currentTarget
    el.value = digitsOnly(el.value, 4)
  }
}

export function onDailyRateInput() {
  return (e: FormEvent<HTMLInputElement>) => {
    const el = e.currentTarget
    // Digits only for KES whole amounts
    el.value = digitsOnly(el.value, 9)
  }
}

export function onAddressInput(max = 200) {
  return (e: FormEvent<HTMLInputElement>) => {
    e.currentTarget.value = addressChars(e.currentTarget.value, max)
  }
}

export function onOrgInput(max = 120) {
  return (e: FormEvent<HTMLInputElement>) => {
    e.currentTarget.value = orgChars(e.currentTarget.value, max)
  }
}

export function onNotesInput(max = VETTING_NOTES_MAX) {
  return (e: FormEvent<HTMLTextAreaElement>) => {
    e.currentTarget.value = notesChars(e.currentTarget.value, max)
  }
}

export function onCommentInput(max = COMMENT_MAX) {
  return (e: FormEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    const el = e.currentTarget
    const start = el.selectionStart
    el.value = commentChars(el.value, max)
    if (start != null) {
      const next = Math.min(start, el.value.length)
      el.setSelectionRange(next, next)
    }
  }
}

/** HTML pattern — literal space (\\s is unreliable in browser pattern attrs). */
const NAME_PATTERN = "[A-Za-z .'-]{2,100}"

export const phoneInputProps = {
  inputMode: 'numeric' as const,
  autoComplete: 'tel' as const,
  pattern: '[0-9]{9,12}',
  maxLength: 12,
  minLength: 9,
  title: 'Use 9–12 digits only (e.g. 0714516132)',
  placeholder: '07XXXXXXXX',
}

export const nameInputProps = {
  pattern: NAME_PATTERN,
  maxLength: 100,
  minLength: 2,
  title: 'Letters, spaces, apostrophes, and hyphens only',
  autoComplete: 'name' as const,
}

export const nextOfKinInputProps = {
  ...nameInputProps,
  title: 'Letters and spaces only (e.g. James Kamau)',
}

export const idInputProps = {
  inputMode: 'numeric' as const,
  pattern: `[0-9]{4,${ID_NUMBER_MAX}}`,
  maxLength: ID_NUMBER_MAX,
  minLength: 4,
  title: `Numbers only, 4–${ID_NUMBER_MAX} digits`,
  placeholder: '12345678',
  autoComplete: 'off' as const,
}

export const licenceInputProps = {
  inputMode: 'numeric' as const,
  pattern: `[0-9]{3,${LICENCE_NUMBER_MAX}}`,
  maxLength: LICENCE_NUMBER_MAX,
  minLength: 3,
  title: `Numbers only, 3–${LICENCE_NUMBER_MAX} digits`,
  placeholder: '1234567890',
  autoComplete: 'off' as const,
}

export const emailInputProps = {
  type: 'email' as const,
  maxLength: 120,
  title: 'Enter a valid email address',
  autoComplete: 'email' as const,
}

export const addressInputProps = {
  maxLength: 200,
  minLength: 3,
  title: 'Letters, numbers, and common address punctuation only',
  autoComplete: 'street-address' as const,
}

export const orgInputProps = {
  maxLength: 120,
  minLength: 2,
  title: 'Letters, numbers, and basic punctuation only',
  autoComplete: 'organization' as const,
}

export const notesInputProps = {
  maxLength: VETTING_NOTES_MAX,
  title: `Optional notes, up to ${VETTING_NOTES_MAX} characters`,
}

/** No permanent helper text — browser shows title only on invalid submit. */
export const regNumberInputProps = {
  inputMode: 'text' as const,
  autoComplete: 'off' as const,
  autoCapitalize: 'characters' as const,
  spellCheck: false,
  maxLength: REG_NUMBER_MAX,
  minLength: REG_NUMBER_MIN,
  pattern: `[A-Z0-9]+( [A-Z0-9]+)*`,
  title: `Letters, numbers, and single spaces only (max ${REG_NUMBER_MAX})`,
  placeholder: 'KDA 123A',
}

export const vehicleMakeInputProps = {
  maxLength: VEHICLE_MAKE_MAX,
  minLength: 2,
  pattern: NAME_PATTERN,
  title: 'Letters, spaces, apostrophes, and hyphens only',
  autoComplete: 'off' as const,
  placeholder: 'Toyota',
}

export const vehicleModelInputProps = {
  maxLength: VEHICLE_MODEL_MAX,
  minLength: 1,
  title: 'Letters, numbers, and basic punctuation only',
  autoComplete: 'off' as const,
  placeholder: 'Axio',
}

export const vehicleColorInputProps = {
  maxLength: VEHICLE_COLOR_MAX,
  pattern: NAME_PATTERN,
  title: 'Letters and spaces only',
  autoComplete: 'off' as const,
  placeholder: 'Silver',
}

export const vehicleYearInputProps = {
  type: 'text' as const,
  inputMode: 'numeric' as const,
  maxLength: 4,
  minLength: 4,
  pattern: '(19|20)\\d{2}',
  title: '4-digit year (1980–2100)',
  autoComplete: 'off' as const,
  placeholder: '2022',
}

export const dailyRateInputProps = {
  type: 'text' as const,
  inputMode: 'numeric' as const,
  maxLength: 9,
  pattern: '[1-9][0-9]*',
  title: 'Enter a positive amount in KES',
  autoComplete: 'off' as const,
}
