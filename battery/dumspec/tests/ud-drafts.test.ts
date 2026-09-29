import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { readConllu } from "../scripts/ud-drafts/conllu.js";
import {
	type DraftRecordFile,
	draftRecord,
	slugOf,
} from "../scripts/ud-drafts/draft.js";
import { checkRecord } from "../src/check-record.js";

const sentences = readConllu(
	readFileSync(new URL("fixtures/ud-draft.conllu", import.meta.url), "utf8"),
);
const source = {
	work: "Fixture",
	author: "Nobody",
	year: 1900,
	reference: {
		title: "A hand-made CoNLL-U fixture",
		url: "https://example.org/fixture",
		supports: "The sentence.",
	},
};
const drafts = sentences.map((sentence) =>
	draftRecord(sentence, source, "Stanza 0.0.0"),
);

function draft(index: number): DraftRecordFile {
	const found = drafts[index];
	if (!found) throw Error(`No draft ${index}`);
	return found;
}

/** Each target as its members' Segment texts and its route. */
function targets(file: DraftRecordFile) {
	return file.targets.map(({ memberSegmentIndices, attestation }) => {
		const { lemma } = (attestation.surface as { lemma: Json }) ?? {};
		return {
			members: memberSegmentIndices.map(
				(index) => file.segments[index]?.text,
			),
			route: `${lemma?.family}/${lemma?.kind} ${lemma?.canonicalForm}`,
		};
	});
}
type Json = Record<string, unknown>;

function target(file: DraftRecordFile, members: string) {
	const found = file.targets.find(
		({ memberSegmentIndices }) =>
			memberSegmentIndices
				.map((index) => file.segments[index]?.text)
				.join(" ") === members,
	);
	if (!found) throw Error(`No target over ${members}`);
	const surface = found.attestation.surface as Json & { lemma: Json };
	return { ...found, surface, lemma: surface.lemma };
}

describe("readConllu", () => {
	test("reads comments, words and multiword tokens", () => {
		const [first] = sentences;
		expect(sentences).toHaveLength(5);
		expect(first?.comments.parser).toBe("Stanza 0.0.0 (hand-made fixture)");
		expect(first?.text).toBe("Gestern hat sich Anna im Wald umgesehen.");
		expect(
			first?.tokens.map((token) => [
				token.form,
				token.words.map((word) => word.form),
			]),
		).toContainEqual(["im", ["in", "dem"]]);
		expect(
			first?.words.find((word) => word.form === "sich")?.feats,
		).toEqual({ Case: "Acc", Person: "3", PronType: "Prs", Reflex: "Yes" });
	});

	test("rejects a row without ten columns", () => {
		expect(() => readConllu("# text = a\n1\ta\ta\n")).toThrow();
	});
});

describe("draftRecord", () => {
	test("drafts Full, Draft, Quoted records every check accepts", () => {
		for (const [index, file] of drafts.entries()) {
			expect(file.coverage).toBe("Full");
			expect(file.status).toBe("Draft");
			expect(file.provenance).toEqual({
				kind: "Quoted",
				work: "Fixture",
				author: "Nobody",
				year: 1900,
			});
			for (const { notes } of file.targets)
				expect(notes.rationale).toStartWith(
					"Drafted from a UD parse (Stanza 0.0.0)",
				);
			const checked = checkRecord(`de/fixture-${index}`, file);
			expect(checked.success ? [] : checked.issues).toEqual([]);
		}
	});

	test("splits a fused word and gives its article to the noun", () => {
		const file = draft(0);
		expect(file.segments.map((segment) => segment.text).join("|")).toBe(
			"Gestern| |hat| |sich| |Anna| |i|m| |Wald| |umgesehen|.",
		);
		expect(file.segments[8]).toEqual({
			kind: "ResolvableText",
			text: "i",
			surface: "in",
		});
		const wald = target(file, "m Wald");
		expect(wald.attestation.articleEvidence).toEqual({
			kind: "Owned",
			member: 0,
		});
		expect(target(file, "i").attestation.valencyEvidence).toEqual([
			{
				member: null,
				complement: { kind: "Case", case: "Dat", referent: "Either" },
				realizedCase: "Dat",
			},
		]);
		expect(file.sources.rules.map(({ rule }) => rule)).toContain(
			"de/fused-word-pieces",
		);
	});

	test("joins the auxiliary, the inherent reflexive and the particle to the verb", () => {
		const verb = target(draft(0), "hat sich umgesehen");
		expect(verb.lemma).toMatchObject({
			kind: "VERB",
			canonicalForm: "sich umsehen",
			coreFeatures: {
				hasSepPrefix: "um",
				lexicallyReflexive: "Yes",
				verbType: null,
			},
		});
		expect(verb.surface.inflectionalFeatures).toMatchObject({
			tense: "Pres",
			perfect: "Yes",
		});
		expect(verb.notes.rationale).toContain("expl:pv");
		const fing = target(draft(1), "fing an");
		expect(fing.lemma).toMatchObject({
			canonicalForm: "anfangen",
			coreFeatures: { hasSepPrefix: "an" },
		});
	});

	test("keeps a modal apart from its infinitive and flags es", () => {
		const file = draft(1);
		expect(target(file, "wollte").lemma).toMatchObject({
			kind: "VERB",
			canonicalForm: "wollen",
			coreFeatures: { verbType: "Mod" },
		});
		expect(target(file, "sehen").lemma).toMatchObject({ kind: "VERB" });
		expect(target(file, "es").notes.rationale).toContain(
			"de/expletive-es-joins-its-verb",
		);
	});

	test("keeps am before a superlative whole and drafts the passive", () => {
		const file = draft(2);
		expect(targets(file)).toEqual([
			{ members: ["Das", "Buch"], route: "Lexeme/NOUN Buch" },
			{ members: ["wurde", "gelesen"], route: "Lexeme/VERB lesen" },
			{ members: ["am", "schnellsten"], route: "Lexeme/ADJ schnell" },
		]);
		expect(
			target(file, "am schnellsten").surface.inflectionalFeatures,
		).toEqual({ case: null, degree: "Sup", gender: null, number: null });
		expect(
			target(file, "wurde gelesen").surface.inflectionalFeatures,
		).toMatchObject({ voice: "Pass", passive: "Process" });
	});

	test("flags fixed units and titles, and joins a correlator", () => {
		const file = draft(3);
		expect(targets(file)).toEqual([
			{ members: ["Herr"], route: "Lexeme/NOUN Herr" },
			{ members: ["Müller"], route: "Lexeme/PROPN Müller" },
			{ members: ["lacht"], route: "Lexeme/VERB lachen" },
			{ members: ["vor", "allem"], route: "Locution/ADP vor allem" },
			{ members: ["ohne", "zu"], route: "Locution/SCONJ ohne … zu" },
			{ members: ["grüßen"], route: "Lexeme/VERB grüßen" },
		]);
		expect(target(file, "vor allem").notes.rationale).toContain(
			"candidate Locution",
		);
		expect(target(file, "Herr").notes.rationale).toContain(
			"de/title-before-a-name",
		);
	});

	test("says so when an auxiliary finds no verb", () => {
		const hat = target(draft(4), "hat");
		expect(hat.lemma).toMatchObject({
			kind: "AUX",
			canonicalForm: "haben",
		});
		expect(hat.notes.rationale).toContain("Auxiliary with no verb found");
	});
});

test("slugOf names a record by its first words in ASCII", () => {
	expect(slugOf("Jemand mußte Josef K. verleumdet haben.")).toBe(
		"jemand-musste-josef-k-verleumdet-haben",
	);
});
