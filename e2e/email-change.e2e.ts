import { test, expect } from '@playwright/test';
import { uniqueUser, login, readVerificationUrl } from './helpers';

test.describe('email change flow', () => {
	test('change email, verify via link, confirm new email shown', async ({ page }) => {
		const user = uniqueUser('D');
		await login(page, user);

		// Request email change on account page
		const newEmail = `changed-${user.username.toLowerCase()}@resend.dev`;
		await page.goto('/auth');
		await page.getByLabel('New email').fill(newEmail);
		await page.getByRole('button', { name: 'Change email' }).click();

		// Wait for the form to complete (no error shown)
		await page.waitForLoadState('networkidle');

		// Read verification email sent to the new address and follow the link
		const verifyUrl = readVerificationUrl(newEmail);
		await page.goto(verifyUrl);

		// Verification complete — navigate to account page to confirm
		await page.goto('/auth');
		await expect(page.locator('h1')).toContainText(user.username);
		await expect(page.getByText(newEmail)).toBeVisible();
	});
});
