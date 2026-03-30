import { test, expect } from '@playwright/test';

const TEST_USER = {
	username: `B${1000 + (Date.now() % 9000)}`,
	password: 'TestPassword123!',
	email: `test-booking-${Date.now()}@resend.dev`
};

const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

async function registerAndVerify(page: import('@playwright/test').Page) {
	await page.goto('/auth/login');
	const signupForm = page.locator('form').nth(1);
	await signupForm.getByLabel('Apartment').fill(TEST_USER.username);
	await signupForm.getByLabel('Email').fill(TEST_USER.email);
	await signupForm.getByLabel('Password').fill(TEST_USER.password);
	await signupForm.getByRole('button', { name: 'Register' }).click();
	await expect(page).toHaveURL('/auth/verify-email');

	// Verify the user (test-only endpoint)
	const response = await page.request.post('/api/test/verify-user', {
		data: { username: TEST_USER.username }
	});
	expect(response.ok()).toBe(true);

	// Login
	await page.goto('/auth/login');
	const loginForm = page.locator('form').nth(0);
	await loginForm.getByLabel('Apartment').fill(TEST_USER.username);
	await loginForm.getByLabel('Password').fill(TEST_USER.password);
	await loginForm.getByRole('button', { name: 'Login' }).click();
	await expect(page).toHaveURL('/auth');
}

test.describe('booking flow', () => {
	test('redirects to login when not authenticated', async ({ page }) => {
		await page.goto('/laundry');
		await expect(page).toHaveURL(/\/auth\/login/);
	});

	test('register, view slots, book, fail double-book, cancel, rebook', async ({ page }) => {
		// Register and verify a new user
		await registerAndVerify(page);

		// Navigate to laundry page and set date
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
});
