import { z } from "zod";
import {
	caselessValencyAttestationError,
	isCaselessValencyAttestation,
} from "../../../validation/semantics.js";
import { routePolicy } from "../../route-policy.js";
import {
	indexSchema,
	plainLemmaSchema,
	referentSchema,
} from "../../unit-parts.js";
import { EnAdpositionFeatureBagsSchema } from "./lexeme/adposition.js";

/**
 * English valency complements (ADR 0034), marked by position and preposition
 * with no case: the subject, the direct object, the indirect object (`him` in
 * `give him a book`), or a governed preposition's ADP Lemma (`depend on`).
 */
const englishComplementSchema = z.union([
	z.strictObject({ kind: z.literal("Subject"), referent: referentSchema }),
	z.strictObject({
		kind: z.literal("DirectObject"),
		referent: referentSchema,
	}),
	z.strictObject({
		kind: z.literal("IndirectObject"),
		referent: referentSchema,
	}),
	z.strictObject({
		kind: z.literal("Preposition"),
		preposition: plainLemmaSchema(
			{ language: "en", family: "Lexeme", kind: "ADP" },
			EnAdpositionFeatureBagsSchema.shape.core,
		),
		referent: referentSchema,
	}),
]);

/**
 * The English valency slots one occurrence realizes, indexed like German
 * evidence. English marks no case, so a slot records no realized case.
 */
const englishValencyEvidenceSchema = z.array(
	z.strictObject({
		member: indexSchema.nullable(),
		complement: englishComplementSchema,
	}),
);

/**
 * English's route conditions. Its Heads that can open a phrase, and a NOUN
 * Locution, own their article (ADR 0040, amended 2026-10-02). A governor (a
 * Lexeme or Locution VERB, ADJ or NOUN) may name the valency slots it
 * realizes, with no case (ADR 0034).
 */
export const enRoutePolicy = routePolicy("en", {
	conditions: {
		foreign: ["en/Foreign/Foreign"],
		lexemeArticleOwner: [
			"en/Lexeme/NOUN",
			"en/Lexeme/PROPN",
			"en/Lexeme/ADJ",
			"en/Lexeme/NUM",
			"en/Lexeme/PRON",
		],
		locutionArticleOwner: ["en/Locution/NOUN"],
		englishGovernor: [
			"en/Lexeme/VERB",
			"en/Lexeme/ADJ",
			"en/Lexeme/NOUN",
			"en/Locution/VERB",
			"en/Locution/NOUN",
		],
		// Comparability decides Degree on ADV and ADJ (ADR 0042).
		comparability: ["en/Lexeme/ADV", "en/Lexeme/ADJ", "en/Locution/ADV"],
	},
	surfaceChecks: [],
	attestationChecks: [
		[
			"englishGovernor",
			isCaselessValencyAttestation,
			caselessValencyAttestationError,
		],
	],
	attestationEvidence: {
		valencyEvidence: {
			englishGovernor: englishValencyEvidenceSchema.optional(),
		},
	},
});
