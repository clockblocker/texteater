import { codecBuilder4 } from "codec-builder-library/v4";
import { schemasFor } from "dumling/schema";
import { z } from "zod";

import { asObjectSchema } from "../../../../../../../schema/as-object-schema";
import type {
	PromptInputSchema,
	PromptOutputSchema,
} from "../../../../../../assembly";

const canonicalLemmaSchema = asObjectSchema(
	schemasFor.de.entity.Lemma.Lexeme.CCONJ(),
);
const canonicalCitationSurfaceSchema = asObjectSchema(
	schemasFor.de.entity.Surface.Citation.Lexeme.CCONJ(),
);

export const deCoordinatingConjunctionLemmaCodec =
	codecBuilder4.buildFixedFieldsCodec(canonicalLemmaSchema, {
		language: "de",
		family: "Lexeme",
		kind: "CCONJ",
	});

export const deCoordinatingConjunctionModelLemmaSchema =
	deCoordinatingConjunctionLemmaCodec.in;

type DeCoordinatingConjunctionLemma = z.output<
	typeof deCoordinatingConjunctionLemmaCodec
>;

const modelSurfaceFeaturesSchema = z
	.strictObject({ historicalStatus: z.literal("Archaic").nullable() })
	.nullable();

function normalizeModelSurfaceFeatures<
	Surface extends {
		readonly surfaceFeatures: {
			readonly historicalStatus: "Archaic" | null;
		} | null;
	},
>(surface: Surface): Surface {
	if (
		surface.surfaceFeatures === null ||
		surface.surfaceFeatures.historicalStatus !== null
	) {
		return surface;
	}
	return { ...surface, surfaceFeatures: null };
}

export function buildDeCoordinatingConjunctionCitationSurfaceCodec(
	lemma: DeCoordinatingConjunctionLemma,
) {
	const canonicalCodec = codecBuilder4.buildFixedFieldsCodec(
		canonicalCitationSurfaceSchema,
		{ language: "de", lemma },
	);
	const modelSchema = canonicalCodec.in.extend({
		surfaceFeatures: modelSurfaceFeaturesSchema,
	});
	return z.codec(modelSchema, canonicalCodec.out, {
		decode: (model) =>
			canonicalCodec.decode(normalizeModelSurfaceFeatures(model)),
		encode: (canonical) => canonicalCodec.encode(canonical),
	});
}

const schemaProjectionLemma = {
	language: "de",
	canonicalForm: "und",
	family: "Lexeme",
	kind: "CCONJ",
	coreFeatures: { conjType: null },
} satisfies DeCoordinatingConjunctionLemma;

export const deCoordinatingConjunctionModelCitationSurfaceSchema =
	buildDeCoordinatingConjunctionCitationSurfaceCodec(
		schemaProjectionLemma,
	).in;

export const inputSchema = z.strictObject({
	markedContext: z.string().min(1),
}) satisfies PromptInputSchema;

export const outputSchema = z.strictObject({
	decision: z.enum(["Resolved", "Unresolved"]),
	resolution: z
		.strictObject({
			memberOrthographies: z.array(z.enum(["Standard", "Typo"])).min(1),
			realizationCoverage: z.enum(["Full", "Partial"]),
			surface: deCoordinatingConjunctionModelCitationSurfaceSchema,
			lemma: deCoordinatingConjunctionModelLemmaSchema,
		})
		.nullable(),
}) satisfies PromptOutputSchema;
