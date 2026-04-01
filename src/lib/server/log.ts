const LEVELS = { debug: 0, info: 1, warn: 2, error: 3, silent: 4 } as const;
type Level = keyof typeof LEVELS;

const current = LEVELS[(process.env.LOG_LEVEL as Level) ?? 'info'] ?? LEVELS.info;

export const log = {
	debug: (...args: unknown[]) => {
		if (current <= 0) console.debug(...args);
	},
	info: (...args: unknown[]) => {
		if (current <= 1) console.log(...args);
	},
	warn: (...args: unknown[]) => {
		if (current <= 2) console.warn(...args);
	},
	error: (...args: unknown[]) => {
		if (current <= 3) console.error(...args);
	}
};
