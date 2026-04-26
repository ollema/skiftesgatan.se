import { test, expect } from '@playwright/test';
import { today } from '@internationalized/date';
import { TIMEZONE } from '$lib/types/bookings';
import { uniqueUser, login, selectCalendarDate } from './helpers';

// Use 3 days out to avoid collisions with other test files that book on "tomorrow"
const testDate = today(TIMEZONE).add({ days: 3 }).toString();

test.describe('concurrent booking', () => {
	test('two users competing for the same slot', async ({ browser }) => {
		const context1 = await browser.newContext();
		const context2 = await browser.newContext();
		const page1 = await context1.newPage();
		const page2 = await context2.newPage();

		// Login both users with pre-seeded accounts
		const user1 = uniqueUser('C');
		const user2 = uniqueUser('C');
		await login(page1, user1);
		await login(page2, user2);

		// Both navigate to laundry and set date
		await page1.goto('/tvattstuga');
		await selectCalendarDate(page1, testDate);
		await expect(page1.locator('button[data-slot-status="free"]')).toHaveCount(5);

		await page2.goto('/tvattstuga');
		await selectCalendarDate(page2, testDate);
		await expect(page2.locator('button[data-slot-status="free"]')).toHaveCount(5);

		// User1 books the first slot
		await page1.locator('button[data-slot-status="free"]').first().click();
		await expect(page1.locator('button[data-slot-status="mine"]')).toHaveCount(1);

		// User2 refreshes and sees the booked slot
		await page2.reload();
		await selectCalendarDate(page2, testDate);
		await expect(page2.locator('button[data-slot-status="free"]')).toHaveCount(4);
		await expect(page2.locator('button[data-slot-status="booked"]')).toHaveCount(1);

		// User2 can still book a different slot without conflict
		await page2.locator('button[data-slot-status="free"]').first().click();
		await expect(page2.locator('button[data-slot-status="mine"]')).toHaveCount(1);

		await context1.close();
		await context2.close();
	});
});
