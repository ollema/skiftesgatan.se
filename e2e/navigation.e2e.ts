import { test, expect } from '@playwright/test';

test.describe('navigation', () => {
	test('navbar links work', async ({ page }) => {
		await page.goto('/');
		const nav = page.locator('nav');
		await expect(nav).toBeVisible();

		// Navigate to laundry (accessible without auth)
		await nav.getByRole('link', { name: 'Laundry' }).click();
		await expect(page).toHaveURL('/laundry');

		// Navigate to outdoor (accessible without auth)
		await page.goto('/');
		await nav.getByRole('link', { name: 'Outdoor' }).click();
		await expect(page).toHaveURL('/outdoor');

		// Navigate to account (redirects to login since not authenticated)
		await page.goto('/');
		await nav.getByRole('link', { name: 'Account' }).click();
		await expect(page).toHaveURL(/\/auth\/login/);

		// Site title links back to home
		await page.getByRole('link', { name: 'Skiftesgatan' }).click();
		await expect(page).toHaveURL('/');
	});
});
