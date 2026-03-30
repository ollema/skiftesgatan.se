import { test, expect } from '@playwright/test';

test.describe('navigation', () => {
	test('navbar links work', async ({ page }) => {
		await page.goto('/');
		await expect(page.locator('nav')).toBeVisible();

		// Navigate to laundry (redirects to login since not authenticated)
		await page.getByRole('link', { name: 'Laundry' }).click();
		await expect(page).toHaveURL(/\/auth\/login/);

		// Navigate to outdoor (also redirects)
		await page.goto('/');
		await page.getByRole('link', { name: 'Outdoor' }).click();
		await expect(page).toHaveURL(/\/auth\/login/);

		// Navigate to account (also redirects)
		await page.goto('/');
		await page.getByRole('link', { name: 'Account' }).click();
		await expect(page).toHaveURL(/\/auth\/login/);

		// Site title links back to home
		await page.getByRole('link', { name: 'Skiftesgatan' }).click();
		await expect(page).toHaveURL('/');
	});
});
