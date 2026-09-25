/**
 * Writes the playground fixtures: the fixed sentences in `fixtures/sentences.ts`
 * run through the production `analyzeSentence` operation (Dumgen ADR 0006)
 * and emitted with their two-layer gold, scored by the production scorer.
 *
 *   zsh -ic 'bun prototypes/intake/fixtures.ts ../../app/tf-demo/src/playground/entries/lattice/lattice.json'
 *
 * The argument is the output path. The tf-demo playground entry `lattice`
 * owns that file and imports it. The DTO and the Resolution Selector
 * are the package's own (`dumgen` and `dumgen/types`); nothing here is a
 * prototype of the design any more, only a way to look at it.
 */
import { Effect } from "effect";
import { createTypeSafeExecutor } from "promptsmith/typesafe";
import { joinFusedWords } from "../../src/concrete-lang/de/segmentation/fused-word-guard.js";
import { segmentGerman } from "../../src/concrete-lang/de/segmentation/segment.js";
import type { SentenceAnalysis } from "../../src/concrete-lang/de/sentence-analysis/analysis.js";
import {
	type SentenceGold,
	scoreAnalysis,
} from "../../src/concrete-lang/de/sentence-analysis/experiment.js";
import { placeSegments } from "../../src/concrete-lang/de/sentence-analysis/placement.js";
import type { SegmentedSentence } from "../../src/types.js";
import { createDumgen } from "../../src/universal/dumgen.js";
import { save } from "../harness.js";
import { fixtureSentences, type GoldSpec } from "./fixtures/sentences.js";

export type Fixture = {
	readonly analysis: SentenceAnalysis;
	readonly gold: SentenceGold;
	readonly note: string;
	readonly produced: { readonly design: string; readonly at: string };
};

const [outputPath] = process.argv.slice(2);
if (!outputPath) throw Error("Pass the lattice fixture output path");

const dumgen = createDumgen({
	judge: createTypeSafeExecutor({
		apiKey: process.env.TYPESAFE_API_KEY,
	}),
	execute: async () => {
		throw Error("Sentence analysis must not generate text");
	},
});

function sentenceOf(id: string, text: string): SegmentedSentence<"de"> {
	return {
		id,
		language: "de",
		segments: segmentGerman(text).segments.map((segment) => ({
			kind: segment.kind,
			text: segment.text,
		})),
	};
}

/** `text[#n][@fused][:Role]` to an offset in the placed sentence. */
function resolveMembers(
	members: readonly string[],
	placed: ReturnType<typeof placeSegments>,
) {
	return members.map((member) => {
		const match = member.match(
			/^(.+?)(?:#(\d+))?(?:@([^:]+))?(?::(\w+))?$/u,
		);
		if (!match) throw Error(`Bad gold member ${member}`);
		const [, text, nth, fused, role] = match;
		let candidates = placed.segments.filter(
			(segment) =>
				segment.kind === "ResolvableText" && segment.text === text,
		);
		if (fused) {
			const fusion = placed.fusions.find((entry) => entry.form === fused);
			if (!fusion) throw Error(`No fusion ${fused} for ${member}`);
			candidates = candidates.filter((segment) =>
				fusion.components.some((c) => c.offset === segment.offset),
			);
		} else
			candidates = candidates.filter(
				(segment) =>
					!placed.fusions.some((entry) =>
						entry.components.some(
							(c) => c.offset === segment.offset,
						),
					),
			);
		const segment = candidates[Number(nth ?? "1") - 1];
		if (!segment) throw Error(`No segment for gold member ${member}`);
		return { offset: segment.offset, ...(role ? { role } : {}) };
	});
}

function goldOf(
	spec: {
		gold: readonly GoldSpec[];
		phrasemes?: readonly { kind: string; words: readonly string[] }[];
	},
	placed: ReturnType<typeof placeSegments>,
): SentenceGold {
	return {
		targets: spec.gold.map((gold) => ({
			kind: gold.kind,
			members: resolveMembers(gold.members, placed).sort(
				(a, b) => a.offset - b.offset,
			),
			...(gold.identity ? { identity: gold.identity } : {}),
		})),
		phrasemes: (spec.phrasemes ?? []).map((phraseme) => ({
			kind: phraseme.kind,
			words: resolveMembers(phraseme.words, placed)
				.map((m) => m.offset)
				.sort((a, b) => a - b),
		})),
	};
}

const fixtures: Fixture[] = [];
for (const spec of fixtureSentences) {
	const sentence = sentenceOf(spec.id, spec.text);
	const analysis = await Effect.runPromise(
		dumgen.analyzeSentence({ sentence }),
	);
	console.error(
		`  ${spec.id}: ${analysis.targets.length} targets, ${analysis.phrasemes.length} phrasemes`,
	);
	fixtures.push({
		analysis,
		gold: goldOf(spec, placeSegments(joinFusedWords(sentence))),
		note: spec.note,
		produced: {
			design: "production analyzeSentence (Dumgen ADR 0006)",
			at: new Date().toISOString().slice(0, 10),
		},
	});
}
await save(outputPath, fixtures);
const scores = fixtures.map((fixture) => ({
	id: fixture.analysis.sentenceId,
	...scoreAnalysis(fixture.analysis, fixture.gold),
}));
const total = (pick: (s: (typeof scores)[number]) => number) =>
	scores.reduce((sum, s) => sum + pick(s), 0);
console.log(
	JSON.stringify(
		{
			sentences: fixtures.length,
			goldTargets: total((s) => s.targets),
			membersFound: total((s) => s.membersFound),
			routeCorrect: total((s) => s.routeCorrect),
			phrasemes: `${total((s) => s.phrasemesCorrect)}/${total((s) => s.phrasemesFound)} of ${total((s) => s.phrasemes)} gold, ${total((s) => s.phrasemesExtra)} extra`,
			roles: `${total((s) => s.rolesCorrect)}/${total((s) => s.rolesScored)}`,
			identity: `${total((s) => s.identityCorrect)}/${total((s) => s.identityScored)}`,
			failures: Object.fromEntries(
				scores
					.filter((s) => s.failures.length)
					.map((s) => [s.id, s.failures]),
			),
		},
		null,
		2,
	),
);
