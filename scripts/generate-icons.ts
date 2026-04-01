import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';

const STATIC = join(import.meta.dirname, '..', 'static');
const BG = '#4a6741';
const FG = '#fdfbf7';

function createSvg(size: number, padding: number = 0): string {
	const fontSize = (size - padding * 2) * 0.55;
	const yOffset = fontSize * 0.36;

	return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
	<rect width="${size}" height="${size}" fill="${BG}" rx="0" />
	<text
		x="${size / 2}"
		y="${size / 2 + yOffset}"
		text-anchor="middle"
		font-family="Georgia, 'Times New Roman', serif"
		font-size="${fontSize}"
		font-weight="400"
		fill="${FG}"
	>S</text>
</svg>`;
}

const icons: { name: string; size: number; padding?: number }[] = [
	{ name: 'icon-192.png', size: 192 },
	{ name: 'icon-512.png', size: 512 },
	{ name: 'icon-maskable-192.png', size: 192, padding: 19 },
	{ name: 'icon-maskable-512.png', size: 512, padding: 51 },
	{ name: 'apple-touch-icon.png', size: 180 }
];

for (const { name, size, padding } of icons) {
	const svg = createSvg(size, padding ?? 0);
	const buf = await sharp(Buffer.from(svg)).png().toBuffer();
	const out = join(STATIC, name);
	writeFileSync(out, buf);
	console.log(`${name} (${size}x${size})`);
}

// SVG favicon
const faviconSvg = createSvg(32);
writeFileSync(join(STATIC, 'favicon.svg'), faviconSvg);
console.log('favicon.svg');

console.log('\nDone.');
