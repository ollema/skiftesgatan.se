import { writeFileSync, mkdirSync } from 'node:fs';
import { Resend } from 'resend';
import { env } from '$env/dynamic/private';
import { log } from '$lib/server/log';

export async function sendEmail(options: {
	to: string;
	templateAlias: string;
	variables: Record<string, string | number>;
}): Promise<string | null> {
	const label = `${options.templateAlias} to ${options.to}`;

	if (!env.RESEND_API_KEY) {
		const recipient = options.to.toLowerCase().replace(/[@.]/g, '-');
		const file = `.test-emails/${options.templateAlias}-${recipient}.json`;
		mkdirSync('.test-emails', { recursive: true });
		writeFileSync(
			file,
			JSON.stringify({
				to: options.to,
				templateAlias: options.templateAlias,
				variables: options.variables
			})
		);
		log.info(`[email] sent ${label} (no Resend API key, written to ${file})`);
		return null;
	}

	const resend = new Resend(env.RESEND_API_KEY);
	const { data, error } = await resend.emails.send({
		from: env.EMAIL_FROM || 'Skiftesgatan <onboarding@resend.dev>',
		to: [options.to],
		template: {
			id: options.templateAlias,
			variables: options.variables
		}
	});

	if (error) {
		log.error(`[email] failed to send ${label}`, error);
		throw new Error(`Email send failed: ${error.message}`);
	}

	log.info(`[email] sent ${label}`);
	return data?.id ?? null;
}
