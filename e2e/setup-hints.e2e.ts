import { test, expect } from './fixtures';

test.describe('setup hints', () => {
	test('shows both hints for a fresh user and hides after dismiss', async ({ asUser }) => {
		const { page } = await asUser('C');

		await page.goto('/tvattstuga');

		const notificationHint = page.getByText('e-postaviseringar');
		const calendarHint = page.getByText('Prenumerera på dina bokningar');
		await expect(notificationHint).toBeVisible();
		await expect(calendarHint).toBeVisible();

		const dismissAll = page.getByRole('button', { name: 'Visa inte tips' });
		await expect(dismissAll).toBeVisible();

		const dismissButtons = page.getByRole('button', { name: 'Stäng tips' });
		await dismissButtons.first().click();
		await expect(notificationHint).not.toBeVisible();
		await expect(calendarHint).toBeVisible();

		await page.reload();
		await expect(notificationHint).not.toBeVisible();
		await expect(calendarHint).toBeVisible();
	});

	test('dismiss all hides both hints permanently', async ({ asUser }) => {
		const { page } = await asUser('C');

		await page.goto('/tvattstuga');

		await expect(page.getByText('e-postaviseringar')).toBeVisible();
		await expect(page.getByText('Prenumerera på dina bokningar')).toBeVisible();

		await page.getByRole('button', { name: 'Visa inte tips' }).click();

		await expect(page.getByText('e-postaviseringar')).not.toBeVisible();
		await expect(page.getByText('Prenumerera på dina bokningar')).not.toBeVisible();

		await page.reload();
		await expect(page.getByText('e-postaviseringar')).not.toBeVisible();
		await expect(page.getByText('Prenumerera på dina bokningar')).not.toBeVisible();
	});

	test('does not show hints for anonymous users', async ({ page }) => {
		await page.goto('/tvattstuga');

		await expect(page.getByText('e-postaviseringar')).not.toBeVisible();
		await expect(page.getByText('Prenumerera på dina bokningar')).not.toBeVisible();
	});

	test('notification hint disappears after enabling notifications', async ({ asUser }) => {
		const { page } = await asUser('C');

		await page.goto('/tvattstuga');
		await expect(page.getByText('e-postaviseringar')).toBeVisible();

		await page.goto('/konto');
		const checkbox = page.getByLabel('1 dygn innan').first();
		await checkbox.check();

		await page.goto('/tvattstuga');
		await expect(page.getByText('e-postaviseringar')).not.toBeVisible();
		await expect(page.getByText('Prenumerera på dina bokningar')).toBeVisible();
	});

	test('calendar hint disappears after creating calendar link', async ({ asUser }) => {
		const { page } = await asUser('C');

		await page.goto('/tvattstuga');
		await expect(page.getByText('Prenumerera på dina bokningar')).toBeVisible();

		await page.goto('/konto');
		await page.getByRole('button', { name: 'Skapa prenumerationslänk' }).click();

		await page.goto('/tvattstuga');
		await expect(page.getByText('Prenumerera på dina bokningar')).not.toBeVisible();
	});

	test('calendar hint reappears after deleting calendar link', async ({ asUser }) => {
		const { page } = await asUser('C');

		await page.goto('/konto');
		await page.getByRole('button', { name: 'Skapa prenumerationslänk' }).click();

		await page.goto('/tvattstuga');
		await expect(page.getByText('Prenumerera på dina bokningar')).not.toBeVisible();

		await page.goto('/konto');
		await page.getByRole('button', { name: 'Ta bort prenumeration' }).click();
		await page.getByRole('alertdialog').getByRole('button', { name: 'Ta bort' }).click();

		await expect(page.getByRole('button', { name: 'Skapa prenumerationslänk' })).toBeVisible();

		await page.goto('/tvattstuga');
		await expect(page.getByText('Prenumerera på dina bokningar')).toBeVisible();
	});

	test('hints also appear on outdoor area page', async ({ asUser }) => {
		const { page } = await asUser('C');

		await page.goto('/uteplats');
		await expect(page.getByText('e-postaviseringar')).toBeVisible();
		await expect(page.getByText('Prenumerera på dina bokningar')).toBeVisible();
	});
});
