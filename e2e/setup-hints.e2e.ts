import { test, expect } from '@playwright/test';
import { uniqueUser, login } from './helpers';

test.describe('setup hints', () => {
	test('shows both hints for a fresh user and hides after dismiss', async ({ page }) => {
		const user = uniqueUser('C');
		await login(page, user);

		await page.goto('/tvattstuga');

		// Both hints should be visible
		const notificationHint = page.getByText('e-postaviseringar');
		const calendarHint = page.getByText('Prenumerera på dina bokningar');
		await expect(notificationHint).toBeVisible();
		await expect(calendarHint).toBeVisible();

		// "Visa inte tips" link should be visible
		const dismissAll = page.getByRole('button', { name: 'Visa inte tips' });
		await expect(dismissAll).toBeVisible();

		// Dismiss the notification hint
		const dismissButtons = page.getByRole('button', { name: 'Stäng tips' });
		await dismissButtons.first().click();
		await expect(notificationHint).not.toBeVisible();
		await expect(calendarHint).toBeVisible();

		// Reload — notification hint should stay dismissed (cookie), calendar should still show
		await page.reload();
		await expect(notificationHint).not.toBeVisible();
		await expect(calendarHint).toBeVisible();
	});

	test('dismiss all hides both hints permanently', async ({ page }) => {
		const user = uniqueUser('C');
		await login(page, user);

		await page.goto('/tvattstuga');

		await expect(page.getByText('e-postaviseringar')).toBeVisible();
		await expect(page.getByText('Prenumerera på dina bokningar')).toBeVisible();

		// Click "Visa inte tips"
		await page.getByRole('button', { name: 'Visa inte tips' }).click();

		await expect(page.getByText('e-postaviseringar')).not.toBeVisible();
		await expect(page.getByText('Prenumerera på dina bokningar')).not.toBeVisible();

		// Reload — both should stay hidden
		await page.reload();
		await expect(page.getByText('e-postaviseringar')).not.toBeVisible();
		await expect(page.getByText('Prenumerera på dina bokningar')).not.toBeVisible();
	});

	test('does not show hints for anonymous users', async ({ page }) => {
		await page.goto('/tvattstuga');

		await expect(page.getByText('e-postaviseringar')).not.toBeVisible();
		await expect(page.getByText('Prenumerera på dina bokningar')).not.toBeVisible();
	});

	test('notification hint disappears after enabling notifications', async ({ page }) => {
		const user = uniqueUser('C');
		await login(page, user);

		await page.goto('/tvattstuga');
		await expect(page.getByText('e-postaviseringar')).toBeVisible();

		// Go to /konto and enable a notification
		await page.goto('/konto');
		const checkbox = page.getByLabel('24 timmar före').first();
		await checkbox.check();

		// Go back to booking page — notification hint should be gone
		await page.goto('/tvattstuga');
		await expect(page.getByText('e-postaviseringar')).not.toBeVisible();
		// Calendar hint should still show
		await expect(page.getByText('Prenumerera på dina bokningar')).toBeVisible();
	});

	test('calendar hint disappears after creating calendar link', async ({ page }) => {
		const user = uniqueUser('C');
		await login(page, user);

		await page.goto('/tvattstuga');
		await expect(page.getByText('Prenumerera på dina bokningar')).toBeVisible();

		// Go to /konto and create calendar subscription
		await page.goto('/konto');
		await page.getByRole('button', { name: 'Skapa prenumerationslänk' }).click();

		// Go back to booking page — calendar hint should be gone
		await page.goto('/tvattstuga');
		await expect(page.getByText('Prenumerera på dina bokningar')).not.toBeVisible();
	});

	test('hints also appear on outdoor area page', async ({ page }) => {
		const user = uniqueUser('C');
		await login(page, user);

		await page.goto('/uteplats');
		await expect(page.getByText('e-postaviseringar')).toBeVisible();
		await expect(page.getByText('Prenumerera på dina bokningar')).toBeVisible();
	});
});
