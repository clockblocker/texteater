# codec-builder-library

Composable codec builders on top of `zod` for reshaping data and building strict field adapters.

## Install

```bash
npm install codec-builder-library zod
```

## Usage

```ts
import { z } from "zod";
import { codecBuilder } from "codec-builder-library";

const serverSchema = z.object({
	id: z.number(),
	answers: z.array(
		z.object({
			ans_to_q1: z.string(),
			comment_to_q1_: z.string(),
		}),
	),
});

const codec = codecBuilder.buildStrictFieldAdapterCodec(serverSchema, {
	id: codecBuilder.fieldCodec.noOp,
	answers: codecBuilder.fieldCodec.arrayOf({
		ans_to_q1: codecBuilder.fieldCodec.noOp,
		comment_to_q1_: codecBuilder.fieldCodec.noOp,
	}),
});
```

## Development

```bash
bun install
bun run build
bun test
```
