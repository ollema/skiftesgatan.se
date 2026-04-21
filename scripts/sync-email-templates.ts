import 'dotenv/config';
import { Resend } from 'resend';
import { EMAIL_TEMPLATE_LIST, type EmailTemplateSpec } from '../src/lib/server/email.templates';

const apiKey = process.env.RESEND_API_KEY;
if (!apiKey) {
	console.error('RESEND_API_KEY is not set. Add it to your env before running.');
	process.exit(1);
}
const from = process.env.EMAIL_FROM ?? 'Skiftesgatan <onboarding@resend.dev>';

const resend = new Resend(apiKey);

async function listAllTemplates() {
	const byAlias = new Map<string, string>();
	let after: string | undefined;
	while (true) {
		const page = await resend.templates.list({ limit: 100, after });
		if (page.error) throw new Error(`list failed: ${page.error.message}`);
		const data = page.data;
		if (!data) break;
		for (const item of data.data) {
			if (item.alias) byAlias.set(item.alias, item.id);
		}
		if (!data.has_more || data.data.length === 0) break;
		after = data.data[data.data.length - 1].id;
	}
	return byAlias;
}

async function upsert(template: EmailTemplateSpec, existingId: string | undefined) {
	const payload = {
		name: template.name,
		alias: template.alias,
		subject: template.subject,
		from,
		html: template.html,
		variables: template.variables
	};

	if (existingId) {
		console.log(`[email:sync] updating ${template.alias}`);
		const updated = await resend.templates.update(existingId, payload);
		if (updated.error) throw new Error(`update failed: ${updated.error.message}`);
		const published = await resend.templates.publish(existingId);
		if (published.error) throw new Error(`publish failed: ${published.error.message}`);
		return;
	}

	console.log(`[email:sync] creating ${template.alias}`);
	const created = await resend.templates.create(payload).publish();
	if (created.error) throw new Error(`create failed: ${created.error.message}`);
}

const existing = await listAllTemplates();
for (const template of EMAIL_TEMPLATE_LIST) {
	await upsert(template, existing.get(template.alias));
	console.log(`[email:sync] ${template.alias} published`);
}
console.log(`[email:sync] synced ${EMAIL_TEMPLATE_LIST.length} template(s)`);
