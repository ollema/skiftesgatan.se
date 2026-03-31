import { test, expect } from '@playwright/test';

test.describe('content pages', () => {
	test('news listing and article pages', async ({ page }) => {
		await page.goto('/news');
		await expect(page.locator('h1')).toHaveText('News');

		// At least one article link
		const firstArticle = page.locator('a[href*="/news/"]').first();
		await expect(firstArticle).toBeVisible();

		// Click through to article
		await firstArticle.click();
		await expect(page).toHaveURL(/\/news\/.+/);
		await expect(page.locator('h1')).toBeVisible();
	});

	test('information listing and detail pages', async ({ page }) => {
		await page.goto('/information');
		await expect(page.locator('h1')).toHaveText('Information');

		// At least one page link
		const firstPage = page.locator('a[href*="/information/"]').first();
		await expect(firstPage).toBeVisible();

		// Click through to detail page
		await firstPage.click();
		await expect(page).toHaveURL(/\/information\/.+/);
		await expect(page.locator('h1')).toBeVisible();
	});

	test('contact page', async ({ page }) => {
		await page.goto('/contact');
		await expect(page.locator('h1')).toBeVisible();
	});

	test('404 for non-existent content', async ({ page }) => {
		const newsResponse = await page.goto('/news/nonexistent-article');
		expect(newsResponse?.status()).toBe(404);

		const infoResponse = await page.goto('/information/nonexistent-page');
		expect(infoResponse?.status()).toBe(404);
	});
});
