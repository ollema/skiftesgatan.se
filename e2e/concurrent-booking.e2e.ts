import { test, expect } from '@playwright/test';
import { uniqueUser, login, selectCalendarDate } from './helpers';

// Use 3 days out to avoid collisions with other test files that book on "tomorrow"
const testDate = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10);

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
		await page1.goto('/laundry');
		await selectCalendarDate(page1, testDate);
		await expect(page1.locator('button[data-slot-status="free"]')).toHaveCount(5);

		await page2.goto('/laundry');
		await selectCalendarDate(page2, testDate);
		await expect(page2.locator('button[data-slot-status="free"]')).toHaveCount(5);

		// User1 books the first slot
		await page1.locator('button[data-slot-status="free"]').first().click();
		await expect(page1.locator('button[data-slot-status="mine"]')).toHaveCount(1);

		// User2 tries to book the same slot (stale page still shows it as available)
		await page2.locator('button[data-slot-status="free"]').first().click();
		// The server should reject with a conflict error — the booking-error element should be visible
		await expect(page2.getByTestId('booking-error')).toBeVisible();

		await context1.close();
		await context2.close();
	});
});
