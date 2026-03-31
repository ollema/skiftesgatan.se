import { test, expect } from '@playwright/test';
import { uniqueUser, login } from './helpers';

test.describe('auth flow', () => {
	test('login, access protected page, sign out, login again', async ({ page }) => {
		const user = uniqueUser('A');

		// Visit protected page → should redirect to login
		await page.goto('/konto');
		await expect(page).toHaveURL(/\/login/);

		// Login with pre-seeded account
		await login(page, user);

		// Should be able to access protected page
		await page.goto('/konto');
		await expect(page.locator('h1')).toContainText(user.username);

		// Sign out
		await page.getByRole('button', { name: 'Logga ut' }).click();
		await expect(page).toHaveURL(/\/login/);

		// Login again
		await login(page, user);
		await expect(page).toHaveURL('/konto');
		await expect(page.locator('h1')).toContainText(user.username);
	});

	test('login with wrong password shows error', async ({ page }) => {
		const user = uniqueUser('A');

		await page.goto('/konto/login');
		const loginForm = page.locator('form').nth(0);
		await loginForm.getByLabel('Lägenhet').fill(user.username);
		await loginForm.getByLabel('Lösenord').fill('wrong-password');
		await loginForm.getByRole('button', { name: 'Logga in' }).click();

		await expect(page).toHaveURL(/\/login/);
		await expect(page.locator('.text-error')).toContainText('Invalid');
	});

	test('change password', async ({ page }) => {
		const user = uniqueUser('A');
		await login(page, user);

		// Go to account page
		await page.goto('/konto');
		await expect(page.locator('h1')).toContainText(user.username);

		// Change password
		const newPassword = 'NewPassword456!';
		await page.getByLabel('Nuvarande lösenord').fill(user.password);
		await page.getByLabel('Nytt lösenord').fill(newPassword);
		await page.getByRole('button', { name: 'Byt lösenord' }).click();

		// Sign out
		await page.getByRole('button', { name: 'Logga ut' }).click();
		await expect(page).toHaveURL(/\/login/);

		// Login with new password
		await login(page, { username: user.username, password: newPassword });
		await expect(page).toHaveURL('/konto');
		await expect(page.locator('h1')).toContainText(user.username);
	});
});
