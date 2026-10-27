import { test, expect } from './fixtures';
import { today } from '@internationalized/date';
import { TIMEZONE } from '#lib/types/bookings.js';
import { selectCalendarDate } from './helpers';

const start = today(TIMEZONE);
// Far enough from the dates other booking tests use, so a failed cleanup
// cannot block their Slots, while still inside the one-month Booking Window.
const target = start.add({ days: 20 }).toString();

async function showCalendarMonth(page: import('@playwright/test').Page, isoDate: string) {
	const [, month] = isoDate.split('-').map(Number);
	const calendar = page.locator('[data-calendar-root]');

	for (let i = 0; i < 12; i++) {
		const heading = await calendar.locator('[data-calendar-heading]').textContent();
		if (!heading) break;
		const headingDate = new Date(heading + ' 1');
		if (headingDate.getMonth() + 1 === month) break;
		if (headingDate.getMonth() + 1 < month) {
			const btn = calendar.locator('[data-calendar-next-button]');
			if ((await btn.getAttribute('data-disabled')) !== null) break;
			await btn.click();
		} else {
			const btn = calendar.locator('[data-calendar-prev-button]');
			if ((await btn.getAttribute('data-disabled')) !== null) break;
			await btn.click();
		}
	}
}

test.describe('maintenance closures', () => {
	test('non-admin cannot reach the maintenance page', async ({ asUser }) => {
		const { page } = await asUser('D');

		await page.goto('/admin/maintenance');
		await expect(page).toHaveURL('/konto');
	});

	test('admin closes a day, cancels its booking, and reopens it', async ({ asUser, asAdmin }) => {
		const { user: resident, page: residentPage } = await asUser('B');

		await residentPage.goto('/tvattstuga');
		await selectCalendarDate(residentPage, target);
		await residentPage.locator('button[data-slot-status="free"]').first().click();
		await expect(residentPage.locator('button[data-slot-status="mine"]')).toHaveCount(1);

		const { page: adminPage } = await asAdmin();
		await adminPage.goto('/admin/maintenance');
		await expect(adminPage.locator('h1')).toContainText('Stängda dagar');

		// Keep the closure laundry-only so the admin list has a single row.
		await adminPage.getByLabel('Uteplats').uncheck();
		await adminPage.getByLabel('Från').fill(target);
		await adminPage.getByLabel('Till').fill(target);
		await adminPage.getByLabel('Orsak (valfritt)').fill('Underhåll av tvättmaskinerna');
		await adminPage.getByRole('button', { name: 'Stäng av dagar' }).click();

		const dialog = adminPage.getByRole('alertdialog');
		await expect(dialog).toContainText('1 bokning avbokas');
		await expect(dialog).toContainText(resident.username);
		await dialog.getByRole('button', { name: 'Stäng av' }).click();

		await expect(adminPage.getByText('Dagarna är stängda. 1 bokning avbokades.')).toBeVisible();
		await expect(adminPage.getByText('1 bokning avbokades').first()).toBeVisible();
		await expect(
			adminPage.getByText('Underhåll av tvättmaskinerna', { exact: false })
		).toBeVisible();

		// The resident's Booking is gone and the closed day cannot be selected.
		await residentPage.goto('/tvattstuga');
		await expect(residentPage.getByText('Du har inte bokat någon tvättid')).toBeVisible();
		await showCalendarMonth(residentPage, target);
		await expect(
			residentPage.locator(`[data-calendar-day][data-value="${target}"]`)
		).toHaveAttribute('data-disabled', '');

		// Removing the closure reopens the day.
		await adminPage.getByRole('button', { name: 'Ta bort' }).click();
		await adminPage.getByRole('alertdialog').getByRole('button', { name: 'Ta bort' }).click();
		await expect(adminPage.getByText('Inga kommande stängningar.')).toBeVisible();

		await residentPage.goto('/tvattstuga');
		await selectCalendarDate(residentPage, target);
		await expect(residentPage.locator('button[data-slot-status="free"]')).toHaveCount(5);
	});
});
