import { test, expect } from '@playwright/test';
import { uniqueUser, login, readVerificationUrl } from './helpers';

test.describe('email change flow', () => {
	test('change email, verify via link, confirm new email shown', async ({ page }) => {
		const user = uniqueUser('D');
		await login(page, user);

		// Request email change on account page
		const newEmail = `delivered+changed-${user.username}@resend.dev`;
		await page.goto('/konto');

		// Open the email edit dialog (second "Ändra" button)
		await page.getByRole('button', { name: 'Ändra' }).nth(1).click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();

		await dialog.getByLabel('Ny e-post').fill(newEmail);
		await dialog.getByRole('button', { name: 'Spara' }).click();

		// Wait for the form to complete (no error shown)
		await page.waitForLoadState('networkidle');

		// Read verification email sent to the new address and follow the link
		const verifyUrl = readVerificationUrl(newEmail);
		await page.goto(verifyUrl);

		// Verification complete — navigate to account page to confirm
		await page.goto('/konto');
		await expect(page.locator('h1')).toContainText('Hej,');
		await expect(page.getByText(newEmail)).toBeVisible();
	});
});
