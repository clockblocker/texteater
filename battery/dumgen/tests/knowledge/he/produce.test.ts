import { expect, test } from "bun:test";
import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { applyKnowledgeChanges } from "dumrel";
import * as Effect from "effect/Effect";
import { produceHebrewKnowledge } from "../../../src/knowledge/he/produce.js";
import type { ProduceKnowledgeInput } from "../../../src/knowledge/types.js";
import { defaultLunaConfiguration } from "../../../src/luna.js";
import { lunaResponseOf } from "../../../src/openai-luna.js";
import { pinnedJevModel } from "../../../src/segment/jev.js";
import { requestBudget, runOperation } from "./../../service-test-adapter.js";
import { knowledgeJev, knowledgeLuna, knowledgeLunaInput } from "../support.js";

function checked<U extends Dumling.Unit>(value: U): U {
	const parsed = parseUnit(value);
	if (!parsed.success) throw parsed.error;
	return value;
}
const lemma = checked({
	unitKind: "Lemma",
	language: "he",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "ספר",
	coreFeatures: { gender: "Masc", abbr: null },
} as const satisfies Dumling.Lemma<"he">);
const reading = checked({
	unitKind: "Reading",
	lemma,
	emojiDescription: "📚",
} as const satisfies Dumling.Reading<"he">);
const attestation = checked({
	unitKind: "Attestation",
	surface: {
		unitKind: "Surface",
		language: "he",
		lemma,
		normalizedSurface: "ספר",
		spelling: { kind: "Canonical" },
		surfaceFeatures: null,
		inflectionalFeatures: { number: "Sing", definite: "Ind" },
	},
	members: [{ attested: "ספר", orthography: "Standard" }],
	realizationCoverage: "Full",
	articleEvidence: null,
	valencyEvidence: [],
} as const satisfies Dumling.Attestation<"he">);

const input = (
	overrides: Partial<ProduceKnowledgeInput<never, "he">> = {},
): ProduceKnowledgeInput<never, "he"> => ({
	language: "he",
	reading,
	attestation,
	sentence: {
		segments: [{ text: "קראתי " }, { text: "ספר" }, { text: "." }],
		target: [1],
	},
	origin: "New",
	request: {
		definition: null,
		transcription: null,
		translations: { en: null, ru: null },
	},
	...overrides,
});
const run = (luna: ReturnType<typeof knowledgeLuna>, value = input()) =>
	Effect.runPromise(
		runOperation(
			"knowledge.produce",
			{ budget: requestBudget(4), payloads: true },
			{
				luna: {
					ask: luna.ask,
					configuration: defaultLunaConfiguration,
				},
				jev: { ask: knowledgeJev().ask, model: pinnedJevModel },
			},
			produceHebrewKnowledge(value),
		),
	);

test("Hebrew-owned routes produce supported formula, locution and saying classifications", async () => {
	const cases = [
		{
			family: "Lexeme",
			kind: "INTJ",
			canonicalForm: "שלום",
			aspect: "formulaRole",
			answer: "Greeting",
		},
		{
			family: "Locution",
			kind: "ADV",
			canonicalForm: "על כל פנים",
			aspect: "locutionType",
			answer: "Idiom",
		},
		{
			family: "Saying",
			kind: "Saying",
			canonicalForm: "אין עשן בלי אש",
			aspect: "sayingType",
			answer: { type: "Proverb" },
		},
	] as const;
	for (const row of cases) {
		const parsedReading = parseUnit({
			unitKind: "Reading",
			lemma: {
				unitKind: "Lemma",
				language: "he",
				family: row.family,
				kind: row.kind,
				canonicalForm: row.canonicalForm,
				coreFeatures: {},
			},
			emojiDescription: "💬",
		});
		if (
			!parsedReading.success ||
			parsedReading.chain.unitKind !== "Reading" ||
			parsedReading.chain.language !== "he"
		)
			throw Error("Invalid test Reading");
		const parsedAttestation = parseUnit({
			unitKind: "Attestation",
			surface: {
				unitKind: "Surface",
				language: "he",
				lemma: parsedReading.chain.value.lemma,
				normalizedSurface: row.canonicalForm,
				spelling: { kind: "Canonical" },
				surfaceFeatures: null,
			},
			members: [{ attested: row.canonicalForm, orthography: "Standard" }],
			realizationCoverage: "Full",
		});
		if (
			!parsedAttestation.success ||
			parsedAttestation.chain.unitKind !== "Attestation" ||
			parsedAttestation.chain.language !== "he"
		)
			throw Error(
				parsedAttestation.success
					? "Invalid test Attestation"
					: parsedAttestation.error.message,
			);
		const result = await run(
			knowledgeLuna({ [row.aspect]: row.answer }),
			input({
				reading: parsedReading.chain.value,
				attestation: parsedAttestation.chain.value,
				request: { [row.aspect]: null },
			}),
		);
		expect(result.failures).toEqual([]);
		expect(result.changes as readonly unknown[]).toEqual([
			{ kind: "Contribute", aspect: row.aspect, value: row.answer },
		]);
	}
});

test("Hebrew valency owns function-marked complements, never German cases", async () => {
	const frame = [
		{
			status: "Optional",
			complements: [
				{
					kind: "Preposition",
					preposition: {
						unitKind: "Lemma",
						language: "he",
						family: "Lexeme",
						kind: "ADP",
						canonicalForm: "על",
						coreFeatures: { abbr: null, case: null },
					},
					referent: "Something",
				},
			],
		},
	];
	const luna = knowledgeLuna({ valency: frame });
	const result = await run(luna, input({ request: { valency: null } }));
	expect(result.failures).toEqual([]);
	expect(result.changes as readonly unknown[]).toEqual([
		{ kind: "Contribute", aspect: "valency", value: frame },
	]);
	expect(
		applyKnowledgeChanges({
			source: reading,
			knowledge: {},
			changes: result.changes,
		}).success,
	).toBe(true);
	const wrong = await run(
		knowledgeLuna({
			valency: [
				{
					status: "Required",
					complements: [
						{
							kind: "Case",
							governedCase: "Dat",
							referent: "Someone",
						},
					],
				},
			],
		}),
		input({ request: { valency: null } }),
	);
	expect(wrong.changes).toEqual([]);
	expect(wrong.failures).toMatchObject([
		{ aspect: "valency", code: "InvalidModelOutput" },
	]);
});

test("Hebrew paradigms contribute labeled forms without German structural fields", async () => {
	const paradigm = {
		forms: [
			{ form: "סְפָרִים", features: { number: "Plur", definite: "Ind" } },
			{ form: "סִפְרֵי", features: { number: "Plur", definite: "Cons" } },
		],
	};
	const luna = knowledgeLuna({ hebrewParadigm: paradigm });
	const result = await run(
		luna,
		input({
			request: {
				hebrewParadigm: null,
			},
		}),
	);
	expect(result.failures).toEqual([]);
	expect(result.changes as readonly unknown[]).toEqual([
		{ kind: "Contribute", aspect: "hebrewParadigm", value: paradigm },
	]);
	expect(luna.aspects()).toEqual(["hebrewParadigm"]);
	expect(
		applyKnowledgeChanges({
			source: reading,
			knowledge: {},
			changes: result.changes,
		}).success,
	).toBe(true);
});

test("Hebrew paradigm request preserves a top-level forms object through the real response reader", async () => {
	const paradigm = {
		forms: [
			{ form: "סְפָרִים", features: { number: "Plur", definite: "Ind" } },
		],
	};
	const luna = knowledgeLuna({ hebrewParadigm: null });
	luna.ask = async (request) =>
		lunaResponseOf(
			JSON.stringify({
				status: "completed",
				output: [
					{
						content: [
							{
								type: "output_text",
								text: JSON.stringify(paradigm),
							},
						],
					},
				],
			}),
			request,
		);
	const result = await run(
		luna,
		input({ request: { hebrewParadigm: null } }),
	);
	expect(result.failures).toEqual([]);
	expect(result.changes as readonly unknown[]).toEqual([
		{ kind: "Contribute", aspect: "hebrewParadigm", value: paradigm },
	]);
});

test("Hebrew paradigm keeps valid sparse cells without repairing invalid ones", async () => {
	const known = {
		form: "סְפָרִים",
		features: { number: "Plur", definite: "Ind" },
	};
	const result = await run(
		knowledgeLuna({
			hebrewParadigm: {
				forms: [
					known,
					{
						form: "סִפְרֵי",
						features: { number: ["Plur"], definite: "Cons" },
					},
					{
						form: "סֵפֶר",
						features: { number: "Sing", gender: "Masc" },
					},
				],
			},
		}),
		input({ request: { hebrewParadigm: null } }),
	);
	expect(result.failures.map(({ code }) => code)).toEqual([]);
	expect(result.changes as readonly unknown[]).toEqual([
		{
			kind: "Contribute",
			aspect: "hebrewParadigm",
			value: { forms: [known] },
		},
	]);
});

test("paradigm context separates exact pointed occurrence from normalized surface and lemma", async () => {
	const source = "סִפְרֵי";
	const luna = knowledgeLuna({ hebrewParadigm: null });
	await run(
		luna,
		input({
			attestation: {
				...attestation,
				surface: {
					...attestation.surface,
					normalizedSurface: "ספרי",
					inflectionalFeatures: { number: "Plur", definite: "Cons" },
				},
				members: [{ attested: source, orthography: "Standard" }],
			},
			sentence: {
				segments: [{ text: source }, { text: " הילדים" }],
				target: [0],
			},
			request: { hebrewParadigm: null },
		}),
	);
	expect(luna.sent[0]?.input).toMatchObject({
		reading: { lemma: "ספר" },
		occurrence: {
			source,
			normalizedSurface: "ספרי",
			inflectionalFeatures: { number: "Plur", definite: "Cons" },
		},
	});
});

test("a noun form labeled both absolute indefinite and definite omits both contradictory cells", async () => {
	const absolute = {
		form: "סֵפֶר",
		features: { number: "Sing", definite: "Ind" },
	};
	const construct = {
		form: "סֵפֶר",
		features: { number: "Sing", definite: "Cons" },
	};
	const definite = {
		form: "הַסֵּפֶר",
		features: { number: "Sing", definite: "Def" },
	};
	const result = await run(
		knowledgeLuna({
			hebrewParadigm: {
				forms: [
					absolute,
					{
						form: "סֵפֶר",
						features: { number: "Sing", definite: "Def" },
					},
					construct,
					definite,
				],
			},
		}),
		input({ request: { hebrewParadigm: null } }),
	);
	expect(result.failures.map(({ code }) => code)).toEqual([]);
	expect(result.changes as readonly unknown[]).toEqual([
		{
			kind: "Contribute",
			aspect: "hebrewParadigm",
			value: { forms: [construct, definite] },
		},
	]);
});

test("Hebrew base knowledge uses the resolved sense, validates changes and preserves pointed headwords", async () => {
	const luna = knowledgeLuna({
		definition: "יצירה כתובה לקריאה.",
		transcription: "/ˈsefeʁ/",
		translations: ({ language }) =>
			language === "en" ? ["book"] : ["книга"],
	});
	const result = await run(luna);
	expect(result.failures).toEqual([]);
	expect(result.changes as readonly unknown[]).toEqual([
		{
			kind: "Contribute",
			aspect: "definition",
			value: "יצירה כתובה לקריאה.",
		},
		{ kind: "Contribute", aspect: "transcription", value: "ˈsefeʁ" },
		{
			kind: "Contribute",
			aspect: "translations",
			language: "en",
			value: ["book"],
		},
		{
			kind: "Contribute",
			aspect: "translations",
			language: "ru",
			value: ["книга"],
		},
	]);
	expect(
		applyKnowledgeChanges({
			source: reading,
			knowledge: {},
			changes: result.changes,
		}).success,
	).toBe(true);
	const sent = luna.sent.map((request) => knowledgeLunaInput(request.input));
	for (const value of sent)
		expect(value).toMatchObject({ reading: { emojiDescription: "📚" } });
	expect(
		sent.find((value) => value.aspect === "transcription"),
	).toMatchObject({
		reading: { lemma: "ספר", emojiDescription: "📚" },
		markedSentence: "קראתי <TARGET>ספר</TARGET>.",
		occurrence: {
			source: "ספר",
			normalizedSurface: "ספר",
			inflectionalFeatures: { number: "Sing", definite: "Ind" },
		},
	});
	expect(
		sent.find((value) => value.aspect === "definition")?.markedSentence,
	).toBe("קראתי <TARGET>ספר</TARGET>.");
});
