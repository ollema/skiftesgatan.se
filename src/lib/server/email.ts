import { writeFileSync, mkdirSync } from 'node:fs';
import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

export function sendEmail(options: { to: string; subject: string; html: string }) {
	if (!env.RESEND_API_KEY) {
		const type = /verify/i.test(options.subject) ? 'verify' : 'reset';
		const recipient = options.to.replace(/[@.]/g, '-');
		mkdirSync('.test-emails', { recursive: true });
		writeFileSync(`.test-emails/${type}-${recipient}.json`, JSON.stringify(options));
		return;
	}

	const resend = new Resend(env.RESEND_API_KEY);
	void resend.emails
		.send({
			from: env.EMAIL_FROM || 'Skiftesgatan <onboarding@resend.dev>',
			to: [options.to],
			subject: options.subject,
			html: options.html
		})
		.catch((err) => {
			console.error('Failed to send email:', err);
		});
}
