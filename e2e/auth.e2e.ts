import { test, expect } from '@playwright/test';

const TEST_USER = {
	username: `A${1000 + (Date.now() % 9000)}`,
	password: 'TestPassword123!'
};

test.describe('auth flow', () => {
	test('register, access protected page, sign out, login again', async ({ page }) => {
		// Visit protected page → should redirect to login
		await page.goto('/auth');
		await expect(page).toHaveURL(/\/login/);

		// Register a new user (second form on the page)
		const signupForm = page.locator('form').nth(1);
		await signupForm.getByLabel('Apartment').fill(TEST_USER.username);
		await signupForm.getByLabel('Password').fill(TEST_USER.password);
		await signupForm.getByRole('button', { name: 'Register' }).click();

		// Should redirect to protected page, showing user name
		await expect(page).toHaveURL('/auth');
		await expect(page.locator('h1')).toContainText(TEST_USER.username);

		// Sign out
		await page.getByRole('button', { name: 'Sign out' }).click();
		await expect(page).toHaveURL(/\/login/);

		// Login with same credentials (first form on the page)
		const loginForm = page.locator('form').nth(0);
		await loginForm.getByLabel('Apartment').fill(TEST_USER.username);
		await loginForm.getByLabel('Password').fill(TEST_USER.password);
		await loginForm.getByRole('button', { name: 'Login' }).click();

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
