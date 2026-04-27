import { test, expect } from './fixtures';
import { uniqueUser, login } from './helpers';

test.describe('auth flow', () => {
	test('login, access protected page, sign out, login again', async ({ page }) => {
		const user = uniqueUser('A');

		// Visit protected page → should redirect to login
		await page.goto('/konto');
		await expect(page).toHaveURL(/\/logga-in/);

		// Login with pre-seeded account
		await login(page, user);

		// Should be able to access protected page
		await page.goto('/konto');
		await expect(page.locator('h1')).toContainText('Hej,');

		// Sign out
		await page.getByRole('button', { name: 'Logga ut' }).click();
		await expect(page).toHaveURL(/\/logga-in/);

		// Login again
		await login(page, user);
		await expect(page).toHaveURL('/konto');
		await expect(page.locator('h1')).toContainText('Hej,');
	});

	test('login with wrong password shows error', async ({ page }) => {
		const user = uniqueUser('A');

		await page.goto('/konto/logga-in');
		const loginForm = page.locator('form').nth(0);
		await loginForm.getByLabel('Lägenhet').fill(user.username);
		await loginForm.getByLabel('Lösenord').fill('wrong-password');
		await loginForm.getByRole('button', { name: 'Logga in' }).click();

		await expect(page).toHaveURL(/\/logga-in/);
		await expect(page.locator('.text-error')).toContainText('Felaktigt');
	});

	test('change display name', async ({ page }) => {
		const user = uniqueUser('A');
		await login(page, user);

		await page.goto('/konto');
		await expect(page.locator('h1')).toContainText('Hej,');

		// Open the edit dialog
		await page.getByRole('button', { name: 'Ändra' }).first().click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();

		const newName = 'Nytt Testnamn';
		await dialog.getByLabel('Nytt visningsnamn').fill(newName);
		await dialog.getByRole('button', { name: 'Spara' }).click();

		await expect(page.getByText(`Hej, ${newName}.`)).toBeVisible();
	});

	test('change password', async ({ page }) => {
		const user = uniqueUser('A');
		await login(page, user);

		// Go to account page
		await page.goto('/konto');
		await expect(page.locator('h1')).toContainText('Hej,');

		// Open the password edit dialog (third "Ändra" button)
		await page.getByRole('button', { name: 'Ändra' }).nth(2).click();
		const dialog = page.getByRole('dialog');
		await expect(dialog).toBeVisible();

		// Change password
		const newPassword = 'NewPassword456!';
		await dialog.getByLabel('Nuvarande lösenord').fill(user.password);
		await dialog.getByLabel('Nytt lösenord').fill(newPassword);
		await dialog.getByRole('button', { name: 'Spara' }).click();

		// Sign out
		await page.getByRole('button', { name: 'Logga ut' }).click();
		await expect(page).toHaveURL(/\/logga-in/);

		// Login with new password
		await login(page, { username: user.username, password: newPassword });
		await expect(page).toHaveURL('/konto');
		await expect(page.locator('h1')).toContainText('Hej,');
	});
});
