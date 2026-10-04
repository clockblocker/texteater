import { describe, expect, test } from "bun:test";
import { defineExperiment, definePromptSource } from "promptsmith";
import { goldOf, type Sidecar } from "../../src/evaluation/spec-corpus/gold.js";
import {
	projectCorpus,
	sameInputReason,
} from "../../src/evaluation/spec-corpus/projection.js";
import {
	segmentInUnits,
	segmentInUnitsRoute,
} from "../../src/evaluation/spec-corpus/segment-in-units.js";
import { emptySidecar, specRecord } from "./fixtures.js";

// "Nora hat bereits gegessen." → Nora 0, hat 2, bereits 4, gegessen 6, "." 7
const nora = specRecord({
	id: "de/nora-hat-bereits-gegessen",
	sentence: "Nora hat bereits gegessen.",
	targets: [
		[[2, 6], "Lexeme", "VERB"],
		[[0], "Lexeme", "PROPN"],
	],
});
// "Er sagt qzxv." → Er 0, sagt 2, qzxv 4
const qzxv = specRecord({
	id: "de/er-sagt-qzxv",
	sentence: "Er sagt qzxv.",
	targets: [
		[[0], "Lexeme", "PRON"],
		[[2], "Lexeme", "VERB"],
	],
	noTarget: [[4]],
	coverage: "Full",
	reviewDepth: undefined,
});
// "Der Blarg schläft." → Der 0, Blarg 2, schläft 4: a nonce noun's No Target
// holds its article too.
const blarg = specRecord({
	id: "de/der-blarg-schlaeft",
	sentence: "Der Blarg schläft.",
	targets: [[[4], "Lexeme", "VERB"]],
	noTarget: [[0, 2]],
	coverage: "Full",
});
const draft = specRecord({
	id: "de/sie-geht",
	sentence: "Sie geht.",
	targets: [[[2], "Lexeme", "VERB"]],
	reviewDepth: undefined,
});
const excluded = specRecord({
	id: "de/er-kommt",
	sentence: "Er kommt.",
	targets: [[[2], "Lexeme", "VERB"]],
});
// Reviewed through a deeper layer, so Reviewed for segment.inUnits too.
const other = specRecord({
	id: "de/wir-lachen",
	sentence: "Wir lachen.",
	targets: [[[2], "Lexeme", "VERB"]],
	reviewDepth: "Reading",
});
const english = specRecord({
	id: "en/she-left",
	sentence: "She left.",
	targets: [[[2], "Lexeme", "VERB"]],
	language: "en",
});
const empty = specRecord({
	id: "de/leer",
	sentence: "Leer.",
	targets: [],
	reviewDepth: undefined,
});

const sidecar: Sidecar = {
	slices: {
		verbs: {
			description: "Sentences with a verb target",
			records: [nora.id, draft.id],
		},
	},
	explanations: {
		[segmentInUnitsRoute]: {
			[nora.id]: "The auxiliary joins the verb it serves.",
		},
	},
	exclusions: {
		[excluded.id]: { reason: "Waits on a grilling", issue: 1 },
	},
};

function project(
	records = [nora, qzxv, draft, excluded, other, english],
	withSidecar = sidecar,
) {
	return projectCorpus(
		segmentInUnits,
		goldOf({ records, sidecar: withSidecar }),
	);
}

describe("the segment.inUnits projection", () => {
	test("makes one case per record: its Segments in, its units out", () => {
		const { corpus, origins, facts } = project();
		expect(corpus.route).toBe("segment-in-units/de");
		const nora_ = corpus.cases[nora.id];
		expect(nora_?.input.segments.map(({ text }) => text).join("")).toBe(
			nora.sentence,
		);
		expect(nora_?.idealOutput.units).toEqual([
			{
				segments: [0],
				route: { language: "de", family: "Lexeme", kind: "PROPN" },
			},
			{
				segments: [2, 6],
				route: { language: "de", family: "Lexeme", kind: "VERB" },
			},
		]);
		expect(facts[nora.id]).toEqual({
			coverage: "Partial",
			sources: [{ target: 1 }, { target: 0 }],
		});
		expect(nora_?.contaminationKeys).toEqual([nora.id]);
		expect(nora_?.explanation).toBe(
			"The auxiliary joins the verb it serves.",
		);
		expect(origins[nora.id]).toEqual({
			record: nora.id,
			status: "Reviewed",
		});
	});

	test("turns a No Target entry into an Unresolved unit", () => {
		const { corpus, facts } = project();
		expect(corpus.cases[qzxv.id]?.idealOutput.units.at(-1)).toEqual({
			segments: [4],
			route: "Unresolved",
		});
		expect(facts[qzxv.id]?.sources.at(-1)).toEqual({ noTarget: 0 });
	});

	test("keeps a No Target entry over several Segments one Unresolved unit", () => {
		const { corpus, facts } = project([blarg], emptySidecar);
		expect(corpus.cases[blarg.id]?.idealOutput.units).toEqual([
			{ segments: [0, 2], route: "Unresolved" },
			{
				segments: [4],
				route: { language: "de", family: "Lexeme", kind: "VERB" },
			},
		]);
		expect(facts[blarg.id]?.sources).toEqual([
			{ noTarget: 0 },
			{ target: 0 },
		]);
	});

	test("groups cases by review through Segmentation and leaves other languages out", () => {
		const projected = project();
		expect(projected.reviewed.ids).toEqual([
			nora.id,
			excluded.id,
			other.id,
		]);
		expect(projected.draft.ids).toEqual([qzxv.id, draft.id]);
		expect(projected.corpus.groups.dumcorpus?.Reviewed?.ids).toEqual(
			projected.reviewed.ids,
		);
		expect(projected.excluded.ids).toEqual([excluded.id]);
		expect(projected.slices.verbs?.ids).toEqual([nora.id, draft.id]);
		expect(projected.skipped).toEqual([]);
	});

	test("reports a record that annotates nothing as a skip", () => {
		expect(project([nora, empty], emptySidecar).skipped).toEqual([
			{
				record: empty.id,
				status: "Draft",
				reason: "Annotates no Segment",
			},
		]);
	});

	test("keeps one of two records with the same input, preferring one it does not exclude", () => {
		const twin = { ...excluded, id: "de/er-kommt-2" };
		const { corpus, skipped } = project([excluded, twin], {
			...emptySidecar,
			exclusions: sidecar.exclusions,
		});
		expect(Object.keys(corpus.cases)).toEqual([twin.id]);
		expect(skipped).toEqual([
			{
				record: excluded.id,
				status: "Reviewed",
				reason: sameInputReason,
				sameInputAs: twin.id,
			},
		]);
	});

	test("tests on Reviewed − demonstrations − excluded, which defineExperiment accepts", () => {
		const projected = project();
		const demonstrations = projected.corpus.select([nora.id, draft.id]);
		const tests = projected.testSet(demonstrations);
		expect(tests.ids).toEqual([other.id]);
		expect(projected.testSet(demonstrations, [other.id]).ids).toEqual([]);
		expect(projected.recordsOf(demonstrations)).toEqual([
			nora.id,
			draft.id,
		]);
		const promptSource = definePromptSource({
			route: projected.corpus.route,
			inputSchema: projected.corpus.inputSchema,
			outputSchema: projected.corpus.outputSchema,
			body: "Segment the text.",
			goldenCorpus: projected.corpus,
			demonstrations,
		});
		expect(
			defineExperiment({
				promptSource,
				evaluation: tests,
				evaluator: () => ({}),
			}).evaluation.ids,
		).toEqual([other.id]);
		expect(() =>
			defineExperiment({
				promptSource,
				evaluation: projected.reviewed,
				evaluator: () => ({}),
			}),
		).toThrow(/contamination/u);
	});

	test("rejects a sidecar that explains a case the corpus lacks", () => {
		expect(() =>
			projectCorpus(
				segmentInUnits,
				goldOf({
					records: [nora],
					sidecar: {
						...emptySidecar,
						explanations: {
							[segmentInUnitsRoute]: { [other.id]: "Why" },
						},
					},
				}),
			),
		).toThrow(/explains cases/u);
	});
});

test("the gold rejects a sidecar naming a record that does not exist", () => {
	expect(() =>
		goldOf({
			records: [nora],
			unloaded: [{ record: draft.id, checks: ["Coverage"] }],
			sidecar: {
				...emptySidecar,
				exclusions: {
					[draft.id]: { reason: "Not loaded, still known" },
					"de/missing": { reason: "Renamed" },
				},
			},
		}),
	).toThrow("de/missing");
});
