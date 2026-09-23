import { expect, test } from "bun:test";
import { Effect } from "effect";
import type {
	Questions,
	SystemOneResult,
	TypeSafeExecutor,
} from "promptsmith/typesafe";
import { segmentGerman } from "../src/concrete-lang/de/segmentation/segment.js";
import {
	largestOf,
	resolvedUnitAt,
	selectPhrasemeKind,
	targetOf,
} from "../src/concrete-lang/de/sentence-analysis/analysis.js";
import { placeSegments } from "../src/concrete-lang/de/sentence-analysis/placement.js";
import type { OperationTrace, SegmentedSentence } from "../src/types.js";
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
	}[];
};

/** An injected judge answering every question of the one call from a plan. */
function judgeFrom(plan: Plan): TypeSafeExecutor {
	const sameWord = (a: number, b: number) =>
		plan.words.some((word) => word.includes(a) && word.includes(b));
	const expression = (index: number) =>
		plan.expressions.find((entry) => entry.heads.includes(index));
	return async (request) => {
		const answers = Object.fromEntries(
			Object.entries(request.questions as Questions).map(
				([id, question]) => {
					const [prefix, ...rest] = id.split("_");
					const numbers = rest.map(Number);
					if (question.type === "noul") {
						const [a, b] = numbers as [number, number];
						const shared =
							expression(a) !== undefined &&
							expression(a) === expression(b);
						return [
							id,
							{ type: "noul", noul: shared ? 0.9 : 0.05 },
						];
					}
					if (question.type === "score") {
						const value =
							expression(numbers[0] ?? -1)?.fixedness ?? 0.4;
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
