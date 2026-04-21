const BRAND = 'BRF Skiftesgatan 4';

const COLOR = {
	bg: '#f5f0e8',
	surface: '#fdfbf7',
	textPrimary: '#2c2a25',
	textMuted: '#9c9590',
	accent: '#4a6741',
	link: '#8b7355'
};

const FONT_HEADING = `'DM Serif Display', Georgia, serif`;
const FONT_BODY = `'Source Serif 4', Georgia, serif`;

function mustache(key: string): string {
	return `{{{${key}}}}`;
}

function ctaButton(mustacheUrl: string, label: string): string {
	return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:32px 0;">
	<tr>
		<td style="background:${COLOR.accent};border-radius:3px;">
			<a href="${mustacheUrl}" style="display:inline-block;padding:12px 28px;font-family:${FONT_BODY};font-size:14px;color:${COLOR.surface};text-decoration:none;letter-spacing:0.05em;text-transform:uppercase;">${label}</a>
		</td>
	</tr>
</table>`;
}

function bodyLink(mustacheUrl: string): string {
	return `<a href="${mustacheUrl}" style="color:${COLOR.link};text-decoration:underline;text-underline-offset:3px;">${mustacheUrl}</a>`;
}

function heading(text: string): string {
	return `<h1 style="font-family:${FONT_HEADING};font-weight:400;font-size:28px;line-height:1.3;margin:0 0 24px;color:${COLOR.textPrimary};">${text}</h1>`;
}

function paragraph(text: string): string {
	return `<p style="margin:0 0 20px;">${text}</p>`;
}

function wrapEmail(options: { preheader: string; body: string }): string {
	return `<!doctype html>
<html lang="sv">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${BRAND}</title>
</head>
<body style="margin:0;padding:0;background:${COLOR.bg};font-family:${FONT_BODY};color:${COLOR.textPrimary};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${options.preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLOR.bg};">
	<tr>
		<td align="center">
			<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">
				<tr>
					<td style="background:${COLOR.accent};padding:20px 32px;">
						<span style="font-family:${FONT_HEADING};font-size:20px;color:${COLOR.bg};letter-spacing:0.01em;">${BRAND}</span>
					</td>
				</tr>
				<tr>
					<td style="padding:56px 32px 40px;line-height:1.7;font-size:16px;color:${COLOR.textPrimary};">
						${options.body}
					</td>
				</tr>
				<tr>
					<td style="padding:24px 32px 56px;font-size:12px;color:${COLOR.textMuted};letter-spacing:0.08em;text-transform:uppercase;">
						${BRAND} &middot; Göteborg
					</td>
				</tr>
			</table>
		</td>
	</tr>
</table>
</body>
</html>`;
}

type TemplateVariableSpec = {
	key: string;
	type: 'string' | 'number';
};

export type EmailTemplateSpec = {
	alias: string;
	name: string;
	subject: string;
	html: string;
	variables: TemplateVariableSpec[];
};

const URL_VAR = mustache('URL');

const verifyEmail: EmailTemplateSpec = {
	alias: 'skiftesgatan-verify-email',
	name: 'Verify email',
	subject: 'Bekräfta din nya e-postadress',
	html: wrapEmail({
		preheader: 'Bekräfta den nya e-postadressen för ditt konto.',
		body: [
			heading('Bekräfta din nya e-postadress'),
			paragraph(
				'Du har begärt att ändra e-postadressen för ditt konto. Klicka på knappen nedan för att bekräfta den nya adressen.'
			),
			ctaButton(URL_VAR, 'Bekräfta adress'),
			paragraph(`Om knappen inte fungerar kan du kopiera länken: ${bodyLink(URL_VAR)}`),
			paragraph('Om du inte har begärt någon ändring kan du kontakta styrelsen.')
		].join('\n')
	}),
	variables: [{ key: 'URL', type: 'string' }]
};

const resetPassword: EmailTemplateSpec = {
	alias: 'skiftesgatan-reset-password',
	name: 'Reset password',
	subject: 'Återställ ditt lösenord',
	html: wrapEmail({
		preheader: 'Klicka på länken för att välja ett nytt lösenord.',
		body: [
			heading('Återställ ditt lösenord'),
			paragraph(
				'Vi fick en begäran om att återställa lösenordet till ditt konto. Klicka på knappen nedan för att välja ett nytt lösenord.'
			),
			ctaButton(URL_VAR, 'Återställ lösenord'),
			paragraph(`Om knappen inte fungerar kan du kopiera länken: ${bodyLink(URL_VAR)}`),
			paragraph(
				'Om du inte har begärt någon återställning kan du ignorera detta meddelande. Ditt lösenord förblir oförändrat.'
			)
		].join('\n')
	}),
	variables: [{ key: 'URL', type: 'string' }]
};

const bookingReminder: EmailTemplateSpec = {
	alias: 'skiftesgatan-booking-reminder',
	name: 'Booking reminder',
	subject: `Påminnelse: ${mustache('RESOURCE')} ${mustache('RELATIVE_DAY')} kl ${mustache('TIME_RANGE')}`,
	html: wrapEmail({
		preheader: `${mustache('RESOURCE')} ${mustache('RELATIVE_DAY')} kl ${mustache('TIME_RANGE')}`,
		body: [
			heading('Påminnelse om din bokning'),
			paragraph(
				`Du har en bokning i ${mustache('RESOURCE_LOWER')} ${mustache('RELATIVE_DAY')} kl ${mustache('TIME_RANGE')}.`
			)
		].join('\n')
	}),
	variables: [
		{ key: 'RESOURCE', type: 'string' },
		{ key: 'RESOURCE_LOWER', type: 'string' },
		{ key: 'RELATIVE_DAY', type: 'string' },
		{ key: 'TIME_RANGE', type: 'string' }
	]
};

export const EMAIL_TEMPLATES = {
	verifyEmail,
	resetPassword,
	bookingReminder
} satisfies Record<string, EmailTemplateSpec>;

export const EMAIL_TEMPLATE_LIST: EmailTemplateSpec[] = Object.values(EMAIL_TEMPLATES);
