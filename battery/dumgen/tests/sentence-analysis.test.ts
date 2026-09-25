import { expect, test } from "bun:test";
import { Effect } from "effect";
import type {
	Questions,
	SystemOneResult,
	TypeSafeExecutor,
} from "promptsmith/typesafe";
import {
	governablePrepositionIn,
	governablePrepositionLemma,
} from "../src/concrete-lang/de/governable-prepositions.js";
import { joinFusedWords } from "../src/concrete-lang/de/segmentation/fused-word-guard.js";
import { segmentGerman } from "../src/concrete-lang/de/segmentation/segment.js";
import {
	headOf,
	largestOf,
	offsetsOf,
	resolvedUnitAt,
	resolvedWordAt,
	selectIdentity,
	selectPhrasemeKind,
	slotsAt,
	targetOf,
} from "../src/concrete-lang/de/sentence-analysis/analysis.js";
import { candidatesFor } from "../src/concrete-lang/de/sentence-analysis/identity.js";
import { placeSegments } from "../src/concrete-lang/de/sentence-analysis/placement.js";
import type {
	LexemeTarget,
	OperationTrace,
	SegmentedSentence,
	SentenceAnalysis,
	Slot,
} from "../src/types.js";
import { createDumgen } from "../src/universal/dumgen.js";

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

type Plan = {
	/** Lexeme groups by input index; every other pair is Exclude. */
	readonly words: readonly (readonly number[])[];
	readonly routes: Readonly<Record<number, string>>;
	readonly roles: Readonly<Record<number, string>>;
	/** Identity option per input index; every other identity question is NoMatch. */
	readonly identities?: Readonly<Record<number, string>>;
	/** Phraseme groups by head index with their Kind and fixedness. */
	readonly expressions: readonly {
		readonly heads: readonly number[];
		/** One Kind, or the Kind Mass every head answers. */
		readonly kind: string | Readonly<Record<string, number>>;
		readonly fixedness: number;
		/** Free words the pair answers still tie to the expression. */
		readonly carried?: readonly number[];
	}[];
	/** Head pairs the pair answers tie across expressions. */
	readonly crossLinks?: readonly (readonly [number, number])[];
	/** Governor, or governors splitting the vote, and case per governable preposition index; every other one is None. */
	readonly government?: Readonly<
		Record<
			number,
			{
				readonly governor?: number | readonly number[];
				readonly case?: string;
				readonly referent?: string;
				/** Whether the governing word keeps the government alone; Word by default. */
				readonly scope?: "Word" | "Expression";
			}
		>
	>;
};

/** An injected judge answering every question of the one call from a plan. */
function judgeFrom(plan: Plan): TypeSafeExecutor {
	const sameWord = (a: number, b: number) =>
		plan.words.some((word) => word.includes(a) && word.includes(b));
	const expression = (index: number) =>
		plan.expressions.find((entry) => entry.heads.includes(index));
	const tiedTo = (index: number) =>
		plan.expressions.find(
			(entry) =>
				entry.heads.includes(index) || entry.carried?.includes(index),
		);
	return async (request) => {
		const answers = Object.fromEntries(
			Object.entries(request.questions as Questions).map(
				([id, question]) => {
					const [prefix, ...rest] = id.split("_");
					const numbers = rest.map(Number);
					if (question.type === "noul") {
						const [a, b] = numbers as [number, number];
						const shared =
							(tiedTo(a) !== undefined &&
								tiedTo(a) === tiedTo(b)) ||
							(plan.crossLinks ?? []).some(
								([x, y]) =>
									(x === a && y === b) ||
									(x === b && y === a),
							);
						return [
							id,
							{ type: "noul", noul: shared ? 0.9 : 0.05 },
						];
					}
					if (question.type === "score") {
						const index = numbers[0] ?? -1;
						const value = tiedTo(index)?.carried?.includes(index)
							? 1
							: (expression(index)?.fixedness ?? 0.4);
						const levels = question.criteria.length;
						return [
							id,
							{
								type: "score",
								score: value,
								confidence: 0.9,
								legend: Object.fromEntries(
									question.criteria.map((level, index) => [
										index,
										level,
									]),
								),
								probabilities: Object.fromEntries(
									Array.from(
										{ length: levels },
										(_, index) => [
											index,
											index === Math.round(value) ? 1 : 0,
										],
									),
								),
							},
						];
					}
					const options = Object.keys(question.criteria);
					let chosen: string;
					let split: Readonly<Record<string, number>> | undefined;
					if (prefix === "m") {
						const [anchor, other] = numbers as [number, number];
						chosen = sameWord(anchor, other)
							? "Include"
							: "Exclude";
					} else if (prefix === "route")
						chosen = plan.routes[numbers[0] ?? -1] ?? "Unresolved";
					else if (prefix === "role")
						chosen = plan.roles[numbers[0] ?? -1] ?? "Free";
					else if (prefix === "id")
						chosen =
							plan.identities?.[numbers[0] ?? -1] ?? "NoMatch";
					else if (prefix === "pk") {
						const kind = expression(numbers[0] ?? -1)?.kind;
						if (typeof kind === "object") split = kind;
						chosen =
							typeof kind === "object"
								? (Object.entries(kind).sort(
										(a, b) => b[1] - a[1],
									)[0]?.[0] ?? "None")
								: (kind ?? "None");
					} else if (prefix === "gov") {
						const governor =
							plan.government?.[numbers[0] ?? -1]?.governor;
						const governors =
							governor === undefined ? [] : [governor].flat();
						if (governors.length > 1)
							split = Object.fromEntries(
								governors.map((g) => [
									`s${g}`,
									1 / governors.length,
								]),
							);
						chosen =
							governors[0] === undefined
								? "None"
								: `s${governors[0]}`;
					} else if (prefix === "case")
						chosen =
							plan.government?.[numbers[0] ?? -1]?.case ??
							"Unresolved";
					else if (prefix === "ref")
						chosen =
							plan.government?.[numbers[0] ?? -1]?.referent ??
							"Unresolved";
					else if (prefix === "scope")
						chosen =
							plan.government?.[numbers[0] ?? -1]?.scope ??
							"Word";
					else throw Error(`Unexpected question ${id}`);
					if (!options.includes(chosen))
						throw Error(`${chosen} is not an option of ${id}`);
					return [
						id,
						{
							type: "choice",
							choice: chosen,
							confidence: 0.9,
							probabilities: Object.fromEntries(
								options.map((option) => [
									option,
									split
										? (split[option] ?? 0)
										: option === chosen
											? 1
											: 0,
								]),
							),
						},
					];
				},
			),
		);
		return {
			model: "injected",
			usage: { input_tokens: 1, output_tokens: 1 },
			answers,
		} as SystemOneResult<typeof request.questions>;
	};
}

function dumgenWith(plan: Plan) {
	const traces: OperationTrace[] = [];
	return {
		traces,
		dumgen: createDumgen({
			judge: judgeFrom(plan),
			execute: async () => {
				throw Error("Sentence analysis must not generate text");
			},
			onOperation: (trace) => traces.push(trace),
		}),
	};
}

// Der0 Lehrer2 stellt4 den6 Schülern8 Material10 zur12 Verfügung14 .15
const verfuegung = sentenceOf(
	"verfuegung",
	"Der Lehrer stellt den Schülern Material zur Verfügung.",
);

test("a Funktionsverbgefüge is a Collocation over words, the fused article reaching its noun through its own word", async () => {
	const { dumgen, traces } = dumgenWith({
		words: [[0, 2], [4], [6, 8], [10], [12], [14]],
		routes: {
			0: "Lexeme/NOUN",
			2: "Lexeme/NOUN",
			4: "Lexeme/VERB",
			6: "Lexeme/NOUN",
			8: "Lexeme/NOUN",
			10: "Lexeme/NOUN",
			12: "Lexeme/ADP",
			14: "Lexeme/NOUN",
		},
		roles: { 0: "Article", 2: "Head", 6: "Article", 8: "Head" },
		expressions: [
			{ heads: [4, 12, 14], kind: "Collocation", fixedness: 2 },
		],
	});
	const analysis = await Effect.runPromise(
		dumgen.analyzeSentence({ sentence: verfuegung }),
	);
	expect(analysis.stitchedText).toBe(
		verfuegung.segments.map((s) => s.text).join(""),
	);
	expect(analysis.segments.map((s) => s.text).join("")).toBe(
		analysis.stitchedText,
	);
	// `zur` is two Segments: `zu` standing for itself, `r` standing for `der`.
	expect(analysis.fusions).toEqual([
		{
			offset: 40,
			form: "zur",
			components: [
				{ offset: 40, span: "zu", surface: "zu", role: "Adposition" },
				{ offset: 42, span: "r", surface: "der", role: "Article" },
			],
		},
	]);
	const text = (offset: number) =>
		analysis.segments.find((s) => s.offset === offset)?.text;
	const words = analysis.targets.map((target) =>
		target.members.map((m) => `${text(m.offset)}/${m.role}`).join(" "),
	);
	expect(words).toEqual([
		"Der/Article Lehrer/Head",
		"stellt/Head",
		"den/Article Schülern/Head",
		"Material/Head",
		"zu/Head",
		"r/Article Verfügung/Head",
	]);
	expect(analysis.phrasemes).toHaveLength(1);
	const phraseme = analysis.phrasemes[0]!;
	expect(selectPhrasemeKind(analysis, phraseme).kind).toBe("Collocation");
	expect(
		phraseme.members.map(
			(id) => words[analysis.targets.findIndex((t) => t.id === id)],
		),
	).toEqual(["stellt/Head", "zu/Head", "r/Article Verfügung/Head"]);
	// A click on any covered Segment selects the Collocation; `den` selects its noun.
	expect(resolvedUnitAt(analysis, 42)).toEqual({
		family: "Phraseme",
		kind: "Collocation",
		offsets: [11, 40, 42, 44],
	});
	expect(resolvedUnitAt(analysis, 18)).toEqual({
		family: "Lexeme",
		kind: "NOUN",
		offsets: [18, 22],
	});
	expect(largestOf(analysis, 31)?.layer).toBe("Lexeme");
	// One judgment call for the whole sentence, nothing generated.
	expect(traces).toHaveLength(1);
	expect(traces[0]!.calls.map((call) => call.executor)).toEqual(["TypeSafe"]);
	const request = traces[0]!.calls[0]!.request;
	if (!("questions" in request)) throw Error("Expected a judgment");
	expect(request.input).toMatchObject({
		criteria: expect.any(String),
		fixedness: expect.any(String),
	});
	expect(
		Object.keys(request.questions).filter((id) => id.startsWith("same_")),
	).toHaveLength(28);
});

/** Each Lexeme Target as `text/Role` members, its winning route and provenance. */
function lexemesOf(analysis: SentenceAnalysis) {
	const text = (offset: number) =>
		analysis.segments.find((s) => s.offset === offset)?.text;
	return analysis.targets.map((target) => ({
		members: target.members
			.map((m) => `${text(m.offset)}/${m.role}`)
			.join(" "),
		route: Object.entries(target.routeMass).sort(
			(a, b) => b[1] - a[1],
		)[0]?.[0],
		provenance: target.provenance,
	}));
}

test("a fused article joins the noun across prenominal words", async () => {
	// Wir0 bleiben2 im4 sehr6 dichten8 Wald10 .11
	const { dumgen } = dumgenWith({
		words: [[0], [2], [4], [6], [8], [10]],
		routes: {
			0: "Lexeme/PRON",
			2: "Lexeme/VERB",
			4: "Lexeme/ADP",
			6: "Lexeme/ADV",
			8: "Lexeme/ADJ",
			10: "Lexeme/NOUN",
		},
		roles: {},
		expressions: [],
	});
	const analysis = await Effect.runPromise(
		dumgen.analyzeSentence({
			sentence: sentenceOf("wald", "Wir bleiben im sehr dichten Wald."),
		}),
	);
	expect(lexemesOf(analysis).slice(2)).toEqual([
		{ members: "i/Head", route: "ADP", provenance: "fusion-table" },
		{
			members: "m/Article Wald/Head",
			route: "NOUN",
			provenance: "vote+fusion-table",
		},
		{ members: "sehr/Head", route: "ADV", provenance: "vote" },
		{ members: "dichten/Head", route: "ADJ", provenance: "vote" },
	]);
});

test("a fused article before a name stands alone instead of reaching a later noun", async () => {
	// Wir0 wohnen2 im4 Ligusterweg6 Nummer8 410 .11
	const { dumgen } = dumgenWith({
		words: [[0], [2], [4], [6], [8], [10]],
		routes: {
			0: "Lexeme/PRON",
			2: "Lexeme/VERB",
			4: "Lexeme/ADP",
			6: "Lexeme/PROPN",
			8: "Lexeme/NOUN",
			10: "Lexeme/NUM",
		},
		roles: {},
		expressions: [],
	});
	const analysis = await Effect.runPromise(
		dumgen.analyzeSentence({
			sentence: sentenceOf(
				"ligusterweg",
				"Wir wohnen im Ligusterweg Nummer 4.",
			),
		}),
	);
	expect(lexemesOf(analysis).slice(2, 6)).toEqual([
		{ members: "i/Head", route: "ADP", provenance: "fusion-table" },
		{
			members: "m/Head",
			route: "DET",
			provenance: "fusion-table:unattached-article",
		},
		{ members: "Ligusterweg/Head", route: "PROPN", provenance: "vote" },
		{ members: "Nummer/Head", route: "NOUN", provenance: "vote" },
	]);
});

test("a standalone article the matrix left alone joins its noun like a fused one", async () => {
	// Der0 Lehrer2 ist4 der6 Vater8 des10 Mädchens12 .13
	const { dumgen } = dumgenWith({
		words: [[0, 2], [4], [6], [8], [10], [12]],
		routes: {
			0: "Lexeme/NOUN",
			2: "Lexeme/NOUN",
			4: "Lexeme/VERB",
			6: "Lexeme/NOUN",
			8: "Lexeme/NOUN",
			10: "Lexeme/ADP",
			12: "Lexeme/NOUN",
		},
		roles: { 0: "Article", 2: "Head", 6: "Article", 10: "Article" },
		expressions: [],
	});
	const analysis = await Effect.runPromise(
		dumgen.analyzeSentence({
			sentence: sentenceOf(
				"vater",
				"Der Lehrer ist der Vater des Mädchens.",
			),
		}),
	);
	expect(lexemesOf(analysis)).toEqual([
		{
			members: "Der/Article Lehrer/Head",
			route: "NOUN",
			provenance: "vote",
		},
		{ members: "ist/Head", route: "VERB", provenance: "vote" },
		{
			members: "der/Article Vater/Head",
			route: "NOUN",
			provenance: "vote+article",
		},
		{
			members: "des/Article Mädchens/Head",
			route: "NOUN",
			provenance: "vote+article",
		},
	]);
});

test("a governor with only the prepositions it governs is no Phraseme", async () => {
	// Sie0 wartet2 auf4 den6 Bus8 .9
	const { dumgen } = dumgenWith({
		words: [[0], [2], [4], [6, 8]],
		routes: {
			0: "Lexeme/PRON",
			2: "Lexeme/VERB",
			4: "Lexeme/ADP",
			6: "Lexeme/NOUN",
			8: "Lexeme/NOUN",
		},
		roles: { 4: "GovernedPreposition", 6: "Article", 8: "Head" },
		expressions: [{ heads: [2, 4], kind: "Collocation", fixedness: 2 }],
		government: { 4: { governor: 2, case: "Acc" } },
	});
	const analysis = await Effect.runPromise(
		dumgen.analyzeSentence({
			sentence: sentenceOf("warten", "Sie wartet auf den Bus."),
		}),
	);
	expect(analysis.phrasemes).toEqual([]);
	expect(analysis.slots).toHaveLength(1);
});

test("an article grouped with a noun past another word is split off", async () => {
	// Wir0 wohnen2 in4 dem6 Ligusterweg8 Nummer10 412 .13
	const { dumgen } = dumgenWith({
		words: [[0], [2], [4], [6, 10], [8], [12]],
		routes: {
			0: "Lexeme/PRON",
			2: "Lexeme/VERB",
			4: "Lexeme/ADP",
			6: "Lexeme/NOUN",
			8: "Lexeme/PROPN",
			10: "Lexeme/NOUN",
			12: "Lexeme/NUM",
		},
		roles: { 6: "Article", 10: "Head" },
		expressions: [],
	});
	const analysis = await Effect.runPromise(
		dumgen.analyzeSentence({
			sentence: sentenceOf(
				"in-dem-ligusterweg",
				"Wir wohnen in dem Ligusterweg Nummer 4.",
			),
		}),
	);
	expect(lexemesOf(analysis).slice(3, 6)).toEqual([
		{ members: "dem/Head", route: "DET", provenance: "guard:articleScope" },
		{ members: "Ligusterweg/Head", route: "PROPN", provenance: "vote" },
		{
			members: "Nummer/Head",
			route: "NOUN",
			provenance: "vote+guard:articleScope",
		},
	]);
});

test("a free word the pair answers tie to an expression stays out of it", async () => {
	const sentence = sentenceOf(
		"ganz-und-gar",
		"Sie sind ganz und gar normal.",
	);
	// Sie0 sind2 ganz4 und6 gar8 normal10
	const { dumgen } = dumgenWith({
		words: [[0], [2], [4], [6], [8], [10]],
		routes: {
			0: "Lexeme/PRON",
			2: "Lexeme/VERB",
			4: "Lexeme/ADV",
			6: "Lexeme/CCONJ",
			8: "Lexeme/ADV",
			10: "Lexeme/ADJ",
		},
		roles: {},
		// `normal` is free (fixedness 1), though every pair ties it in and
		// the mean over all four words would still clear the floor.
		expressions: [
			{ heads: [4, 6, 8], kind: "Idiom", fixedness: 2, carried: [10] },
		],
	});
	const analysis = await Effect.runPromise(
		dumgen.analyzeSentence({ sentence }),
	);
	expect(resolvedUnitAt(analysis, 9)).toEqual({
		family: "Phraseme",
		kind: "Idiom",
		offsets: [9, 14, 18],
	});
	expect(resolvedUnitAt(analysis, 22)).toEqual({
		family: "Lexeme",
		kind: "ADJ",
		offsets: [22],
	});
});

test("one pair alone never ties two expressions into one Phraseme", async () => {
	// Er0 hat2 den4 Faden6 verloren8 und10 das12 Eis14 gebrochen16 .17
	const { dumgen } = dumgenWith({
		words: [[0], [2], [4, 6], [8], [10], [12, 14], [16]],
		routes: {
			0: "Lexeme/PRON",
			2: "Lexeme/VERB",
			4: "Lexeme/NOUN",
			6: "Lexeme/NOUN",
			8: "Lexeme/VERB",
			10: "Lexeme/CCONJ",
			12: "Lexeme/NOUN",
			14: "Lexeme/NOUN",
			16: "Lexeme/VERB",
		},
		roles: { 4: "Article", 6: "Head", 12: "Article", 14: "Head" },
		expressions: [
			{ heads: [6, 8], kind: "Idiom", fixedness: 2 },
			{ heads: [14, 16], kind: "Idiom", fixedness: 2 },
		],
		crossLinks: [[8, 14]],
	});
	const analysis = await Effect.runPromise(
		dumgen.analyzeSentence({
			sentence: sentenceOf(
				"faden-eis",
				"Er hat den Faden verloren und das Eis gebrochen.",
			),
		}),
	);
	const words = lexemesOf(analysis);
	expect(
		analysis.phrasemes.map((phraseme) =>
			phraseme.members.map(
				(id) =>
					words[analysis.targets.findIndex((t) => t.id === id)]
						?.members,
			),
		),
	).toEqual([
		["den/Article Faden/Head", "verloren/Head"],
		["das/Article Eis/Head", "gebrochen/Head"],
	]);
});

test("a word glued around two Heads is split at them and each keeps its own route", async () => {
	const { dumgen } = dumgenWith({
		words: [[0, 2], [4, 12, 14], [6, 8], [10]],
		routes: {
			0: "Lexeme/NOUN",
			2: "Lexeme/NOUN",
			4: "Lexeme/VERB",
			6: "Lexeme/NOUN",
			8: "Lexeme/NOUN",
			10: "Lexeme/NOUN",
			12: "Lexeme/ADP",
			14: "Lexeme/NOUN",
		},
		roles: {
			0: "Article",
			2: "Head",
			4: "Head",
			6: "Article",
			8: "Head",
			12: "GovernedPreposition",
			14: "Head",
		},
		expressions: [],
	});
	const analysis = await Effect.runPromise(
		dumgen.analyzeSentence({ sentence: verfuegung }),
	);
	const kinds = analysis.targets.map(
		(target) =>
			`${target.members.map((m) => m.offset).join(",")}:${Object.keys(target.routeMass)[0]}`,
	);
	expect(kinds).toEqual([
		"0,4:NOUN",
		"11:VERB",
		"18,22:NOUN",
		"31:NOUN",
		"40:ADP",
		"42,44:NOUN",
	]);
	expect(analysis.phrasemes).toEqual([]);
	// `zu` served a non-VERB head as a governed preposition, so it is a singleton.
	expect(targetOf(analysis, 40)?.members).toEqual([
		{ offset: 40, role: "Head" },
	]);
});

test("an unresolved membership yields an Unresolved singleton and no expression below the fixedness floor", async () => {
	const sentence = sentenceOf("frage", "Er stellt eine Frage.");
	// Er0 stellt2 eine4 Frage6
	const { dumgen } = dumgenWith({
		words: [[0], [2], [4, 6]],
		routes: {
			0: "Lexeme/PRON",
			2: "Lexeme/VERB",
			4: "Lexeme/NOUN",
			6: "Lexeme/NOUN",
		},
		roles: { 4: "Article", 6: "Head" },
		expressions: [{ heads: [2, 6], kind: "Collocation", fixedness: 1 }],
	});
	const analysis = await Effect.runPromise(
		dumgen.analyzeSentence({ sentence }),
	);
	expect(analysis.phrasemes).toEqual([]);
	expect(resolvedUnitAt(analysis, 3)).toEqual({
		family: "Lexeme",
		kind: "VERB",
		offsets: [3],
	});
	const unresolvedJudge = judgeFrom({
		words: [[0], [2], [4, 6]],
		routes: {
			0: "Lexeme/PRON",
			2: "Unresolved",
			4: "Lexeme/NOUN",
			6: "Lexeme/NOUN",
		},
		roles: { 4: "Article", 6: "Head" },
		expressions: [],
	});
	const other = createDumgen({
		judge: unresolvedJudge,
		execute: async () => {
			throw Error("no generation");
		},
	});
	const second = await Effect.runPromise(other.analyzeSentence({ sentence }));
	expect(targetOf(second, 3)?.routeMass).toEqual({ Unresolved: 1 });
	expect(resolvedUnitAt(second, 3)).toBeNull();
});

const sourceOf = (sentence: SegmentedSentence<"de">) =>
	sentence.segments.map((segment) => segment.text).join("");

test("placed Segments keep the source casing of a fused word and spell the Stitched Text", () => {
	for (const [text, fused, components] of [
		[
			"Im Sommer fahren viele Deutsche ans Meer.",
			"Im",
			[
				["I", "in"],
				["m", "dem"],
			],
		],
		[
			"Beim Nähen verlor sie den roten Faden.",
			"Beim",
			[
				["Bei", "bei"],
				["m", "dem"],
			],
		],
		[
			"ZUM Beispiel",
			"ZUM",
			[
				["ZU", "zu"],
				["M", "dem"],
			],
		],
	] as const) {
		// Segmentation splits the fused word; intake joins it back to read it
		// whole and places the pieces by the table again.
		const sentence = joinFusedWords(sentenceOf(fused, text));
		expect(
			sentence.segments.some((segment) => segment.text === fused),
		).toBe(true);
		const placement = placeSegments(sentence);
		expect(placement.stitchedText).toBe(sourceOf(sentence));
		expect(placement.stitchedText).toBe(text);
		expect(placement.segments.map((segment) => segment.text).join("")).toBe(
			text,
		);
		const fusion = placement.fusions[0];
		expect(fusion?.form).toBe(fused);
		expect(
			fusion?.components.map((component) => [
				component.span,
				component.surface,
			]),
		).toEqual(components.map((pair) => [...pair]));
		for (const component of fusion?.components ?? [])
			expect(
				text.slice(
					component.offset,
					component.offset + component.span.length,
				),
			).toBe(component.span);
	}
});

test("German abbreviations and apostrophe clitics are cut where the fusion table says", () => {
	const resolvable = (text: string) =>
		segmentGerman(text)
			.segments.filter((segment) => segment.kind === "ResolvableText")
			.map((segment) => segment.text);
	expect(
		resolvable("Das ist evtl. falsch, vgl. Tel. und 3 Mio. Euro."),
	).toEqual([
		"Das",
		"ist",
		"evtl.",
		"falsch",
		"vgl.",
		"Tel.",
		"und",
		"3",
		"Mio.",
		"Euro",
	]);
	expect(resolvable("Vgl. Abb. 3.")).toEqual(["Vgl.", "Abb.", "3"]);
	expect(resolvable("Wie geht’s dir?")).toEqual(["Wie", "geht", "’s", "dir"]);
	expect(resolvable("'s Wetter ist schön.")).toEqual([
		"'s",
		"Wetter",
		"ist",
		"schön",
	]);
	expect(resolvable("Er ist auf'm Dach mit 'ner Freundin.")).toEqual([
		"Er",
		"ist",
		"auf",
		"'m",
		"Dach",
		"mit",
		"'ner",
		"Freundin",
	]);
	expect(resolvable("Rock'n'Roll")).toEqual(["Rock'n'Roll"]);
	expect(
		segmentGerman("Wie geht's dir?").segments.some(
			(segment) => segment.kind === "Punctuation" && segment.text === "'",
		),
	).toBe(false);
});

test("placed abbreviations and clitics stand for their table surfaces", () => {
	const placement = placeSegments(
		sentenceOf("table", "Vgl. evtl. 3 Mio. und geht's"),
	);
	expect(
		placement.segments
			.filter((segment) => segment.text !== segment.surface)
			.map((segment) => [segment.text, segment.surface]),
	).toEqual([
		["Vgl.", "vergleiche"],
		["evtl.", "eventuell"],
		["Mio.", "Million"],
		["'s", "es"],
	]);
	const clitic = placement.segments.find((segment) => segment.text === "'s");
	expect(placement.choices.get(clitic?.offset ?? -1)).toEqual(["es", "das"]);
});

test("the analysis decides what 's stands for: its Selected identity, or das as an article", async () => {
	// Wie0 geht2 's3 dir5 ?6
	const esOption = `c${candidatesFor("'s").findIndex(
		(member) => member.lemma.canonicalForm === "es",
	)}`;
	const geht = await Effect.runPromise(
		dumgenWith({
			words: [[0], [2], [3], [5]],
			routes: {
				0: "Lexeme/ADV",
				2: "Lexeme/VERB",
				3: "Lexeme/PRON",
				5: "Lexeme/PRON",
			},
			roles: {},
			identities: { 3: esOption },
			expressions: [],
		}).dumgen.analyzeSentence({
			sentence: sentenceOf("geht", "Wie geht's dir?"),
		}),
	);
	const clitic = geht.segments.find((segment) => segment.text === "'s");
	expect(clitic?.surface).toBe("es");
	const target = geht.targets.find((entry) =>
		entry.members.some((member) => member.offset === clitic?.offset),
	);
	expect(
		new Set(target?.identity?.candidates.map((entry) => entry.headword)),
	).toEqual(new Set(["es", "das"]));
	// 's0 Wetter2 ist4 schön6 .7
	const wetter = await Effect.runPromise(
		dumgenWith({
			words: [[0, 2], [4], [6]],
			routes: {
				0: "Lexeme/NOUN",
				2: "Lexeme/NOUN",
				4: "Lexeme/VERB",
				6: "Lexeme/ADJ",
			},
			roles: { 0: "Article", 2: "Head" },
			expressions: [],
		}).dumgen.analyzeSentence({
			sentence: sentenceOf("wetter", "'s Wetter ist schön."),
		}),
	);
	expect(
		wetter.segments.find((segment) => segment.text === "'s")?.surface,
	).toBe("das");
});

test("an NFD umlaut fusion is cut after its combining mark", () => {
	const fuers = "Fu\u0308rs";
	const sentence: SegmentedSentence<"de"> = {
		id: "fuers",
		language: "de",
		segments: [
			{ kind: "ResolvableText", text: fuers },
			{ kind: "Whitespace", text: " " },
			{ kind: "ResolvableText", text: "Erste" },
		],
	};
	const placement = placeSegments(sentence);
	expect(placement.stitchedText).toBe(sourceOf(sentence));
	expect(
		placement.fusions[0]?.components.map((component) => [
			component.span,
			component.surface,
		]),
	).toEqual([
		["Fu\u0308r", "für"],
		["s", "das"],
	]);
});

test("a closed-class word whose spelling enumerated no candidate is a Miss and resolves nothing; an open-class one still resolves", () => {
	const singleton = (
		id: string,
		offset: number,
		kind: string,
	): LexemeTarget => ({
		id,
		members: [{ offset, role: "Head" }],
		routeMass: { [kind]: 1 },
		identity: null,
		provenance: "vote",
	});
	const analysis: SentenceAnalysis = {
		sentenceId: "miss",
		language: "de",
		stitchedText: "xyz an",
		segments: [
			{ offset: 0, kind: "ResolvableText", text: "xyz", surface: "xyz" },
			{ offset: 3, kind: "Whitespace", text: " ", surface: " " },
			{ offset: 4, kind: "ResolvableText", text: "an", surface: "an" },
		],
		targets: [singleton("xyz", 0, "PRON"), singleton("an", 4, "ADP")],
		phrasemes: [],
		fusions: [],
		slots: [],
	};
	const [pron, adp] = analysis.targets;
	if (!pron || !adp) throw Error("Expected two targets");
	expect(selectIdentity(pron, headOf(pron))).toEqual({ state: "Miss" });
	expect(resolvedUnitAt(analysis, 0)).toBeNull();
	expect(selectIdentity(adp, headOf(adp))).toEqual({ state: "Open" });
	expect(resolvedUnitAt(analysis, 4)).toEqual({
		family: "Lexeme",
		kind: "ADP",
		offsets: [4],
	});
});

test("a preposition, a fused adposition or a pronominal adverb realizes a governable preposition", () => {
	expect(
		[
			"auf",
			"Für",
			"darauf",
			"worüber",
			"hierfür",
			"dran",
			"dabei",
			"dazwischen",
			"Haus",
			"seit",
		].map(governablePrepositionIn),
	).toEqual([
		"auf",
		"für",
		"auf",
		"über",
		"für",
		"an",
		"bei",
		"zwischen",
		null,
		null,
	]);
});

// Input indices: Das0 Kind2 hat4 im6 Winter8 Angst10 vor12 Hunden14 .15
// Offsets: Das0 Kind4 hat9 i13 m14 Winter16 Angst23 vor29 Hunden33
test("intake links a governed preposition to its governor and leaves an adjunct ungoverned", async () => {
	const sentence = sentenceOf(
		"angst",
		"Das Kind hat im Winter Angst vor Hunden.",
	);
	const { dumgen, traces } = dumgenWith({
		words: [[0, 2], [4], [6], [8], [10], [12], [14]],
		routes: {
			0: "Lexeme/NOUN",
			2: "Lexeme/NOUN",
			4: "Lexeme/VERB",
			6: "Lexeme/ADP",
			8: "Lexeme/NOUN",
			10: "Lexeme/NOUN",
			12: "Lexeme/ADP",
			14: "Lexeme/NOUN",
		},
		// A lone preposition labelled GovernedPreposition still needs a governor.
		roles: { 0: "Article", 2: "Head", 12: "GovernedPreposition" },
		expressions: [],
		government: { 12: { governor: 10, case: "Dat" } },
	});
	const analysis = await Effect.runPromise(
		dumgen.analyzeSentence({ sentence }),
	);
	const angst = targetOf(analysis, 23);
	if (!angst) throw Error("Expected the Angst target");
	// The noun takes in the preposition it governs; the adjunct im stays out.
	expect(angst.members).toEqual([
		{ offset: 23, role: "Head" },
		{ offset: 29, role: "GovernedPreposition" },
	]);
	expect(resolvedUnitAt(analysis, 29)).toEqual({
		family: "Lexeme",
		kind: "NOUN",
		offsets: [23, 29],
	});
	expect(resolvedUnitAt(analysis, 13)).toEqual({
		family: "Lexeme",
		kind: "ADP",
		offsets: [13],
	});
	// No referent answer: the slot does not narrow it.
	const slot: Slot = {
		governor: angst.id,
		marker: 29,
		filler: null,
		complement: {
			kind: "Preposition",
			preposition: governablePrepositionLemma("vor"),
			case: "Dat",
			referent: "Either",
		},
		realizedCase: "Dat",
	};
	expect(analysis.slots).toEqual([slot]);
	expect(
		slotsAt(
			analysis,
			angst.members.map((member) => member.offset),
		),
	).toEqual([slot]);
	const hat = analysis.segments.find((s) => s.text === "hat");
	expect(slotsAt(analysis, [hat?.offset ?? -1])).toEqual([]);
	expect(JSON.stringify(traces)).toContain("gov_12");
	expect(JSON.stringify(traces)).toContain("case_12");
	expect(JSON.stringify(traces)).toContain("ref_12");
});

// Input indices: Er0 wartet2 auf4 den6 Bus8; offsets: Er0 wartet3 auf10 den14 Bus18
test("a verb's GovernedPreposition member falls back to its verb when no word wins the vote", async () => {
	const { dumgen } = dumgenWith({
		words: [[0], [2, 4], [6, 8]],
		routes: {
			0: "Lexeme/PRON",
			2: "Lexeme/VERB",
			4: "Lexeme/VERB",
			6: "Lexeme/NOUN",
			8: "Lexeme/NOUN",
		},
		roles: { 2: "Head", 4: "GovernedPreposition", 6: "Article", 8: "Head" },
		expressions: [],
		government: { 4: { case: "Acc", referent: "Something" } },
	});
	const analysis = await Effect.runPromise(
		dumgen.analyzeSentence({
			sentence: sentenceOf("warten", "Er wartet auf den Bus."),
		}),
	);
	const verb = targetOf(analysis, 3);
	if (!verb) throw Error("Expected the verbal target");
	expect(verb.members.map((member) => member.role)).toEqual([
		"Head",
		"GovernedPreposition",
	]);
	expect(analysis.slots).toEqual([
		{
			governor: verb.id,
			marker: 10,
			filler: null,
			complement: {
				kind: "Preposition",
				preposition: governablePrepositionLemma("auf"),
				case: "Acc",
				referent: "Something",
			},
			realizedCase: "Acc",
		},
	]);
});

// Input indices: Ich0 warte2 darauf4 .5; offsets: Ich0 warte4 darauf10
test("a pronominal adverb stays its own unit and fills the slot of its governor", async () => {
	const { dumgen, traces } = dumgenWith({
		words: [[0], [2], [4]],
		routes: { 0: "Lexeme/PRON", 2: "Lexeme/VERB", 4: "Lexeme/ADV" },
		roles: {},
		expressions: [],
		government: { 4: { governor: 2, case: "Acc" } },
	});
	const analysis = await Effect.runPromise(
		dumgen.analyzeSentence({
			sentence: sentenceOf("warte", "Ich warte darauf."),
		}),
	);
	const verb = targetOf(analysis, 4);
	const adverb = targetOf(analysis, 10);
	if (!verb || !adverb) throw Error("Expected the verb and the adverb");
	expect(resolvedUnitAt(analysis, 10)).toEqual({
		family: "Lexeme",
		kind: "ADV",
		offsets: [10],
	});
	expect(analysis.slots).toEqual([
		{
			governor: verb.id,
			marker: null,
			filler: adverb.id,
			complement: {
				kind: "Preposition",
				preposition: governablePrepositionLemma("auf"),
				case: "Acc",
				referent: "Something",
			},
			realizedCase: "Acc",
		},
	]);
	// A pronominal adverb's filler is a thing; intake does not ask.
	expect(JSON.stringify(traces)).not.toContain("ref_4");
});

test("a sentence without a governable preposition asks no slot question", async () => {
	const { dumgen, traces } = dumgenWith({
		words: [[0, 2], [4], [6]],
		routes: {
			0: "Lexeme/NOUN",
			2: "Lexeme/NOUN",
			4: "Lexeme/VERB",
			6: "Lexeme/ADJ",
		},
		roles: { 0: "Article", 2: "Head" },
		expressions: [],
	});
	const analysis = await Effect.runPromise(
		dumgen.analyzeSentence({
			sentence: sentenceOf("banken", "Die Banken sind geöffnet."),
		}),
	);
	expect(analysis.slots).toEqual([]);
	expect(JSON.stringify(traces)).not.toContain("gov_");
});

// Input indices: Mit0 solchem2 Unsinn4 wollten6 sie8 nichts10 zu12 tun14 haben16 .17
// Offsets: Mit0 solchem4 Unsinn12 wollten19 sie27 nichts31 zu38 tun41 haben45
test("a preposition with a free complement is no fixed word of its expression, which governs it and takes it in", async () => {
	const { dumgen } = dumgenWith({
		words: [[0], [2], [4], [6], [8], [10], [12], [14], [16]],
		routes: {
			0: "Lexeme/ADP",
			2: "Lexeme/DET",
			4: "Lexeme/NOUN",
			6: "Lexeme/VERB",
			8: "Lexeme/PRON",
			10: "Lexeme/PRON",
			12: "Lexeme/PART",
			14: "Lexeme/VERB",
			16: "Lexeme/VERB",
		},
		roles: {},
		expressions: [
			{
				heads: [0, 10, 12, 14, 16],
				kind: { Idiom: 0.6, Collocation: 0.3, None: 0.1 },
				fixedness: 2.2,
			},
		],
		// No one word wins the vote; the expression's words do together.
		government: { 0: { governor: [14, 16] } },
	});
	const analysis = await Effect.runPromise(
		dumgen.analyzeSentence({
			sentence: sentenceOf(
				"unsinn",
				"Mit solchem Unsinn wollten sie nichts zu tun haben.",
			),
		}),
	);
	expect(analysis.phrasemes).toHaveLength(1);
	const phraseme = analysis.phrasemes[0];
	if (!phraseme) throw Error("Expected the expression");
	// The expression takes in the preposition it governs, outside its fixed
	// words and its fixedness (ADR 0034).
	expect(phraseme.governedPrepositions).toEqual([
		targetOf(analysis, 0)?.id ?? "",
	]);
	expect(phraseme.fixedness).toBe(2.2);
	expect(offsetsOf(analysis, phraseme)).toEqual([0, 31, 38, 41, 45]);
	expect(selectPhrasemeKind(analysis, phraseme).kind).toBe("Idiom");
	const slot: Slot = {
		governor: phraseme.id,
		marker: 0,
		filler: null,
		complement: {
			kind: "Preposition",
			preposition: governablePrepositionLemma("mit"),
			case: "Dat",
			referent: "Either",
		},
		realizedCase: "Dat",
	};
	expect(analysis.slots).toEqual([slot]);
	expect(slotsAt(analysis, [0, 31, 38, 41, 45])).toEqual([slot]);
	expect(slotsAt(analysis, [31, 38, 41, 45])).toEqual([]);
	expect(slotsAt(analysis, [45])).toEqual([]);
	for (const offset of [0, 38])
		expect(resolvedUnitAt(analysis, offset)).toEqual({
			family: "Phraseme",
			kind: "Idiom",
			offsets: [0, 31, 38, 41, 45],
		});
	expect(resolvedWordAt(analysis, 0)).toEqual({
		family: "Lexeme",
		kind: "ADP",
		offsets: [0],
	});
	expect(resolvedWordAt(analysis, 38)).toEqual({
		family: "Lexeme",
		kind: "PART",
		offsets: [38],
	});
});

// Without a predicate noun the words cannot be a Collocation. A vote that
// puts Collocation above every Kind they can take named nothing they are;
// a weaker Collocation share leaves the best Kind named, over None too.
for (const [name, kindMass, kind] of [
	["only Collocation", { Collocation: 1 }, "None"],
	[
		"Collocation over Idiom",
		{ Collocation: 0.6, Idiom: 0.3, None: 0.1 },
		"None",
	],
	[
		"Idiom over Collocation, None over both",
		{ None: 0.5, Idiom: 0.3, Collocation: 0.2 },
		"Idiom",
	],
] as const)
	test(`wording without a predicate noun voted ${name} resolves ${kind}`, async () => {
		const { dumgen } = dumgenWith({
			words: [[0], [2], [4], [6], [8], [10], [12], [14], [16]],
			routes: {
				0: "Lexeme/ADP",
				2: "Lexeme/DET",
				4: "Lexeme/NOUN",
				6: "Lexeme/VERB",
				8: "Lexeme/PRON",
				10: "Lexeme/PRON",
				12: "Lexeme/PART",
				14: "Lexeme/VERB",
				16: "Lexeme/VERB",
			},
			roles: {},
			expressions: [
				{ heads: [10, 12, 14, 16], kind: kindMass, fixedness: 2.2 },
			],
			government: { 0: { governor: [14, 16] } },
		});
		const analysis = await Effect.runPromise(
			dumgen.analyzeSentence({
				sentence: sentenceOf(
					"unsinn",
					"Mit solchem Unsinn wollten sie nichts zu tun haben.",
				),
			}),
		);
		const phraseme = analysis.phrasemes[0];
		if (!phraseme) throw Error("Expected the expression");
		expect(selectPhrasemeKind(analysis, phraseme).kind).toBe(kind);
		// Only a named expression takes in the preposition it governs.
		expect(phraseme.governedPrepositions).toEqual(
			kind === "None" ? [] : [targetOf(analysis, 0)?.id ?? ""],
		);
		expect(resolvedUnitAt(analysis, 45)).toEqual(
			kind === "None"
				? { family: "Lexeme", kind: "VERB", offsets: [45] }
				: {
						family: "Phraseme",
						kind,
						offsets: [0, 31, 38, 41, 45],
					},
		);
	});

// Every governor takes in its governed preposition (ADR 0034, issue 607).

const text = (analysis: SentenceAnalysis, target: LexemeTarget | undefined) =>
	target?.members.map(
		(member) =>
			`${analysis.segments.find((s) => s.offset === member.offset)?.text}/${member.role}`,
	);

// Input indices: Er0 ist2 stolz4 auf6 seinen8 Sohn10 .11
// Offsets: Er0 ist3 stolz7 auf13 seinen17 Sohn24
const stolz = sentenceOf("stolz", "Er ist stolz auf seinen Sohn.");
const stolzWords = {
	words: [[0], [2], [4], [6], [8], [10]],
	routes: {
		0: "Lexeme/PRON",
		2: "Lexeme/VERB",
		4: "Lexeme/ADJ",
		6: "Lexeme/ADP",
		8: "Lexeme/DET",
		10: "Lexeme/NOUN",
	},
	roles: {},
	government: {
		6: { governor: 4, case: "Acc", referent: "Someone" },
	},
} as const;

test("an adjective takes in its governed preposition beside a copula, which stays its own word", async () => {
	const { dumgen } = dumgenWith({ ...stolzWords, expressions: [] });
	const analysis = await Effect.runPromise(
		dumgen.analyzeSentence({ sentence: stolz }),
	);
	const adjective = targetOf(analysis, 7);
	expect(text(analysis, adjective)).toEqual([
		"stolz/Head",
		"auf/GovernedPreposition",
	]);
	for (const offset of [7, 13])
		expect(resolvedUnitAt(analysis, offset)).toEqual({
			family: "Lexeme",
			kind: "ADJ",
			offsets: [7, 13],
		});
	expect(resolvedUnitAt(analysis, 3)).toEqual({
		family: "Lexeme",
		kind: "VERB",
		offsets: [3],
	});
	expect(analysis.phrasemes).toEqual([]);
	expect(analysis.slots).toEqual([
		{
			governor: adjective?.id ?? "",
			marker: 13,
			filler: null,
			complement: {
				kind: "Preposition",
				preposition: governablePrepositionLemma("auf"),
				case: "Acc",
				referent: "Someone",
			},
			realizedCase: "Acc",
		},
	]);
});

test("a copula tied to its predicative adjective forms no Collocation", async () => {
	const { dumgen } = dumgenWith({
		...stolzWords,
		expressions: [{ heads: [2, 4], kind: "Collocation", fixedness: 2 }],
	});
	const analysis = await Effect.runPromise(
		dumgen.analyzeSentence({ sentence: stolz }),
	);
	for (const phraseme of analysis.phrasemes)
		expect(selectPhrasemeKind(analysis, phraseme).kind).not.toBe(
			"Collocation",
		);
	expect(resolvedUnitAt(analysis, 3)).toEqual({
		family: "Lexeme",
		kind: "VERB",
		offsets: [3],
	});
	expect(resolvedUnitAt(analysis, 13)).toEqual({
		family: "Lexeme",
		kind: "ADJ",
		offsets: [7, 13],
	});
});

// Input indices: Auf0 ihn2 bin4 ich6 stolz8 .9; offsets: Auf0 ihn4 bin8 ich12 stolz16
test("a fronted governed preposition joins its adjective like a separated particle", async () => {
	const { dumgen } = dumgenWith({
		words: [[0], [2], [4], [6], [8]],
		routes: {
			0: "Lexeme/ADP",
			2: "Lexeme/PRON",
			4: "Lexeme/VERB",
			6: "Lexeme/PRON",
			8: "Lexeme/ADJ",
		},
		roles: {},
		expressions: [],
		government: { 0: { governor: 8, case: "Acc", referent: "Someone" } },
	});
	const analysis = await Effect.runPromise(
		dumgen.analyzeSentence({
			sentence: sentenceOf("auf-ihn", "Auf ihn bin ich stolz."),
		}),
	);
	expect(text(analysis, targetOf(analysis, 16))).toEqual([
		"Auf/GovernedPreposition",
		"stolz/Head",
	]);
	expect(resolvedUnitAt(analysis, 0)).toEqual({
		family: "Lexeme",
		kind: "ADJ",
		offsets: [0, 16],
	});
});

// Input indices: Der0 auf2 seinen4 Sohn6 stolze8 Vater10 lächelt12 .13
// Offsets: Der0 auf4 seinen8 Sohn15 stolze20 Vater27 lächelt33
test("an attributive adjective takes in its governed preposition across its complement", async () => {
	const { dumgen } = dumgenWith({
		words: [[0, 10], [2], [4], [6], [8], [12]],
		routes: {
			0: "Lexeme/NOUN",
			2: "Lexeme/ADP",
			4: "Lexeme/DET",
			6: "Lexeme/NOUN",
			8: "Lexeme/ADJ",
			10: "Lexeme/NOUN",
			12: "Lexeme/VERB",
		},
		roles: { 0: "Article", 10: "Head" },
		expressions: [],
		government: { 2: { governor: 8, case: "Acc", referent: "Someone" } },
	});
	const analysis = await Effect.runPromise(
		dumgen.analyzeSentence({
			sentence: sentenceOf(
				"stolze",
				"Der auf seinen Sohn stolze Vater lächelt.",
			),
		}),
	);
	expect(text(analysis, targetOf(analysis, 20))).toEqual([
		"auf/GovernedPreposition",
		"stolze/Head",
	]);
	expect(resolvedUnitAt(analysis, 4)).toEqual({
		family: "Lexeme",
		kind: "ADJ",
		offsets: [4, 20],
	});
	expect(text(analysis, targetOf(analysis, 27))).toEqual([
		"Der/Article",
		"Vater/Head",
	]);
});

// Input indices: Ich0 gebe2 den4 Kindern6 kleine8 Geschenke10 .11
// Offsets: Ich0 gebe4 den9 Kindern13 kleine21 Geschenke28
test("an article opens onto its own noun, not onto a later adjective's noun", async () => {
	const { dumgen } = dumgenWith({
		words: [[0], [2], [4, 6], [8], [10]],
		routes: {
			0: "Lexeme/PRON",
			2: "Lexeme/VERB",
			4: "Lexeme/NOUN",
			6: "Lexeme/NOUN",
			8: "Lexeme/ADJ",
			10: "Lexeme/NOUN",
		},
		roles: { 4: "Article", 6: "Head" },
		expressions: [],
	});
	const analysis = await Effect.runPromise(
		dumgen.analyzeSentence({
			sentence: sentenceOf(
				"kinder",
				"Ich gebe den Kindern kleine Geschenke.",
			),
		}),
	);
	expect(text(analysis, targetOf(analysis, 13))).toEqual([
		"den/Article",
		"Kindern/Head",
	]);
	expect(text(analysis, targetOf(analysis, 28))).toEqual(["Geschenke/Head"]);
});

// Input indices: Der0 auf2 dem4 Dach6 ist8 mein10 Bruder12 .13
// Offsets: Der0 auf4 dem8 Dach12 ist17 mein21 Bruder26
test("an article before a prepositional phrase with no adjective after it stands alone", async () => {
	const { dumgen } = dumgenWith({
		words: [[0], [2], [4, 6], [8], [10], [12]],
		routes: {
			0: "Lexeme/PRON",
			2: "Lexeme/ADP",
			4: "Lexeme/NOUN",
			6: "Lexeme/NOUN",
			8: "Lexeme/VERB",
			10: "Lexeme/DET",
			12: "Lexeme/NOUN",
		},
		roles: { 4: "Article", 6: "Head" },
		expressions: [],
	});
	const analysis = await Effect.runPromise(
		dumgen.analyzeSentence({
			sentence: sentenceOf("dach", "Der auf dem Dach ist mein Bruder."),
		}),
	);
	expect(text(analysis, targetOf(analysis, 0))).toEqual(["Der/Head"]);
	expect(text(analysis, targetOf(analysis, 26))).toEqual(["Bruder/Head"]);
});

// Input indices: Er0 weiß2 Bescheid4 über6 die8 Pläne10 .11
// Offsets: Er0 weiß3 Bescheid8 über17 die22 Pläne26
const bescheid = sentenceOf("bescheid", "Er weiß Bescheid über die Pläne.");
const bescheidPlan = {
	words: [[0], [2], [4], [6], [8, 10]],
	routes: {
		0: "Lexeme/PRON",
		2: "Lexeme/VERB",
		4: "Lexeme/NOUN",
		6: "Lexeme/ADP",
		8: "Lexeme/NOUN",
		10: "Lexeme/NOUN",
	},
	roles: { 8: "Article", 10: "Head" },
	expressions: [{ heads: [2, 4], kind: "Collocation", fixedness: 2 }],
} as const;

for (const [name, plan] of [
	[
		"the noun that governs only inside it",
		{
			...bescheidPlan,
			government: {
				6: {
					governor: 4,
					case: "Acc",
					referent: "Something",
					scope: "Expression",
				},
			},
		},
	],
	[
		"a vote split over its words",
		{
			...bescheidPlan,
			government: { 6: { governor: [2, 4], case: "Acc" } },
		},
	],
	[
		"the noun the Lexeme layer glued it to",
		{
			...bescheidPlan,
			words: [[0], [2], [4, 6], [8, 10]],
			// The route of a glued preposition is its word's.
			routes: { ...bescheidPlan.routes, 6: "Lexeme/NOUN" },
			roles: {
				4: "Head",
				6: "GovernedPreposition",
				8: "Article",
				10: "Head",
			},
			government: {
				6: {
					governor: 4,
					case: "Acc",
					referent: "Something",
					scope: "Expression",
				},
			},
		},
	],
] as const)
	test(`a Collocation governs and takes in a preposition from ${name}, outside its fixedness`, async () => {
		const { dumgen } = dumgenWith(plan);
		const analysis = await Effect.runPromise(
			dumgen.analyzeSentence({ sentence: bescheid }),
		);
		expect(analysis.phrasemes).toHaveLength(1);
		const phraseme = analysis.phrasemes[0];
		if (!phraseme) throw Error("Expected the Collocation");
		const ueber = targetOf(analysis, 17);
		expect(text(analysis, ueber)).toEqual(["über/Head"]);
		expect(text(analysis, targetOf(analysis, 8))).toEqual([
			"Bescheid/Head",
		]);
		expect(phraseme.governedPrepositions).toEqual([ueber?.id ?? ""]);
		expect(phraseme.fixedness).toBe(2);
		expect(selectPhrasemeKind(analysis, phraseme).kind).toBe("Collocation");
		for (const offset of [3, 8, 17])
			expect(resolvedUnitAt(analysis, offset)).toEqual({
				family: "Phraseme",
				kind: "Collocation",
				offsets: [3, 8, 17],
			});
		expect(resolvedWordAt(analysis, 17)).toEqual({
			family: "Lexeme",
			kind: "ADP",
			offsets: [17],
		});
		expect(analysis.slots.map((slot) => slot.governor)).toEqual([
			phraseme.id,
		]);
		expect(slotsAt(analysis, [3, 8, 17])).toHaveLength(1);
	});

// Input indices: Sie0 hat2 Angst4 vor6 Hunden8 .9
// Offsets: Sie0 hat4 Angst8 vor14 Hunden18
test("a noun that keeps its government alone takes in its preposition inside a Collocation", async () => {
	const { dumgen } = dumgenWith({
		words: [[0], [2], [4], [6], [8]],
		routes: {
			0: "Lexeme/PRON",
			2: "Lexeme/VERB",
			4: "Lexeme/NOUN",
			6: "Lexeme/ADP",
			8: "Lexeme/NOUN",
		},
		roles: {},
		expressions: [{ heads: [2, 4], kind: "Collocation", fixedness: 2 }],
		government: { 6: { governor: 4, case: "Dat", scope: "Word" } },
	});
	const analysis = await Effect.runPromise(
		dumgen.analyzeSentence({
			sentence: sentenceOf("angst-haben", "Sie hat Angst vor Hunden."),
		}),
	);
	const angst = targetOf(analysis, 8);
	expect(text(analysis, angst)).toEqual([
		"Angst/Head",
		"vor/GovernedPreposition",
	]);
	const phraseme = analysis.phrasemes[0];
	if (!phraseme) throw Error("Expected the Collocation");
	expect(phraseme.governedPrepositions).toEqual([]);
	expect(resolvedUnitAt(analysis, 14)).toEqual({
		family: "Phraseme",
		kind: "Collocation",
		offsets: [4, 8, 14],
	});
	expect(resolvedWordAt(analysis, 14)).toEqual({
		family: "Lexeme",
		kind: "NOUN",
		offsets: [8, 14],
	});
	expect(analysis.slots.map((slot) => slot.governor)).toEqual([
		angst?.id ?? "",
	]);
});

// Input indices: Aus0 Angst2 vor4 Hunden6 bleibt8 sie10 zu12 Hause14 .15
// Offsets: Aus0 Angst4 vor10 Hunden14 bleibt21 sie28 zu32 Hause35
test("a noun takes in its governed preposition with no verb around", async () => {
	const { dumgen } = dumgenWith({
		words: [[0], [2], [4], [6], [8], [10], [12], [14]],
		routes: {
			0: "Lexeme/ADP",
			2: "Lexeme/NOUN",
			4: "Lexeme/ADP",
			6: "Lexeme/NOUN",
			8: "Lexeme/VERB",
			10: "Lexeme/PRON",
			12: "Lexeme/ADP",
			14: "Lexeme/NOUN",
		},
		roles: {},
		expressions: [],
		government: { 4: { governor: 2, case: "Dat" } },
	});
	const analysis = await Effect.runPromise(
		dumgen.analyzeSentence({
			sentence: sentenceOf(
				"aus-angst",
				"Aus Angst vor Hunden bleibt sie zu Hause.",
			),
		}),
	);
	expect(resolvedUnitAt(analysis, 10)).toEqual({
		family: "Lexeme",
		kind: "NOUN",
		offsets: [4, 10],
	});
	expect(resolvedUnitAt(analysis, 0)).toEqual({
		family: "Lexeme",
		kind: "ADP",
		offsets: [0],
	});
});

// Input indices: Sie0 spürt2 die4 Angst6 der8 Kinder10 vor12 Hunden14 .15
// Offsets: Sie0 spürt4 die10 Angst14 der20 Kinder24 vor31 Hunden35
test("a noun keeps its article and takes in its governed preposition across a genitive", async () => {
	const { dumgen } = dumgenWith({
		words: [[0], [2], [4, 6], [8, 10], [12], [14]],
		routes: {
			0: "Lexeme/PRON",
			2: "Lexeme/VERB",
			4: "Lexeme/NOUN",
			6: "Lexeme/NOUN",
			8: "Lexeme/NOUN",
			10: "Lexeme/NOUN",
			12: "Lexeme/ADP",
			14: "Lexeme/NOUN",
		},
		roles: { 4: "Article", 6: "Head", 8: "Article", 10: "Head" },
		expressions: [],
		government: { 12: { governor: 6, case: "Dat" } },
	});
	const analysis = await Effect.runPromise(
		dumgen.analyzeSentence({
			sentence: sentenceOf(
				"angst-der-kinder",
				"Sie spürt die Angst der Kinder vor Hunden.",
			),
		}),
	);
	expect(text(analysis, targetOf(analysis, 14))).toEqual([
		"die/Article",
		"Angst/Head",
		"vor/GovernedPreposition",
	]);
	expect(text(analysis, targetOf(analysis, 24))).toEqual([
		"der/Article",
		"Kinder/Head",
	]);
});
