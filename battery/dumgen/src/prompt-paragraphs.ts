/**
 * The registry each prompt module keeps of the paragraphs it sends (ADR
 * 0037, #695): every paragraph is one line, has a name of its own in its
 * registry, and cites the dumcorpus Rules it states at the statement hash
 * it was last checked against. dumcorpus's `checkPromptCitations` reads the
 * registry back, and the disjointness tests (#693) read the German examples
 * the paragraphs quote «…».
 */
import type { CitingPrompt } from "dumcorpus/types";

/** A cited Rule, at the statement hash its paragraph was checked against. */
export type Cite = readonly [rule: string, hash: string];

type Paragraph = {
	readonly name: string;
	readonly text: string;
	readonly cites: readonly Cite[];
};

/** A registry whose paragraphs dumcorpus reads under `prompt/<name>`. */
export function paragraphRegistry(prompt: string) {
	const registry: Paragraph[] = [];
	return {
		/** Registers one paragraph and returns its text. */
		paragraph(name: string, text: string, ...cites: Cite[]): string {
			if (text.includes("\n"))
				throw Error(`${name} is more than one paragraph`);
			if (registry.some((entry) => entry.name === name))
				throw Error(`${name} is registered twice`);
			registry.push({ name, text, cites });
			return text;
		},
		/** Every registered paragraph, as dumcorpus's citation check reads it. */
		texts(): readonly CitingPrompt[] {
			return registry.map(({ name, text, cites }) => ({
				name: `${prompt}/${name}`,
				text,
				paragraphs: [
					{
						opens: text.slice(0, 32),
						implements: cites.map(([rule, hash]) => ({
							rule,
							hash,
						})),
					},
				],
			}));
		},
		/** Every registered paragraph's text. */
		paragraphs(): readonly string[] {
			return registry.map(({ text }) => text);
		},
		/**
		 * The German examples quoted «…» in the paragraphs whose name `keep`
		 * accepts, every paragraph by default, «…» stripped, each as written.
		 */
		examples(
			keep: (name: string) => boolean = () => true,
		): readonly string[] {
			return registry
				.filter(({ name }) => keep(name))
				.flatMap(({ text }) =>
					[...text.matchAll(/«([^»]+)»/gu)].map(
						([, example]) => example ?? "",
					),
				);
		},
	};
}
