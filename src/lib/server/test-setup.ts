import { vi } from 'vitest';

vi.mock('$lib/server/db', () => ({ db: {} }));
