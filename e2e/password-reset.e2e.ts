import { test, expect } from '@playwright/test';
import { uniqueUser, login, readResetPasswordUrl } from './helpers';

test.describe('password reset flow', () => {
	test('request reset, use link, login with new password', async ({ page }) => {
		const user = uniqueUser('D');
		await login(page, user);

		// Sign out
		await page.goto('/konto');
		await page.getByRole('button', { name: 'Logga ut' }).click();

		// Go to forgot password page
		await page.goto('/konto/forgot-password');
		await page.getByLabel('Lägenhet').fill(user.username);
		await page.getByRole('button', { name: 'Skicka återställningslänk' }).click();

		// Should land on sent confirmation page
		await expect(page).toHaveURL('/konto/forgot-password/sent');
		await expect(page.getByText('Kolla din e-post')).toBeVisible();

		// Read the reset URL from the file written by the server
		const resetUrl = readResetPasswordUrl(user.email);
		await page.goto(resetUrl);

		// Should see the reset password form
		await expect(page.getByText('Återställ ditt lösenord')).toBeVisible();

		// Set new password
		const newPassword = 'ResetPassword789!';
		await page.getByLabel('Nytt lösenord').fill(newPassword);
		await page.getByRole('button', { name: 'Återställ lösenord' }).click();

		// Should redirect to login
		await expect(page).toHaveURL(/\/login/);

		// Login with new password
		await login(page, { username: user.username, password: newPassword });
		await expect(page).toHaveURL('/konto');
		await expect(page.locator('h1')).toContainText('Mitt konto');
	});
});
