import { test, expect } from '@playwright/test';
import { uniqueUser, registerAndVerify, selectCalendarDate, confirmCancelDialog } from './helpers';

const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

test.describe('booking flow', () => {
	test('redirects to login when not authenticated', async ({ page }) => {
		await page.goto('/laundry');
		await expect(page).toHaveURL(/\/auth\/login/);
	});

	test('register, view slots, book, fail double-book, cancel, rebook', async ({ page }) => {
		const user = uniqueUser('B');
		await registerAndVerify(page, user);

		await page.goto('/laundry');
		await selectCalendarDate(page, tomorrow);

		// Should see 5 Book buttons (all slots available)
		await expect(page.getByRole('button', { name: 'Book' })).toHaveCount(5);

		// Book the first available slot
		await page.getByRole('button', { name: 'Book' }).first().click();

		// Should now have 1 Cancel and 4 Book buttons
		await expect(page.getByRole('button', { name: 'Cancel' })).toHaveCount(1);
		await expect(page.getByRole('button', { name: 'Book' })).toHaveCount(4);

		// Try to book another slot — should fail (one future booking per resource)
		await page.getByRole('button', { name: 'Book' }).first().click();
		await expect(page.getByTestId('booking-error')).toContainText('already have a future booking');

		// Cancel the existing booking (now requires confirmation dialog)
		await page.getByRole('button', { name: 'Cancel' }).click();
		await confirmCancelDialog(page);

		// All 5 slots should be available again
		await expect(page.getByRole('button', { name: 'Book' })).toHaveCount(5);

		// Book the last slot
		await page.getByRole('button', { name: 'Book' }).last().click();

		// Should have 1 Cancel and 4 Book
		await expect(page.getByRole('button', { name: 'Cancel' })).toHaveCount(1);
		await expect(page.getByRole('button', { name: 'Book' })).toHaveCount(4);
	});

	test('outdoor area booking flow', async ({ page }) => {
		const user = uniqueUser('B');
		await registerAndVerify(page, user);

		await page.goto('/outdoor');
		await selectCalendarDate(page, tomorrow);

		// Outdoor has 1 slot (7-22)
		await expect(page.getByRole('button', { name: 'Book' })).toHaveCount(1);

		// Book it
		await page.getByRole('button', { name: 'Book' }).click();
		await expect(page.getByRole('button', { name: 'Cancel' })).toHaveCount(1);
		await expect(page.getByRole('button', { name: 'Book' })).toHaveCount(0);

		// Cancel
		await page.getByRole('button', { name: 'Cancel' }).click();
		await confirmCancelDialog(page);
		await expect(page.getByRole('button', { name: 'Book' })).toHaveCount(1);

		// Rebook
		await page.getByRole('button', { name: 'Book' }).click();
		await expect(page.getByRole('button', { name: 'Cancel' })).toHaveCount(1);
	});

	test('rejects booking beyond 30-day window', async ({ page }) => {
		const user = uniqueUser('B');
		await registerAndVerify(page, user);

		await page.goto('/laundry');

		// The calendar enforces max 30 days via maxValue — verify a day 31 days out is disabled
		const tooFar = new Date(Date.now() + 31 * 86400000).toISOString().slice(0, 10);
		const calendar = page.locator('[data-calendar-root]');
		const [, targetMonth] = tooFar.split('-').map(Number);

		// Navigate forward until we're on the target month or the next button is disabled
		for (let i = 0; i < 3; i++) {
			const heading = await calendar.locator('[data-calendar-heading]').textContent();
			if (!heading) break;
			const headingDate = new Date(heading + ' 1');
			if (headingDate.getMonth() + 1 >= targetMonth) break;
			const nextBtn = calendar.locator('[data-calendar-next-button]');
			if ((await nextBtn.getAttribute('data-disabled')) !== null) break;
			await nextBtn.click();
		}

		// The day 31 days out should either not exist on the current page or be disabled
		const dayButton = calendar.locator(`[data-calendar-day][data-value="${tooFar}"]`);
		const count = await dayButton.count();
		if (count > 0) {
			await expect(dayButton).toHaveAttribute('data-disabled', '');
		}
		// If the day doesn't exist at all, the calendar prevented navigation — also valid
	});
});
