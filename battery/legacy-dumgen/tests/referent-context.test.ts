import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import { Effect } from "effect";
import type { Questions } from "promptsmith/typesafe";
import { grammarFixture } from "../src/testing.js";
import type { DumgenOptions, GrammarInput } from "../src/types.js";
import { createDumgen } from "../src/universal/dumgen.js";
import { validateEncounter } from "../src/universal/validation.js";

type Core = Dumling.Lemma<"de", "Lexeme", "PRON">["coreFeatures"];
const personal = (features: Partial<Core>): Core => ({
	case: null,
	number: null,
	gender: null,
	extPos: null,
	foreign: null,
	person: "3",
	polite: null,
	poss: null,
	pronType: "Prs",
	...features,
});
const analysis = (canonicalForm: string, core: Core) => ({
	lemma: { canonicalForm, coreFeatures: core },
	surface: {
		spelling: "Canonical",
		surfaceFeatures: null,
		inflectionalFeatures: null,
	},
	normalizedMembers: [canonicalForm],
	memberOrthographies: ["Standard"],
	realizationCoverage: "Full",
});
const her = analysis(
	"sie",
	personal({ case: "Acc", number: "Sing", gender: "Fem" }),
);
const them = analysis("sie", personal({ case: "Acc", number: "Plur" }));

/** `Ich sehe sie.` with the target at the given word. */
function encounter(words: readonly string[], target: number) {
	return validateEncounter({
		sentence: {
			id: words.join(" "),
			language: "de",
			segments: words.flatMap((text, index) => [
				{ kind: "ResolvableText", text },
				{
					kind: "OpaqueText",
					text: index < words.length - 1 ? " " : ".",
				},
			]),
		},
		target: {
			family: "Lexeme",
			kind: "PRON",
			memberSegmentIndices: [target * 2],
		},
	});
}
const ichSeheSie = encounter(["Ich", "sehe", "sie"], 2);

/** The fixture's judgments, recording each question batch and state. */
function recorded(expected: unknown) {
	const fixture = grammarFixture(expected);
	const batches: { questions: Questions; state: Record<string, unknown> }[] =
		[];
	const options: DumgenOptions = {
		...fixture,
		execute: async () => {
			throw Error("Reviewed pronouns need no text generation");
		},
		judge: (request, settings) => {
			batches.push({
				questions: request.questions,
				state: request.state as Record<string, unknown>,
			});
			return fixture.judge(request, settings);
		},
	};
	const referent = () =>
		batches.find(({ questions }) => "referent" in questions);
	return { dumgen: createDumgen(options), referent };
}
const criteria = (question: Questions[string] | undefined) =>
	question?.type === "choice" ? Object.keys(question.criteria).sort() : [];

test("one Sentence while more exists may ask for the neighbours", async () => {
	const { dumgen, referent } = recorded({ decision: "MoreContextRequired" });
	expect(await Effect.runPromise(dumgen.resolveGrammar(ichSeheSie))).toEqual({
		decision: "MoreContextRequired",
	});
	// her, them, and formal Sie misspelled in lowercase.
	expect(criteria(referent()?.questions.referent)).toEqual([
		"MoreContextRequired",
		"cell_0",
		"cell_1",
		"cell_2",
	]);
	expect(referent()?.state).not.toHaveProperty("referentContext");
});

test("a Sentence with no neighbours gets one call that must pick a sie cell", async () => {
	for (const expected of [her, them]) {
		const { dumgen, referent } = recorded(expected);
		const input = { ...ichSeheSie, contextAvailable: false } as const;
		// Must-answer input: the type has no MoreContextRequired, so .surface compiles.
		const attestation = await Effect.runPromise(
			dumgen.resolveGrammar(input),
		);
		expect(attestation.surface.lemma).toMatchObject({
			canonicalForm: "sie",
			coreFeatures: expected.lemma.coreFeatures,
		});
		expect(criteria(referent()?.questions.referent)).toEqual([
			"cell_0",
			"cell_1",
			"cell_2",
		]);
	}
});

test("supplied neighbours reach the judgment, which must pick a cell", async () => {
	const { dumgen, referent } = recorded(her);
	const attestation = await Effect.runPromise(
		dumgen.resolveGrammar({
			...ichSeheSie,
			context: { before: "Maria kommt.", after: "Sie winkt." },
		}),
	);
	expect(attestation.surface.lemma.coreFeatures).toMatchObject({
		gender: "Fem",
		number: "Sing",
	});
	expect(referent()?.state.referentContext).toEqual({
		before: "Maria kommt.",
		after: "Sie winkt.",
	});
	expect(criteria(referent()?.questions.referent)).not.toContain(
		"MoreContextRequired",
	);
});

test("a form only one cell spells never asks for context", async () => {
	const mich = analysis(
		"mich",
		personal({ person: "1", case: "Acc", number: "Sing" }),
	);
	const { dumgen, referent } = recorded(mich);
	const result = await Effect.runPromise(
		dumgen.resolveGrammar(encounter(["Er", "sieht", "mich"], 2)),
	);
	expect(result).toMatchObject({ unitKind: "Attestation" });
	expect(referent()).toBeUndefined();
});

test("a possessive stem ignores a request for the neighbours", async () => {
	// ihrer (hers, theirs) is one Lemma whatever it refers to.
	const hers = {
		...analysis("ihrer", personal({ poss: "Yes" })),
		surface: {
			spelling: "Canonical",
			surfaceFeatures: null,
			inflectionalFeatures: {
				case: "Nom",
				gender: "Masc",
				number: "Sing",
				"gender[psor]": null,
				"number[psor]": null,
				reflex: null,
			},
		},
	};
	const fixture = grammarFixture(hers, { referent: "MoreContextRequired" });
	const result = await Effect.runPromise(
		createDumgen(fixture).resolveGrammar(
			encounter(["Das", "ist", "ihrer"], 2),
		),
	);
	expect(result).toMatchObject({
		surface: { lemma: { canonicalForm: "ihrer" } },
	});
});

test("context must be the non-empty neighbouring Sentences", async () => {
	const dumgen = createDumgen(grammarFixture(her));
	for (const context of [{ before: "" }, { around: "Maria kommt." }])
		expect(
			await Effect.runPromise(
				Effect.flip(
					dumgen.resolveGrammar({
						...ichSeheSie,
						context,
					} as unknown as GrammarInput<"de">),
				),
			),
		).toMatchObject({ _tag: "InvalidInput" });
});
