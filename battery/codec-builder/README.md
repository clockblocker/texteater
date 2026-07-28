# codec-builder-library

Composable codec builders on top of Zod for reshaping data and building strict field adapters.

The package supports Zod 3 and Zod 4 Classic. The v4 entrypoint requires Zod
4.4 or newer and returns native Zod codecs. Zod Mini is not supported.

## Install

```bash
npm install codec-builder-library zod
```

## Choose a Zod version

Import the versioned entrypoint when only one Zod implementation should enter
your application module graph:

```ts
import { codecBuilder3 } from "codec-builder-library/v3";
import { codecBuilder4 } from "codec-builder-library/v4";
```

Both builders are also available from the package root for applications whose
bundler performs ESM tree-shaking:

```ts
import { codecBuilder3, codecBuilder4 } from "codec-builder-library";
```

## Zod 3 usage

```ts
import { codecBuilder3 } from "codec-builder-library/v3";
import { z } from "zod/v3";

const serverSchema = z.object({
	id: z.number(),
	answers: z.array(
		z.object({
			ans_to_q1: z.string(),
			comment_to_q1_: z.string(),
		}),
	),
});

const codec = codecBuilder3.buildStrictFieldAdapterCodec(serverSchema, {
	id: codecBuilder3.fieldCodec.noOp,
	answers: codecBuilder3.fieldCodec.arrayOf({
		ans_to_q1: codecBuilder3.fieldCodec.noOp,
		comment_to_q1_: codecBuilder3.fieldCodec.noOp,
	}),
});
```

For Zod 4, import `codecBuilder4` from `codec-builder-library/v4` and Zod from
`zod/v4` (or the `zod` package root when using Zod 4). Its schema-backed
builders and field codecs use Zod's validated `decode`/`encode` contract:

```ts
import { codecBuilder4 } from "codec-builder-library/v4";

const numericString =
	codecBuilder4.fieldCodec.nonNullish.numericString.and.number;

numericString.decode(42); // "42"
numericString.encode("42.5"); // 42.5

numericString.in; // input schema
numericString.out; // output schema
```

The schema-less `buildStrictFieldAdapter()` also uses the `decode` and
`encode` names, but cannot provide Zod validation because it has no schemas.

## Development

```bash
bun install
bun run build
bun test
```
