import { defineCollection, defineConfig } from '@content-collections/core';
import { compileMarkdown } from '@content-collections/markdown';
import * as v from 'valibot';

const news = defineCollection({
	name: 'news',
	directory: 'content/news',
	include: '*.md',
	schema: v.object({
		title: v.string(),
		date: v.string(),
		summary: v.string(),
		content: v.string()
	}),
	transform: async (doc, ctx) => {
		const html = await compileMarkdown(ctx, doc);
		return { ...doc, html };
	}
});

const information = defineCollection({
	name: 'information',
	directory: 'content/information',
	include: '**/*.md',
	schema: v.object({
		title: v.string(),
		content: v.string()
	}),
	transform: async (doc, ctx) => {
		const html = await compileMarkdown(ctx, doc);
		return { ...doc, html };
	}
});

export default defineConfig({
	content: [news, information]
});
