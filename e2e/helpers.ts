import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

const TEST_EMAILS_DIR = '.test-emails';

function readEmailUrl(type: string, email: string): string {
	const recipient = email.replace(/[@.]/g, '-');
	const filePath = path.join(TEST_EMAILS_DIR, `${type}-${recipient}.json`);
	const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
	const match = data.html.match(/href="([^"]+)"/);
	if (!match) throw new Error(`No URL found in ${filePath}`);
	return match[1];
}

export function readVerificationUrl(email: string): string {
	return readEmailUrl('verify', email);
}

export function readResetPasswordUrl(email: string): string {
	return readEmailUrl('reset', email);
}

const VALID_SUFFIXES = ['1001', '1002', '1101', '1102', '1201', '1202', '1301', '1302'];
const counters: Record<string, number> = {};

export function uniqueUser(prefix: string) {
	const key = prefix.toUpperCase();
	const index = counters[key] ?? 0;
	counters[key] = index + 1;
	if (index >= VALID_SUFFIXES.length) {
		throw new Error(`Exhausted all ${VALID_SUFFIXES.length} valid apartments for prefix "${key}"`);
	}
	const username = `${key}${VALID_SUFFIXES[index]}`;
	return {
		username,
		password: 'TestPassword123!',
		email: `test-${key.toLowerCase()}-${Date.now()}-${index}@resend.dev`
	};
}

export async function register(
	page: Page,
	user: { username: string; email: string; password: string }
) {
	await page.goto('/auth/login');
	const signupForm = page.locator('form').nth(1);
	await signupForm.getByLabel('Apartment').fill(user.username);
	await signupForm.getByLabel('Email').fill(user.email);
	await signupForm.getByLabel('Password').fill(user.password);
	await signupForm.getByRole('button', { name: 'Register' }).click();
	await expect(page).toHaveURL('/auth/verify-email');
}

export async function verify(page: Page, email: string) {
	const url = readVerificationUrl(email);
	await page.goto(url);
}

export async function registerAndVerify(
	page: Page,
	user: { username: string; email: string; password: string }
) {
	await register(page, user);
	await verify(page, user.email);
}

export async function login(page: Page, user: { username: string; password: string }) {
	await page.goto('/auth/login');
	const loginForm = page.locator('form').nth(0);
	await loginForm.getByLabel('Apartment').fill(user.username);
	await loginForm.getByLabel('Password').fill(user.password);
	await loginForm.getByRole('button', { name: 'Login' }).click();
	await expect(page).toHaveURL('/auth');
}
