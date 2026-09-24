import { expect, test } from "bun:test";
import { Effect } from "effect";
import type {
	Questions,
	SystemOneResult,
	TypeSafeExecutor,
} from "promptsmith/typesafe";
import { governablePrepositionIn } from "../src/concrete-lang/de/governable-prepositions.js";
import { segmentGerman } from "../src/concrete-lang/de/segmentation/segment.js";
import {
	governedPrepositionsAt,
	headOf,
	largestOf,
	resolvedUnitAt,
	selectIdentity,
	selectPhrasemeKind,
	targetOf,
} from "../src/concrete-lang/de/sentence-analysis/analysis.js";
import { placeSegments } from "../src/concrete-lang/de/sentence-analysis/placement.js";
import type {
	LexemeTarget,
	OperationTrace,
	SegmentedSentence,
	SentenceAnalysis,
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
	/** Phraseme groups by head index with their Kind and fixedness. */
	readonly expressions: readonly {
		readonly heads: readonly number[];
		readonly kind: string;
		readonly fixedness: number;
		/** Free words the pair answers still tie to the expression. */
		readonly carried?: readonly number[];
	}[];
	/** Head pairs the pair answers tie across expressions. */
	readonly crossLinks?: readonly (readonly [number, number])[];
	/** Governor and case per governable preposition index; every other one is None. */
	readonly government?: Readonly<
		Record<number, { readonly governor?: number; readonly case?: string }>
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
					if (prefix === "m") {
						const [anchor, other] = numbers as [number, number];
						chosen = sameWord(anchor, other)
							? "Include"
							: "Exclude";
					} else if (prefix === "route")
						chosen = plan.routes[numbers[0] ?? -1] ?? "Unresolved";
					else if (prefix === "role")
						chosen = plan.roles[numbers[0] ?? -1] ?? "Free";
					else if (prefix === "id") chosen = "NoMatch";
					else if (prefix === "pk")
						chosen = expression(numbers[0] ?? -1)?.kind ?? "None";
					else if (prefix === "gov") {
						const governor =
							plan.government?.[numbers[0] ?? -1]?.governor;
						chosen =
							governor === undefined ? "None" : `s${governor}`;
					} else if (prefix === "case")
						chosen =
							plan.government?.[numbers[0] ?? -1]?.case ??
							"Unresolved";
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
									option === chosen ? 1 : 0,
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
	expect(selectPhrasemeKind(phraseme).kind).toBe("Collocation");
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
	expect(analysis.government).toHaveLength(1);
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
		const sentence = sentenceOf(fused, text);
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
		government: [],
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
	expect(analysis.government).toEqual([
		{ offset: 29, preposition: "vor", case: "Dat", governor: angst.id },
	]);
	expect(
		governedPrepositionsAt(
			analysis,
			angst.members.map((member) => member.offset),
		),
	).toEqual([{ preposition: "vor", case: "Dat" }]);
	const hat = analysis.segments.find((s) => s.text === "hat");
	expect(governedPrepositionsAt(analysis, [hat?.offset ?? -1])).toEqual([]);
	expect(JSON.stringify(traces)).toContain("gov_12");
	expect(JSON.stringify(traces)).toContain("case_12");
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
		government: { 4: { case: "Acc" } },
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
	expect(analysis.government).toEqual([
		{ offset: 10, preposition: "auf", case: "Acc", governor: verb.id },
	]);
});

test("a sentence without a governable preposition asks no government question", async () => {
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
	expect(analysis.government).toEqual([]);
	expect(JSON.stringify(traces)).not.toContain("gov_");
});
