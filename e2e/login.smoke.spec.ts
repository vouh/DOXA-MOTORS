import { test, expect } from '@playwright/test'

test('admin login page loads', async ({ page }) => {
  await page.goto('/admin/login')
  await expect(page.getByRole('heading', { name: /sign in|login|doxa/i }).or(page.locator('form'))).toBeVisible({
    timeout: 30_000,
  })
})
