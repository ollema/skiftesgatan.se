import { test, expect } from './fixtures';
import { readVerificationUrl } from './helpers';

test.describe('email change flow', () => {
	test('change email, verify via link, confirm new email shown', async ({ asUser }, workerInfo) => {
		const { user, page } = await asUser('D');

		// `.test-emails/` is shared across workers; key the new email by
		// `parallelIndex` so concurrent workers don't overwrite each other's
		// verification email file.
		const newEmail = `delivered+changed-w${workerInfo.parallelIndex}-${user.username}@resend.dev`;
		await page.goto('/konto');

		// Open the email edit dialog (second "Ändra" button)
		await page.getByRole('button', { name: 'Ändra' }).nth(1).click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();

		await dialog.getByLabel('Ny e-post').fill(newEmail);
		await dialog.getByRole('button', { name: 'Spara' }).click();

		// Dialog closes only after the form action returns successfully —
		// gates the email file read on the verification email actually
		// being written.
		await expect(dialog).not.toBeVisible();

		// Read verification email sent to the new address and follow the link
		const verifyUrl = readVerificationUrl(newEmail);
		await page.goto(verifyUrl);

		// Verification complete — navigate to account page to confirm
		await page.goto('/konto');
		await expect(page.locator('h1')).toContainText('Hej,');
		await expect(page.getByText(newEmail)).toBeVisible({ timeout: 10_000 });
	});
});
