// README_BLOCK:basic-usage:start
import { buildDumgen, createOpenAIPromptExecutor } from "dumgen";

// Server-side only. The OpenAI SDK reads OPENAI_API_KEY from the environment.
const dumgen = buildDumgen(createOpenAIPromptExecutor());

const classification = await dumgen.de.classify(
	"Sie sitzt am Ufer auf der Bank.",
	"Bank",
);
// README_BLOCK:basic-usage:end
