import type { Segment } from "../../src/segment/segmented-sentence.js";
import { fakeLuna } from "./support.js";

export const word = (text: string, surface?: string): Segment => ({
	kind: "ResolvableText",
	text,
	...(surface === undefined ? {} : { surface }),
});
export const space: Segment = { kind: "Whitespace", text: " " };
export const stop: Segment = { kind: "Punctuation", text: "." };

/**
 * Luna writing `canonicalForm` and the members as attested. For a
 * Locution or Saying it ties each word of the form to the member, or run
 * of members, that spells it, a finite verb citing its infinitive last.
 */
export const writes = (canonicalForm: string, members?: readonly string[]) =>
	fakeLuna(({ members: sent }) => {
		const spelled = members ?? sent.map(({ text }) => text);
		const used = new Set<number>();
		// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: complexity baseline (#994): decompose to remove
		const words = canonicalForm.split(" ").flatMap((word) => {
			for (let start = 0; start < spelled.length; start++) {
				let joined = "";
				for (let end = start; end < spelled.length; end++) {
					if (used.has(end)) break;
					joined += spelled[end];
					if (joined.toLowerCase() === word.toLowerCase()) {
						const run = Array.from(
							{ length: end - start + 1 },
							(_, offset) => start + offset,
						);
						for (const position of run) used.add(position);
						return run.map((position) => ({
							member: `m${position}`,
							text: "",
							comma: false,
						}));
					}
				}
			}
			const spare = spelled.findIndex(
				(_, position) => !used.has(position),
			);
			if (spare >= 0) used.add(spare);
			return [
				{
					member: spare >= 0 ? `m${spare}` : "",
					text: word,
					comma: false,
				},
			];
		});
		return { canonicalForm, words, members: spelled };
	});
