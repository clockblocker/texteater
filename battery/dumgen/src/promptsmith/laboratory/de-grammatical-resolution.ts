import { schemasFor } from "dumling/schema";
import { z } from "zod";

import type { GrammaticalResolution } from "../../types";
import type { Prompt } from "../prompt-definition";
import type { GermanHighLevelFamily, GermanHighLevelKind } from "./de-routes";

const inputSchema = z.strictObject({ markedContext: z.string().min(1) });
type ObjectSchema = z.ZodObject<z.ZodRawShape>;

export function createDeGrammaticalResolutionPrompt<
	const Family extends GermanHighLevelFamily,
	const Kind extends GermanHighLevelKind<Family>,
>(family: Family, kind: Kind) {
	const lemmaSchema = schemasFor.de.entity.Lemma[family][
		kind
	]() as unknown as ObjectSchema;
	const modelLemmaSchema = lemmaSchema.omit({
		language: true,
		family: true,
		kind: true,
	});

	const citationSchema = schemasFor.de.entity.Surface.Citation[family][
		kind
	]() as unknown as ObjectSchema;
	const modelCitationSchema = citationSchema.omit({
		language: true,
		lemma: true,
	});

	const inflectionGetter = (
		schemasFor.de.entity.Surface.Inflection as unknown as Record<
			string,
			Record<string, (() => z.ZodType) | undefined>
		>
	)[family]?.[kind];
	const inflectionSchema = inflectionGetter?.() as ObjectSchema | undefined;
	const modelSurfaceSchema = inflectionSchema
		? z.union([
				modelCitationSchema,
				inflectionSchema.omit({ language: true, lemma: true }),
			])
		: modelCitationSchema;

	const resolvedGrammarSchema = z.strictObject({
		memberOrthographies: z.array(z.enum(["Standard", "Typo"])).min(1),
		surface: modelSurfaceSchema,
		lemma: modelLemmaSchema,
	});
	const outputSchema = z.strictObject({
		decision: z.enum(["Resolved", "Unresolved"]),
		resolution: resolvedGrammarSchema.nullable(),
	});

	return {
		systemPrompt: `You are the German ${family}/${kind} Grammatical Resolution
route in a hands-on linguistic laboratory.

The marked context contains one or more <TARGET>...</TARGET> members of exactly
one ${family}/${kind}. Resolve only that fixed route or return Unresolved. Emit
one memberOrthographies value per TARGET pair in textual order. Standard covers
standard and licensed variant spelling; Typo means an actual spelling error.

normalizedSurface may repair typos and casing but must preserve attested
inflection, lexical-member order, and the number of attested lexical members.
Never lemmatize the Surface or insert material absent from it.
realizationCoverage is Partial only when this attestation omits lexical material
from the complete Lemma. Citation means citation form; Inflection means a
contextual inflection. Emit exactly the fields required by the structured
schema, with null for unmarked nullable features. canonicalForm is the complete
normalized citation form. coreFeatures describe grammatical identity only.

Do not return language, family, kind, target indices, a linked Surface, Reading,
meaning, confidence, candidates, explanation, or a different route.`,
		inputSchema,
		outputSchema,
		outputPostcondition: {
			assert(input, generated) {
				if (generated.decision === "Unresolved") return;
				if (generated.resolution === null) {
					throw new Error("Resolved grammar requires a resolution.");
				}
				const markerCount =
					input.markedContext.match(/<TARGET>/gu)?.length ?? 0;
				const closingCount =
					input.markedContext.match(/<\/TARGET>/gu)?.length ?? 0;
				if (
					markerCount < 1 ||
					markerCount !== closingCount ||
					generated.resolution.memberOrthographies.length !==
						markerCount
				) {
					throw new Error(
						"Member orthographies must align one-to-one with TARGET markers.",
					);
				}
			},
		},
		projectOutput(_input, generated): GrammaticalResolution {
			if (generated.decision === "Unresolved") {
				return { decision: "Unresolved" };
			}
			if (generated.resolution === null) {
				throw new Error("Resolved grammar requires a resolution.");
			}
			const resolution = generated.resolution;

			const lemma = lemmaSchema.parse({
				...resolution.lemma,
				language: "de",
				family,
				kind,
			});
			const linkedSurface = (
				resolution.surface.surfaceKind === "Inflection" &&
				inflectionSchema
					? inflectionSchema
					: citationSchema
			).parse({
				...resolution.surface,
				language: "de",
				lemma,
			});
			const { lemma: _linkedLemma, ...surface } = linkedSurface;

			return {
				decision: "Resolved",
				memberOrthographies: resolution.memberOrthographies,
				surface,
				lemma,
			} as unknown as GrammaticalResolution;
		},
		generationParams: { model: "gpt-5-nano", maxOutputTokens: 1024 },
	} satisfies Prompt<
		typeof inputSchema,
		typeof outputSchema,
		GrammaticalResolution
	>;
}
