import { test, expect } from '@playwright/test';
import { today } from '@internationalized/date';
import { TIMEZONE } from '$lib/types/bookings';
import { uniqueUser, login, selectCalendarDate, confirmCancelDialog } from './helpers';

const bookingDate = today(TIMEZONE).add({ days: 4 }).toString();
const cancelDate = today(TIMEZONE).add({ days: 5 }).toString();

// TODO: re-enable once SSE + $derived(await ...) refresh is reliable
test.describe.skip('SSE auto-refresh', () => {
	test('booking by another user auto-refreshes', async ({ browser }) => {
		const context1 = await browser.newContext();
		const context2 = await browser.newContext();
		const page1 = await context1.newPage();
		const page2 = await context2.newPage();

		const user1 = uniqueUser('D');
		const user2 = uniqueUser('D');
		await login(page1, user1);
		await login(page2, user2);

		await page1.goto('/tvattstuga');
		await selectCalendarDate(page1, bookingDate);
		await page2.goto('/tvattstuga');
		await selectCalendarDate(page2, bookingDate);

		await expect(page1.locator('button[data-slot-status="free"]')).toHaveCount(5);
		await expect(page2.locator('button[data-slot-status="free"]')).toHaveCount(5);

		// User 1 books the first slot
		await page1.locator('button[data-slot-status="free"]').first().click();
		await expect(page1.locator('button[data-slot-status="mine"]')).toHaveCount(1);

		// User 2 should see the update via SSE without manual refresh
		await expect(page2.locator('button[data-slot-status="free"]')).toHaveCount(4, {
			timeout: 5000
		});
		await expect(page2.locator('button[data-slot-status="booked"]')).toHaveCount(1);

		await context1.close();
		await context2.close();
	});

	test('cancellation by another user auto-refreshes', async ({ browser }) => {
		const context1 = await browser.newContext();
		const context2 = await browser.newContext();
		const page1 = await context1.newPage();
		const page2 = await context2.newPage();

		const user1 = uniqueUser('D');
		const user2 = uniqueUser('D');
		await login(page1, user1);
		await login(page2, user2);

		await page1.goto('/tvattstuga');
		await selectCalendarDate(page1, cancelDate);

		// User 1 books a slot
		await page1.locator('button[data-slot-status="free"]').first().click();
		await expect(page1.locator('button[data-slot-status="mine"]')).toHaveCount(1);

		// User 2 navigates and sees the booked slot
		await page2.goto('/tvattstuga');
		await selectCalendarDate(page2, cancelDate);
		await expect(page2.locator('button[data-slot-status="booked"]')).toHaveCount(1);

		// User 1 cancels
		await page1.locator('button[data-slot-status="mine"]').click();
		await confirmCancelDialog(page1);
		await expect(page1.locator('button[data-slot-status="mine"]')).toHaveCount(0);

		// User 2 should see the slot become free via SSE
		await expect(page2.locator('button[data-slot-status="free"]')).toHaveCount(5, {
			timeout: 5000
		});

		await context1.close();
		await context2.close();
	});
});
