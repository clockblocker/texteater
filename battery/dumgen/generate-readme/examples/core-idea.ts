// README_BLOCK:basic-usage:start
import { buildDumgen } from "dumgen";

// Server-side only. The OpenAI SDK reads OPENAI_API_KEY from the environment.
const dumgen = buildDumgen();

const segmented = await dumgen.segment("Die Bank ist geöffnet.");

if (segmented.outcome === "Segmented") {
	const grammatical = await dumgen.resolve.grammatical("de", {
		sentence: segmented.sentence,
		clickedSegmentIndex: 2,
	});

	if (grammatical.decision === "Resolved") {
		const reading = await dumgen.resolve.reading("de", {
			markedContext: grammatical.markedContext,
			lemma: grammatical.attestation.surface.lemma.canonicalForm,
			existingEmojiDescriptions: [],
		});
		console.log(reading);
	}
}
// README_BLOCK:basic-usage:end
