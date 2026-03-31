import { test, expect } from '@playwright/test';

test.describe('navigation', () => {
	test('navbar links work', async ({ page }) => {
		await page.goto('/');
		const nav = page.locator('nav');
		await expect(nav).toBeVisible();

		// Navigate to laundry (accessible without auth)
		await nav.getByRole('link', { name: 'Tvättstuga' }).click();
		await expect(page).toHaveURL('/tvattstuga');

		// Navigate to outdoor (accessible without auth)
		await page.goto('/');
		await nav.getByRole('link', { name: 'Uteplats' }).click();
		await expect(page).toHaveURL('/uteplats');

		// Navigate to account (redirects to login since not authenticated)
		await page.goto('/');
		await nav.getByRole('link', { name: 'Konto' }).click();
		await expect(page).toHaveURL(/\/konto\/login/);

		// Site title links back to home
		await page.getByRole('link', { name: 'Skiftesgatan' }).click();
		await expect(page).toHaveURL('/');
	});
});
