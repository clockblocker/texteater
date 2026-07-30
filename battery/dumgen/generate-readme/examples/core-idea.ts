// README_BLOCK:basic-usage:start
import { buildDumgen } from "dumgen";

// Server-side only. The OpenAI SDK reads OPENAI_API_KEY from the environment.
const generate = buildDumgen();

const semanticIdentity =
	await generate.production.noteBlock.de.noun.features({
		canonicalLemma: "bank",
		descriptor: {
			language: "de",
			lemmaKind: "Lexeme",
			lemmaSubKind: "NOUN",
		},
	});
// README_BLOCK:basic-usage:end
