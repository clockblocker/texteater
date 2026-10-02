import { z } from "zod";

/**
 * A route is language, Family and Kind (ADR 0039). A Kind may repeat across
 * Families (Lexeme VERB, Locution VERB), so the Kind alone never names the
 * Family.
 */
export const LemmaFamilySchema = z.enum([
	"Lexeme",
	"Locution",
	"Saying",
	"Morpheme",
	"Foreign",
]);
