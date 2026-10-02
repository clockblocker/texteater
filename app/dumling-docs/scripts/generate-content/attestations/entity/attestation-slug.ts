import { createHash } from "node:crypto";

/** An opaque, filesystem-safe slug for one record target's sentence. */
export function attestationSlugForSource(source: {
	sentenceMarkdown: string;
}): string {
	const occurrenceKey = JSON.stringify({
		sentenceMarkdown: source.sentenceMarkdown,
	});
	const digest = createHash("sha256")
		.update(occurrenceKey)
		.digest("base64url");
	return `sha256-${digest}`;
}
