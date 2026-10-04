import { defineGeneratedDocPage } from "../../../lib/docs/source-mirrored-doc-pages.ts";

export default defineGeneratedDocPage({
	title: "API",
	order: 30,
	description:
		"Runtime validation, structural types and concrete schema composition.",
	body: `
Dumling separates runtime validation, public types and schema authoring.

| Import path | Purpose |
| --- | --- |
| \`dumling\` | \`parseUnit\` and error values |
| \`dumling/types\` | Structural units and valid route coordinates |
| \`dumling/schema/<language>/<family>/<kind-name>\` | Concrete composable Zod schemas |

## Validate a unit

\`\`\`ts
import { parseUnit } from "dumling";

declare const input: unknown;
const parsed = parseUnit(input, {
  unitKind: "Surface", language: "de", family: "Lexeme", kind: "NOUN",
});
if (parsed.success) {
  console.log(parsed.chain.value.normalizedSurface);
} else {
  console.log(parsed.error.issues);
}
\`\`\`

Whether a parsed Surface is its Lemma's Grundform depends on each language's
citation conventions, so \`checkIfGrundform\` comes from
\`dumcorpus/inventories\`, not from Dumling.

Create units with object literals containing their \`unitKind\` and complete
route-specific fields. Use \`satisfies Dumling.Lemma<"de", "Lexeme", "NOUN">\`
with \`import type * as Dumling from "dumling/types"\` to check authored values.

See the [German](/lang/de/), [English](/lang/en/) and [Hebrew](/lang/he/) pages for complete examples.

## Compose a concrete schema

\`\`\`ts
import { lemmaSchema, surfaceSchema, readingSchema, attestationSchema }
  from "dumling/schema/de/lexeme/noun";

const nounForm = lemmaSchema.pick({ canonicalForm: true });
const coreFeatures = lemmaSchema.shape.coreFeatures;
const withoutSpelling = surfaceSchema.omit({ spelling: true });
\`\`\`

Each concrete module exports \`lemmaSchema\`, \`surfaceSchema\`, \`readingSchema\`
and \`attestationSchema\`. These retain their Zod composition types. Operational
and type-only imports are independent of Zod; import concrete schemas when
authoring a schema rather than for ordinary runtime parsing.
`,
});
