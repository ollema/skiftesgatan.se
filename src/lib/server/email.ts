import { writeFileSync, mkdirSync } from 'node:fs';
import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
import { log } from '$lib/server/log';

export async function sendEmail(options: { to: string; subject: string; html: string }) {
	const label = `to ${options.to} subject="${options.subject}"`;

	if (!env.RESEND_API_KEY) {
		const type = /verif(?:y|iera)/i.test(options.subject) ? 'verify' : 'reset';
		const recipient = options.to.replace(/[@.]/g, '-');
		const file = `.test-emails/${type}-${recipient}.json`;
		mkdirSync('.test-emails', { recursive: true });
		writeFileSync(file, JSON.stringify(options));
		log.info(`[email] sent ${label} (no Resend API key, written to ${file})`);
		return;
	}

	const resend = new Resend(env.RESEND_API_KEY);
	const { error } = await resend.emails.send({
		from: env.EMAIL_FROM || 'Skiftesgatan <onboarding@resend.dev>',
		to: [options.to],
		subject: options.subject,
		html: options.html
	});

	if (error) {
		log.error(`[email] failed to send ${label}`, error);
		throw new Error(`Email send failed: ${error.message}`);
	}

	log.info(`[email] sent ${label}`);
}
