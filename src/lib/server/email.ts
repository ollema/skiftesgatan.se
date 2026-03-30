import { Resend } from 'resend';
import { env } from '$env/dynamic/private';

export function sendEmail(options: { to: string; subject: string; html: string }) {
	if (!env.RESEND_API_KEY) {
		console.warn('RESEND_API_KEY not set, skipping email send');
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
