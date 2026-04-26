import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';
import { EMAIL_TEMPLATES } from '../src/lib/server/email.templates';

const TEST_EMAILS_DIR = '.test-emails';

function readEmailUrl(templateAlias: string, email: string): string {
	const recipient = email.replace(/[@.]/g, '-');
	const filePath = path.join(TEST_EMAILS_DIR, `${templateAlias}-${recipient}.json`);
	const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
	const url = data.variables?.URL;
	if (!url) throw new Error(`No URL variable found in ${filePath}`);
	return url;
}

export function readResetPasswordUrl(email: string): string {
	return readEmailUrl(EMAIL_TEMPLATES.resetPassword.alias, email);
}

export function readVerificationUrl(email: string): string {
	return readEmailUrl(EMAIL_TEMPLATES.verifyEmail.alias, email);
}

const ALL_SUFFIXES = ['1001', '1002', '1101', '1102', '1201', '1202', '1301', '1302'];
const counters: Record<string, number> = {};

export function uniqueUser(prefix: string) {
	const key = prefix.toUpperCase();
	// B1001 is the seeded admin — skip it so tests never collide with admin state.
	const suffixes = key === 'B' ? ALL_SUFFIXES.filter((s) => s !== '1001') : ALL_SUFFIXES;
	const index = counters[key] ?? 0;
	counters[key] = index + 1;
	if (index >= suffixes.length) {
		throw new Error(`Exhausted all ${suffixes.length} valid apartments for prefix "${key}"`);
	}
	const username = `${key}${suffixes[index]}`;
	return {
		username,
		password: `password-${username}`,
		email: `delivered+${username}@resend.dev`
	};
}

export function adminUser() {
	return {
		username: 'B1001',
		password: 'password-B1001',
		email: 'delivered+B1001@resend.dev'
	};
}

export async function selectCalendarDate(page: Page, isoDate: string) {
	const [, month] = isoDate.split('-').map(Number);
	const calendar = page.locator('[data-calendar-root]');

	// Navigate to the correct month by checking the heading
	for (let i = 0; i < 12; i++) {
		const heading = await calendar.locator('[data-calendar-heading]').textContent();
		if (!heading) break;
		// heading is like "April 2026" — extract the month number
		const headingDate = new Date(heading + ' 1');
		if (headingDate.getMonth() + 1 === month) break;
		if (headingDate.getMonth() + 1 < month) {
			const btn = calendar.locator('[data-calendar-next-button]');
			if ((await btn.getAttribute('data-disabled')) !== null) break;
			await btn.click();
		} else {
			const btn = calendar.locator('[data-calendar-prev-button]');
			if ((await btn.getAttribute('data-disabled')) !== null) break;
			await btn.click();
		}
	}

	// Click the day cell — bits-ui Day buttons have data-value="YYYY-MM-DD"
	await calendar.locator(`[data-calendar-day][data-value="${isoDate}"]`).click();
}

export async function confirmCancelDialog(page: Page) {
	await page.getByRole('alertdialog').getByRole('button', { name: 'Bekräfta' }).click();
}

export async function login(page: Page, user: { username: string; password: string }) {
	await page.goto('/konto/login');
	const loginForm = page.locator('form').nth(0);
	await loginForm.getByLabel('Lägenhet').fill(user.username);
	await loginForm.getByLabel('Lösenord').fill(user.password);
	await loginForm.getByRole('button', { name: 'Logga in' }).click();
	await expect(page).toHaveURL('/konto');
}
