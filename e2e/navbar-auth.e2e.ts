import { test, expect } from './fixtures';
import { uniqueUser, login } from './helpers';

test.describe('navbar auth reactivity', () => {
	test('logout clears apartment name from navbar and mobile menu', async ({ asUser }) => {
		const { user, page } = await asUser('A');

		await page.goto('/konto');

		const nav = page.locator('nav').first();
		await expect(nav.getByRole('link', { name: user.username })).toBeVisible();

		await page.getByRole('button', { name: 'Logga ut' }).click();
		await expect(page).toHaveURL(/\/konto\/logga-in/);

		await expect(nav.getByRole('link', { name: 'Logga in' })).toBeVisible();
		await expect(nav.getByRole('link', { name: user.username })).toHaveCount(0);

		await page.setViewportSize({ width: 640, height: 800 });
		await page.getByRole('button', { name: 'Öppna meny' }).click();
		const dialog = page.getByRole('dialog');
		await expect(dialog.getByRole('link', { name: 'Logga in' })).toBeVisible();
		await expect(dialog.getByRole('link', { name: user.username })).toHaveCount(0);
	});

	test('login swaps "Logga in" for apartment name in navbar', async ({ page }) => {
		const user = uniqueUser('B');

		await page.goto('/');
		const nav = page.locator('nav').first();
		await expect(nav.getByRole('link', { name: 'Logga in' })).toBeVisible();

		await login(page, user);

		await expect(nav.getByRole('link', { name: user.username })).toBeVisible();
		await expect(nav.getByRole('link', { name: 'Logga in' })).toHaveCount(0);

		await nav.getByRole('link', { name: user.username }).click();
		await expect(page).toHaveURL('/konto');
	});
});
