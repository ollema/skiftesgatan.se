import { createBuilder } from '@content-collections/core';

// The Vite plugin builds the collections as part of `pnpm build`/`pnpm dev`, but
// `svelte-check` and `knip` need the generated types and modules on a fresh
// checkout. Exposed as `pnpm content:build` so CI does not have to inline the
// builder invocation.
const builder = await createBuilder('./content-collections.ts');
await builder.build();
