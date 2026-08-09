// README_BLOCK:basic-usage:start
import { buildDumgen } from "dumgen";

// Server-side only. The OpenAI SDK reads OPENAI_API_KEY from the environment.
const dumgen = buildDumgen();

const segmented = await dumgen.segment(["Die Bank ist geöffnet."]);

const decision = segmented.ok ? segmented.value[0] : undefined;
if (decision?.decision === "Accepted" && decision.language === "de") {
	const grammatical = await dumgen.resolve.grammatical("de", {
		sentence: decision.sentence,
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
