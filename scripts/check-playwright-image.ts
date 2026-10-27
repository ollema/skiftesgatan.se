import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// The Playwright container image in CI is pinned by tag + digest, and both have
// to track the @playwright/test version installed from package.json. Renovating
// one without the other leaves the jobs running against a different browser
// build than the tests expect, which surfaces as confusing flakiness rather
// than a clear version error.
const ROOT = join(import.meta.dirname, '..');
const WORKFLOW = join(ROOT, '.github', 'workflows', 'ci.yml');
const IMAGE_RE = /mcr\.microsoft\.com\/playwright:v([\d.]+)-noble/g;

function fail(message: string): never {
	console.error(`playwright:check: ${message}`);
	process.exit(1);
}

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')) as {
	devDependencies?: Record<string, string>;
};
const declared = pkg.devDependencies?.['@playwright/test'];
if (!declared) fail('@playwright/test is not a devDependency');

// "^1.64.1" -> "1.64.1"
const expected = declared.replace(/^[^\d]*/, '').split(/[\s-]/)[0];

const workflow = readFileSync(WORKFLOW, 'utf8');
const found = [...workflow.matchAll(IMAGE_RE)].map((match) => match[1]);
if (found.length === 0) {
	fail(`found no mcr.microsoft.com/playwright image in ${WORKFLOW}`);
}

const distinct = [...new Set(found)];
const mismatched = distinct.filter((version) => version !== expected);

if (mismatched.length > 0) {
	fail(
		`ci.yml uses the Playwright image at ${mismatched.join(', ')} but package.json has ` +
			`@playwright/test ${declared}. Bump the image tag (and digest) in both jobs in ${WORKFLOW}.`
	);
}

console.log(`playwright:check: ci.yml image tag ${distinct.join(', ')} matches @playwright/test`);
