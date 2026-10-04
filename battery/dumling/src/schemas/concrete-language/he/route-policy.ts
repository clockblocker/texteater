import { z } from "zod";
import {
	caselessValencyAttestationError,
	hebrewArticleAttestationError,
	isCaselessValencyAttestation,
	isHebrewArticleAttestation,
} from "../../../validation/semantics.js";
import { routePolicy } from "../../route-policy.js";
import {
	indexSchema,
	plainLemmaSchema,
	referentSchema,
} from "../../unit-parts.js";
import { HeAdpositionFeatureBagsSchema } from "./lexeme/adposition.js";

/**
 * Hebrew valency complements (ADR 0034), marked by function and preposition
 * with no case: the subject, the direct object, or a governed preposition's
 * ADP Lemma (`סמך על`).
 */
const hebrewComplementSchema = z.union([
	z.strictObject({ kind: z.literal("Subject"), referent: referentSchema }),
	z.strictObject({
		kind: z.literal("DirectObject"),
		referent: referentSchema,
	}),
	z.strictObject({
		kind: z.literal("Preposition"),
		preposition: plainLemmaSchema(
			{ language: "he", family: "Lexeme", kind: "ADP" },
			HeAdpositionFeatureBagsSchema.shape.core,
		),
		referent: referentSchema,
	}),
]);

/**
 * The Hebrew valency slots one occurrence realizes, indexed like German
 * evidence. Hebrew marks no case, so a slot records no realized case.
 */
const hebrewValencyEvidenceSchema = z.array(
	z.strictObject({
		member: indexSchema.nullable(),
		complement: hebrewComplementSchema,
	}),
);

/**
 * Hebrew's route conditions. A noun, proper noun or adjective names where its
 * article is attested (ADR 0035, ADR 0040), and only a `Def` form, or a proper
 * noun cited with its article, names one. A governor (VERB, ADJ, NOUN) may
 * name the valency slots it realizes, with no case (ADR 0034).
 */
export const heRoutePolicy = routePolicy("he", {
	conditions: {
		foreign: ["he/Foreign/Foreign"],
		lexemeArticleOwner: [
			"he/Lexeme/NOUN",
			"he/Lexeme/PROPN",
			"he/Lexeme/ADJ",
		],
		hebrewDefiniteArticle: [
			"he/Lexeme/NOUN",
			"he/Lexeme/PROPN",
			"he/Lexeme/ADJ",
		],
		hebrewGovernor: ["he/Lexeme/VERB", "he/Lexeme/ADJ", "he/Lexeme/NOUN"],
	},
	surfaceChecks: [],
	attestationChecks: [
		[
			"hebrewDefiniteArticle",
			isHebrewArticleAttestation,
			hebrewArticleAttestationError,
		],
		[
			"hebrewGovernor",
			isCaselessValencyAttestation,
			caselessValencyAttestationError,
		],
	],
	attestationEvidence: {
		valencyEvidence: {
			hebrewGovernor: hebrewValencyEvidenceSchema.optional(),
		},
	},
});
