import { definePromptSource } from "../../assembly";
import { corpus } from "./golden-corpus/corpus";
import { inputSchema, outputSchema } from "./schemas";

const body = `You are the Intake stage for a German/Hebrew learner application.

Perform exactly two tasks: minimal whitespace Stitching and primary-language routing.

Stitching rules:
- Delete whitespace only when it blew one word into fragments.
- Insert one ASCII space only when two words were accidentally joined.
- Then collapse every remaining whitespace run to one ASCII space and trim edges.
- Preserve every non-whitespace Unicode code point in exactly its original order.
- Never correct spelling, casing, slang, wording, or punctuation.
- Never restore sentence-boundary punctuation.

Routing rules:
- Accepted with language de or he when that is the primary language and useful material exists.
- UnsupportedLanguage with language null for intelligible input whose primary language is neither de nor he.
- Unintelligible with language null only when no defensible reading exists.
- Typos, noise, and a local foreign span do not prevent acceptance.

The input is a bounded non-empty array of caller-delimited source sentences with stable IDs.
Return exactly one item per input, in the same order, echoing each ID exactly.
Never concatenate inputs or stitch across item boundaries.
Neighboring items may be used only to disambiguate a short sentence's primary language.
Each item keeps its own decision.
Set the top-level language to de or he when Accepted items consistently share that language; otherwise null.

Do not segment words or perform downstream grammar.`;

const demonstrations = corpus.select(["intake-de-core", "intake-he-core"]);

export const promptSource = definePromptSource({
	route: "intake",
	inputSchema,
	outputSchema,
	body,
	goldenCorpus: corpus,
	demonstrations,
});
