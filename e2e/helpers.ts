import fs from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

const TEST_EMAILS_DIR = '.test-emails';

export function readVerificationUrl(username: string): string {
	const filePath = path.join(TEST_EMAILS_DIR, `verify-${username.toLowerCase()}.json`);
	const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
	return data.url;
}

export function readResetPasswordUrl(email: string): string {
	const safeEmail = email.replace(/[@.]/g, '-');
	const filePath = path.join(TEST_EMAILS_DIR, `reset-${safeEmail}.json`);
	const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
	return data.url;
}

export function uniqueUser(prefix: string) {
	return {
		username: `${prefix}${1000 + (Date.now() % 9000)}`,
		password: 'TestPassword123!',
		email: `test-${prefix.toLowerCase()}-${Date.now()}@resend.dev`
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

export async function verify(page: Page, username: string) {
	const url = readVerificationUrl(username);
	await page.goto(url);
}

export async function registerAndVerify(
	page: Page,
	user: { username: string; email: string; password: string }
) {
	await register(page, user);
	await verify(page, user.username);
}

export async function login(page: Page, user: { username: string; password: string }) {
	await page.goto('/auth/login');
	const loginForm = page.locator('form').nth(0);
	await loginForm.getByLabel('Apartment').fill(user.username);
	await loginForm.getByLabel('Password').fill(user.password);
	await loginForm.getByRole('button', { name: 'Login' }).click();
	await expect(page).toHaveURL('/auth');
}
