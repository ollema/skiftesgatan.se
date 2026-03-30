import { test, expect } from '@playwright/test';
import { uniqueUser, registerAndVerify, login, readResetPasswordUrl } from './helpers';

test.describe('password reset flow', () => {
	test('request reset, use link, login with new password', async ({ page }) => {
		const user = uniqueUser('D');
		await registerAndVerify(page, user);

		// Sign out
		await page.goto('/auth');
		await page.getByRole('button', { name: 'Sign out' }).click();

		// Go to forgot password page
		await page.goto('/auth/forgot-password');
		await page.getByLabel('Email').fill(user.email);
		await page.getByRole('button', { name: 'Send reset link' }).click();

		// Should land on sent confirmation page
		await expect(page).toHaveURL('/auth/forgot-password/sent');
		await expect(page.getByText('Check your email')).toBeVisible();

		// Read the reset URL from the file written by the server
		const resetUrl = readResetPasswordUrl(user.email);
		await page.goto(resetUrl);

		// Should see the reset password form
		await expect(page.getByText('Reset your password')).toBeVisible();

		// Set new password
		const newPassword = 'ResetPassword789!';
		await page.getByLabel('New password').fill(newPassword);
		await page.getByRole('button', { name: 'Reset password' }).click();

		// Should redirect to login
		await expect(page).toHaveURL(/\/login/);

		// Login with new password
		await login(page, { username: user.username, password: newPassword });
		await expect(page).toHaveURL('/auth');
		await expect(page.locator('h1')).toContainText(user.username);
	});
});
