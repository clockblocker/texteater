import { expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { loadSpecRecords } from "dumspec";
import {
	projectGrammarCases,
	readGrammarSidecar,
} from "../codegen/project-grammar-cases.js";
import { grammarPromptRoutes } from "../src/generated/prompts.js";

const stage = new URL(
	"../src/concrete-lang/de/grammatical-resolution/",
	import.meta.url,
);
const slicesByRoute: Record<string, Record<string, string>> = {
	"lexeme/adjective": {
		participles: "participleCaseIds",
		governed: "governedCaseIds",
	},
	"lexeme/noun": { governed: "governedCaseIds" },
	"phraseme/collocation": { governed: "governedCaseIds" },
	"lexeme/pronoun": { "referent-context": "referentContextCaseIds" },
};
/**
 * Cases whose target a docs or seed record already held: the rationale is the
 * record's, or the record's folded into the case's explanation.
 */
const sharedRationales = new Set([
	"grammar-de-adp-fused-piece-i",
	"grammar-de-verb-separable-imperative-aufpassen",
	"grammar-de-verb-infinitive-hinauszulaufen",
	"grammar-de-verb-reflexive-erinnert",
	"grammar-de-verb-passive-wurde-gebeten",
	"grammar-de-adj-participle-attributive-gekochten",
	"grammar-de-adj-participle-attributive-bewunderte",
	"grammar-de-adj-participle-state-passive-geschlossen",
	"grammar-de-adj-governed-stolz-auf",
	"grammar-de-propn-regression-bare-name-altes-berlin",
	"grammar-de-intj-demo-pfui-expressive",
	"grammar-de-intj-dev-wupp-onomatopoeia",
	"grammar-de-propn-regression-owned-article-struwwelpeter",
]);
/** Cases now marked in the quoted verse, which breaks the line where they had a space. */
const verseLineBreaks = new Set([
	"grammar-de-intj-demo-pfui-expressive",
	"grammar-de-intj-dev-wupp-onomatopoeia",
	"grammar-de-propn-regression-owned-article-struwwelpeter",
]);
const spaced = (value: unknown) =>
	JSON.parse(JSON.stringify(value).replaceAll("\\n", " "));

test("Spec Records and sidecars project every retained grammar case unchanged", async () => {
	const records = loadSpecRecords();
	let count = 0;
	for (const experiment of Object.values(grammarPromptRoutes)) {
		const directory = experiment.replace("grammatical-resolution/de/", "");
		const url = new URL(`${directory}/`, stage);
		let old: Record<string, Record<string, unknown>>;
		try {
			old = JSON.parse(readFileSync(new URL("corpus.json", url), "utf8"));
		} catch {
			continue;
		}
		const projected = projectGrammarCases(readGrammarSidecar(url), records);
		const { corpusSource } = await import(
			new URL("corpus.ts", url).pathname
		);
		const ids = await import(new URL("evaluation-ids.ts", url).pathname);
		expect(Object.keys(projected.cases).toSorted()).toEqual(
			Object.keys(old).toSorted(),
		);
		for (const [id, golden] of Object.entries(old)) {
			const { explanation, ...rest } = projected.cases[id] ?? {};
			const { explanation: oldExplanation, ...oldRest } = golden;
			expect(
				verseLineBreaks.has(id) ? spaced({ id, ...rest }) : { id, ...rest },
			).toEqual({ id, ...oldRest });
			if (verseLineBreaks.has(id))
				expect({ id, ...rest }).not.toEqual({ id, ...oldRest });
			if (!sharedRationales.has(id))
				expect({ id, explanation }).toEqual({
					id,
					explanation: oldExplanation as string | undefined,
				});
			count++;
		}
		expect(projected.demonstrationIds).toEqual([
			...corpusSource.demonstrations.ids,
		]);
		expect(projected.evaluationCaseIds).toEqual([...ids.evaluationCaseIds]);
		expect(projected.slices).toEqual(
			Object.fromEntries(
				Object.entries(slicesByRoute[directory] ?? {}).map(
					([name, list]) => [name, [...ids[list]]],
				),
			),
		);
	}
	expect(count).toBe(1108);
});
