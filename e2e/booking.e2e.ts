import { test, expect } from '@playwright/test';
import { uniqueUser, registerAndVerify } from './helpers';

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
		await page.getByTestId('date-input').fill(tomorrow);

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

		// Cancel the existing booking
		await page.getByRole('button', { name: 'Cancel' }).click();

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
		await page.getByTestId('date-input').fill(tomorrow);

		// Outdoor has 1 slot (7-22)
		await expect(page.getByRole('button', { name: 'Book' })).toHaveCount(1);

		// Book it
		await page.getByRole('button', { name: 'Book' }).click();
		await expect(page.getByRole('button', { name: 'Cancel' })).toHaveCount(1);
		await expect(page.getByRole('button', { name: 'Book' })).toHaveCount(0);

		// Cancel
		await page.getByRole('button', { name: 'Cancel' }).click();
		await expect(page.getByRole('button', { name: 'Book' })).toHaveCount(1);

		// Rebook
		await page.getByRole('button', { name: 'Book' }).click();
		await expect(page.getByRole('button', { name: 'Cancel' })).toHaveCount(1);
	});

	test('rejects booking beyond 30-day window', async ({ page }) => {
		const user = uniqueUser('B');
		await registerAndVerify(page, user);

		await page.goto('/laundry');

		// Set date to 31 days from now
		const tooFar = new Date(Date.now() + 31 * 86400000).toISOString().slice(0, 10);
		await page.getByTestId('date-input').fill(tooFar);

		// Should show an error in the slots area
		await expect(page.getByText(/30 days|Error loading/)).toBeVisible();
	});
});
