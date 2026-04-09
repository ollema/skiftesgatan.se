import { test, expect } from '@playwright/test';
import { uniqueUser, login } from './helpers';

test.describe('notification preferences', () => {
	test('toggle switches update and persist across reload', async ({ page }) => {
		const user = uniqueUser('D');
		await login(page, user);

		await page.goto('/konto');
		await expect(page.locator('h1')).toContainText('Mitt konto');

		// Find the first switch (laundry 24h) — all start unchecked
		const laundry24h = page
			.locator('fieldset')
			.filter({ hasText: 'Tvättstuga' })
			.getByRole('switch')
			.first();

		await expect(laundry24h).toHaveAttribute('data-state', 'unchecked');

		// Toggle it on
		await laundry24h.click();
		await expect(laundry24h).toHaveAttribute('data-state', 'checked');

		// Reload and verify it persisted
		await page.reload();
		await expect(page.locator('h1')).toContainText('Mitt konto');

		const laundry24hAfterReload = page
			.locator('fieldset')
			.filter({ hasText: 'Tvättstuga' })
			.getByRole('switch')
			.first();

		await expect(laundry24hAfterReload).toHaveAttribute('data-state', 'checked');

		// Toggle it back off
		await laundry24hAfterReload.click();
		await expect(laundry24hAfterReload).toHaveAttribute('data-state', 'unchecked');

		// Reload and verify it persisted as off
		await page.reload();
		await expect(page.locator('h1')).toContainText('Mitt konto');

		const laundry24hFinal = page
			.locator('fieldset')
			.filter({ hasText: 'Tvättstuga' })
			.getByRole('switch')
			.first();

		await expect(laundry24hFinal).toHaveAttribute('data-state', 'unchecked');
	});
});
