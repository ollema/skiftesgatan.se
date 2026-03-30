import { test, expect } from '@playwright/test';

const TEST_USER = {
	username: `A${1000 + (Date.now() % 9000)}`,
	password: 'TestPassword123!',
	email: `test-${Date.now()}@resend.dev`
};

async function verifyUser(page: import('@playwright/test').Page, username: string) {
	const response = await page.request.post('/api/test/verify-user', {
		data: { username }
	});
	expect(response.ok()).toBe(true);
}

test.describe('auth flow', () => {
	test('register, verify, access protected page, sign out, login again', async ({ page }) => {
		// Visit protected page → should redirect to login
		await page.goto('/auth');
		await expect(page).toHaveURL(/\/login/);

		// Register a new user (second form on the page)
		const signupForm = page.locator('form').nth(1);
		await signupForm.getByLabel('Apartment').fill(TEST_USER.username);
		await signupForm.getByLabel('Email').fill(TEST_USER.email);
		await signupForm.getByLabel('Password').fill(TEST_USER.password);
		await signupForm.getByRole('button', { name: 'Register' }).click();

		// Should redirect to verify-email page
		await expect(page).toHaveURL('/auth/verify-email');

		// Verify the user via the verification token (dev-only endpoint)
		await verifyUser(page, TEST_USER.username);

		// Login with same credentials
		await page.goto('/auth/login');
		const loginForm = page.locator('form').nth(0);
		await loginForm.getByLabel('Apartment').fill(TEST_USER.username);
		await loginForm.getByLabel('Password').fill(TEST_USER.password);
		await loginForm.getByRole('button', { name: 'Login' }).click();

		// Should be on protected page
		await expect(page).toHaveURL('/auth');
		await expect(page.locator('h1')).toContainText(TEST_USER.username);

		// Sign out
		await page.getByRole('button', { name: 'Sign out' }).click();
		await expect(page).toHaveURL(/\/login/);

		// Login again
		const loginForm2 = page.locator('form').nth(0);
		await loginForm2.getByLabel('Apartment').fill(TEST_USER.username);
		await loginForm2.getByLabel('Password').fill(TEST_USER.password);
		await loginForm2.getByRole('button', { name: 'Login' }).click();

		// Should be back on protected page
		await expect(page).toHaveURL('/auth');
		await expect(page.locator('h1')).toContainText(TEST_USER.username);
	});

	test('login with wrong password shows error', async ({ page }) => {
		await page.goto('/auth/login');
		const loginForm = page.locator('form').nth(0);
		await loginForm.getByLabel('Apartment').fill(TEST_USER.username);
		await loginForm.getByLabel('Password').fill('wrong-password');
		await loginForm.getByRole('button', { name: 'Login' }).click();

		// Should stay on login page with error message
		await expect(page).toHaveURL(/\/login/);
		await expect(page.locator('.text-red-500')).not.toBeEmpty();
	});
});
