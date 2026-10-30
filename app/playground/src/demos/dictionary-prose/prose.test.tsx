import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { wordsOf } from "@/fixtures";
import { type LemmaId, lemmas, proseCases } from "./cases";
import { defaultProseOptions, Prose, type ProseOptions } from "./prose";

const caseOf = (id: "hard" | "simple") => {
	const found = proseCases.find((each) => each.id === id);
	if (!found) throw new Error(`no ${id} case`);
	return found;
};
const text = (id: "hard" | "simple", options: Partial<ProseOptions> = {}) =>
	renderToStaticMarkup(
		<Prose
			prose={caseOf(id)}
			options={{ ...defaultProseOptions, ...options }}
			onLemma={() => {}}
		/>,
	)
		.replace(/<[^>]+>/g, "")
		.replaceAll("&#x27;", "'");

describe("dictionary-prose cases", () => {
	test("every line is about words of the clicked unit, and links a lemma", () => {
		for (const prose of proseCases) {
			const clicked = wordsOf(prose.text).find(
				(word) => word.text === prose.clicked,
			);
			const unit = wordsOf(prose.text)
				.filter((word) =>
					clicked?.unitId
						? word.unitId === clicked.unitId
						: word === clicked,
				)
				.map((word) => word.text)
				.join(" ");
			expect(unit).toBe(prose.surface.title);
			for (const line of prose.lines) {
				expect(unit).toContain(line.word);
				const links = line.formOf.filter(
					(run): run is { readonly link: LemmaId } =>
						typeof run === "object" && "link" in run,
				);
				expect(links.length).toBe(1);
				for (const { link } of links)
					expect(lemmas[link]).toBeDefined();
			}
		}
	});

	test("the hard case reads as en.wiktionary's form-of lines", () => {
		const shown = text("hard");
		expect(shown).toContain("third-person singular preterite of haben");
		expect(shown).toContain("pronominal adverb of mit");
		expect(shown).toContain("indicative");
		expect(shown).toContain("mit jM zu tun haben");
		expect(shown).not.toContain("subjunctive hätte,");
	});

	test("the simple case is Wiktionary's own line", () => {
		expect(text("simple")).toContain("dative plural of Kind");
	});

	test("the knobs change the words, not the facts", () => {
		expect(text("hard", { terms: "de" })).toContain(
			"3. Person Singular Präteritum of haben",
		);
		expect(text("hard", { unchanged: false })).not.toContain(
			"zu-infinitive",
		);
		expect(text("hard", { brief: true })).not.toContain("stands second");
		expect(text("hard", { layout: "paragraph" })).toContain(
			"hatte is the third-person singular preterite of haben.",
		);
	});
});
