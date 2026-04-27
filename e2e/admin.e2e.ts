import { test, expect } from '@playwright/test';
import { uniqueUser, login, adminUser, readResetPasswordUrl } from './helpers';

test.describe('admin', () => {
	test('non-admin visiting /admin is redirected to /konto', async ({ page }) => {
		const user = uniqueUser('D');
		await login(page, user);

		await page.goto('/admin');
		await expect(page).toHaveURL('/konto');
	});

	test('admin sees the user list', async ({ page }) => {
		await login(page, adminUser());

		await page.goto('/admin');
		await expect(page.locator('h1')).toContainText('Lägenheter');

		// Spot-check: own row plus another known apartment.
		await expect(page.getByRole('cell', { name: 'B1001', exact: true })).toBeVisible();
		await expect(page.getByRole('cell', { name: 'A1001', exact: true })).toBeVisible();
	});

	test('admin edits another user’s display name', async ({ page }) => {
		const target = uniqueUser('D');
		await login(page, adminUser());

		await page.goto(`/admin/${target.username}`);
		await expect(page.locator('h1')).toContainText(target.username);

		// First "Ändra" is the Visningsnamn row.
		await page.getByRole('button', { name: 'Ändra' }).first().click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();

		const newName = `Admin Renamed ${target.username}`;
		await dialog.getByLabel('Nytt visningsnamn').fill(newName);
		await dialog.getByRole('button', { name: 'Spara' }).click();

		await expect(page.locator('h1')).toContainText(newName);

		// And the list view reflects it.
		await page.goto('/admin');
		await expect(page.getByRole('cell', { name: newName })).toBeVisible();
	});

	test('admin sends a password reset email', async ({ page }) => {
		const target = uniqueUser('D');
		await login(page, adminUser());

		await page.goto(`/admin/${target.username}`);
		await page.getByRole('button', { name: 'Skicka återställningsmejl' }).click();

		// Wait for the toast so the command has finished server-side.
		await expect(page.getByText(/Återställningsmejl skickat/)).toBeVisible();

		// Server writes the reset link to .test-emails/ — same path as the public flow.
		const resetUrl = readResetPasswordUrl(target.email);
		expect(resetUrl).toMatch(/\/api\/auth\/reset-password\//);
	});

	test('admin toggles notification preference for another user', async ({ page }) => {
		const target = uniqueUser('D');
		await login(page, adminUser());

		await page.goto(`/admin/${target.username}`);
		const adminSwitch = page
			.locator('fieldset')
			.filter({ hasText: 'Tvättstuga' })
			.getByRole('switch')
			.first();

		await expect(adminSwitch).toHaveAttribute('data-state', 'unchecked');
		await adminSwitch.click();
		await expect(adminSwitch).toHaveAttribute('data-state', 'checked');

		// Sign admin out, login as target, confirm the toggle is reflected.
		await page.goto('/konto');
		await page.getByRole('button', { name: 'Logga ut' }).click();
		await login(page, target);

		await page.goto('/konto');
		const userSwitch = page
			.locator('fieldset')
			.filter({ hasText: 'Tvättstuga' })
			.getByRole('switch')
			.first();
		await expect(userSwitch).toHaveAttribute('data-state', 'checked');
	});

	test('admin cannot change their own role', async ({ page }) => {
		const admin = adminUser();
		await login(page, admin);

		await page.goto(`/admin/${admin.username}`);
		await expect(page.locator('h1')).toContainText(admin.username);

		// Two "Ändra" buttons (Visningsnamn, E-post). The Roll row has no edit button when isSelf.
		await expect(page.getByRole('button', { name: 'Ändra' })).toHaveCount(2);
		await expect(page.getByText('Du kan inte ändra din egen roll.')).toBeVisible();
	});

	test('admin list shows Senast aktiv column with login timestamp', async ({ page }) => {
		const admin = adminUser();
		await login(page, admin);

		await page.goto('/admin');

		// Header is present.
		await expect(page.getByRole('columnheader', { name: 'Senast aktiv' })).toBeVisible();

		// The admin's own row should have a populated cell because login bumped the timestamp.
		// Column order: Lägenhet, Namn, E-post, Senast aktiv, Status, action.
		const adminRow = page.getByRole('row').filter({ hasText: admin.username });
		const lastActiveCell = adminRow.locator('td').nth(3);
		await expect(lastActiveCell).toBeVisible();
		await expect(lastActiveCell).not.toHaveText('—');
		// Sanity: looks like a sv-SE short-month date-time, e.g. "27 apr. 2026, 14:32".
		await expect(lastActiveCell).toHaveText(/\d{1,2} \w{3,5}\.? \d{4},? \d{2}:\d{2}/);
	});
});
