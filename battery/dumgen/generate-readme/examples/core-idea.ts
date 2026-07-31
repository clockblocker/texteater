// README_BLOCK:basic-usage:start
import { buildDumgen } from "dumgen";

// Server-side only. The OpenAI SDK reads OPENAI_API_KEY from the environment.
const generate = buildDumgen();

const readingDraft = await generate.production.reading.de.noun.draft({
	language: "de",
	canonicalForm: "Bank",
	family: "Lexeme",
	kind: "NOUN",
	coreFeatures: {
		gender: "Fem",
		hyph: null,
	},
});
// README_BLOCK:basic-usage:end
