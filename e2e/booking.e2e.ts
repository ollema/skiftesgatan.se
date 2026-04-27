import { test, expect } from './fixtures';
import { today } from '@internationalized/date';
import { TIMEZONE } from '$lib/types/bookings';
import { selectCalendarDate, confirmCancelDialog } from './helpers';

const now = today(TIMEZONE);
const tomorrow = now.add({ days: 1 }).toString();

test.describe('booking flow', () => {
	test('shows calendar and login dialog when not authenticated', async ({ page }) => {
		await page.goto('/tvattstuga');
		await expect(page).toHaveURL('/tvattstuga');
		await expect(page.getByRole('heading', { name: 'Tvättstuga' })).toBeVisible();

		// Clicking a book button should show login dialog
		const bookButtons = page.locator('button[data-slot-status="free"]');
		await selectCalendarDate(page, tomorrow);
		await bookButtons.first().click();
		const loginDialog = page.getByRole('alertdialog');
		await expect(loginDialog).toContainText('Inloggning krävs');
		await loginDialog.getByRole('button', { name: 'Gå tillbaka' }).click();
		await expect(loginDialog).not.toBeVisible();
	});

	test('login, view slots, book, fail double-book, cancel, rebook', async ({ asUser }) => {
		const { page } = await asUser('B');

		await page.goto('/tvattstuga');
		await selectCalendarDate(page, tomorrow);

		const bookButtons = page.locator('button[data-slot-status="free"]');
		const myButtons = page.locator('button[data-slot-status="mine"]');

		// Should see 5 free slots (all available)
		await expect(bookButtons).toHaveCount(5);

		// Book the first available slot
		await bookButtons.first().click();

		// Should now have 1 mine and 4 free
		await expect(myButtons).toHaveCount(1);
		await expect(bookButtons).toHaveCount(4);

		// Try to book another slot — should show replace dialog
		await bookButtons.first().click();
		const replaceDialog = page.getByRole('alertdialog');
		await expect(replaceDialog).toBeVisible();
		await expect(replaceDialog).toContainText('Ersätt din bokning?');

		// Dismiss the replace dialog
		await replaceDialog.getByRole('button', { name: 'Gå tillbaka' }).click();
		await expect(replaceDialog).not.toBeVisible();

		// Still have the original booking
		await expect(myButtons).toHaveCount(1);
		await expect(bookButtons).toHaveCount(4);

		// Replace the booking via the dialog
		await bookButtons.last().click();
		await expect(replaceDialog).toBeVisible();
		await replaceDialog.getByRole('button', { name: 'Ersätt' }).click();

		// Should now have the new booking
		await expect(myButtons).toHaveCount(1);
		await expect(bookButtons).toHaveCount(4);

		// Cancel the existing booking (click mine then confirm)
		await myButtons.first().click();
		await confirmCancelDialog(page);

		// All 5 slots should be available again
		await expect(bookButtons).toHaveCount(5);

		// Book the last slot
		await bookButtons.last().click();

		// Should have 1 mine and 4 free
		await expect(myButtons).toHaveCount(1);
		await expect(bookButtons).toHaveCount(4);
	});

	test('outdoor area booking flow', async ({ asUser }) => {
		const { page } = await asUser('B');

		await page.goto('/uteplats');
		await selectCalendarDate(page, tomorrow);

		const bookButtons = page.locator('button[data-slot-status="free"]');
		const myButtons = page.locator('button[data-slot-status="mine"]');

		// Outdoor has 1 slot (7-22)
		await expect(bookButtons).toHaveCount(1);

		// Book it
		await bookButtons.click();
		await expect(myButtons).toHaveCount(1);
		await expect(bookButtons).toHaveCount(0);

		// Cancel
		await myButtons.click();
		await confirmCancelDialog(page);
		await expect(bookButtons).toHaveCount(1);

		// Rebook
		await bookButtons.click();
		await expect(myButtons).toHaveCount(1);
	});

	test('rejects booking beyond one-month window', async ({ asUser }) => {
		const { page } = await asUser('B');

		await page.goto('/tvattstuga');

		// The calendar enforces max one month via maxValue — verify a day beyond that is disabled
		const tooFar = now.add({ months: 1, days: 1 }).toString();
		const tooFarMonth = now.add({ months: 1, days: 1 }).month;
		const calendar = page.locator('[data-calendar-root]');

		// Navigate forward until we're on the target month or the next button is disabled
		for (let i = 0; i < 3; i++) {
			const heading = await calendar.locator('[data-calendar-heading]').textContent();
			if (!heading) break;
			const headingDate = new Date(heading + ' 1');
			if (headingDate.getMonth() + 1 >= tooFarMonth) break;
			const nextBtn = calendar.locator('[data-calendar-next-button]');
			if ((await nextBtn.getAttribute('data-disabled')) !== null) break;
			await nextBtn.click();
		}

		// The day beyond one month should either not exist on the current page or be disabled
		const dayButton = calendar.locator(`[data-calendar-day][data-value="${tooFar}"]`);
		const count = await dayButton.count();
		if (count > 0) {
			await expect(dayButton).toHaveAttribute('data-disabled', '');
		}
		// If the day doesn't exist at all, the calendar prevented navigation — also valid
	});
});
