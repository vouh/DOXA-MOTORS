/** Client-side input sanitizers + HTML constraint helpers for car-hire forms. */

import type { FormEvent } from 'react'

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

export function addressChars(value: string, max = 200) {
  return value.replace(/[^\p{L}\p{N}\s,.#/'-]/gu, '').slice(0, max)
}

export function orgChars(value: string, max = 120) {
  return value.replace(/[^\p{L}\p{N}\s.&'-]/gu, '').slice(0, max)
}

export function notesChars(value: string, max = 2000) {
  return value.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').slice(0, max)
}

/** Strip non-digits as the user types (uncontrolled inputs). */
export function onDigitsInput(max = 12) {
  return (e: FormEvent<HTMLInputElement>) => {
    e.currentTarget.value = digitsOnly(e.currentTarget.value, max)
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

export function onNotesInput(max = 2000) {
  return (e: FormEvent<HTMLTextAreaElement>) => {
    e.currentTarget.value = notesChars(e.currentTarget.value, max)
  }
}

export const phoneInputProps = {
  inputMode: 'numeric' as const,
  autoComplete: 'tel' as const,
  pattern: '\\d{9,12}',
  maxLength: 12,
  minLength: 9,
  title: 'Use 9–12 digits only (e.g. 0714516132)',
  placeholder: '07XXXXXXXX',
}

export const nameInputProps = {
  pattern: "[A-Za-z\\s.'-]{2,100}",
  maxLength: 100,
  minLength: 2,
  title: 'Letters, spaces, apostrophes, and hyphens only',
  autoComplete: 'name' as const,
}

export const idInputProps = {
  pattern: '[A-Za-z0-9]{4,20}',
  maxLength: 20,
  minLength: 4,
  title: 'Letters and numbers only, 4–20 characters',
  autoComplete: 'off' as const,
}

export const licenceInputProps = {
  pattern: '[A-Za-z0-9-]{3,30}',
  maxLength: 30,
  minLength: 3,
  title: 'Letters, numbers, and hyphens only',
  autoComplete: 'off' as const,
}

export const emailInputProps = {
  type: 'email' as const,
  maxLength: 120,
  title: 'Enter a valid email address',
  autoComplete: 'email' as const,
}
