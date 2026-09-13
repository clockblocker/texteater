import type { Expect } from "common-utils";
import type { z } from "zod";
import type { readingKnowledgeSchema } from "../../src/schemas.js";
import type { ReadingKnowledge } from "../../src/types.js";

type CanonicalKnowledge = z.output<typeof readingKnowledgeSchema>;
// Strict empty objects are emitted as Record<string, never>, narrower than
// Zod's inferred {}. Every generated value must still satisfy the schema type.
type _GeneratedKnowledgeIsCanonical = Expect<
	ReadingKnowledge extends CanonicalKnowledge ? true : false
>;
