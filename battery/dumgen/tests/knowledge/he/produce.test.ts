import { expect, test } from "bun:test";
import { parseUnit } from "dumling";
import type * as Dumling from "dumling/types";
import { applyKnowledgeChanges } from "dumrel";
import * as Effect from "effect/Effect";
import { accumulateHebrewValency } from "../../../src/knowledge/he/accumulate-valency.js";
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
const tr = (text: string) => [{ kind: "Text" as const, text }];

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
			{ budget: requestBudget(6), payloads: true },
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
		[
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
			},
		],
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
	const luna = knowledgeLuna({
		hebrewParadigm: {
			cells: [
				{
					slotId: "noun-plur-absolute",
					answer: {
						form: "סְפָרִים",
						witness: {
							before: "קראתי ",
							target: "סְפָרִים",
							after: " רבים.",
						},
					},
				},
				{
					slotId: "noun-plur-construct",
					answer: {
						form: "סִפְרֵי",
						witness: {
							before: "קראתי את ",
							target: "סִפְרֵי",
							after: " הילדים.",
						},
					},
				},
			],
		},
	});
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

test("Hebrew paradigm request preserves a top-level private cells object through the real response reader", async () => {
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
								text: JSON.stringify({
									cells: [
										{
											slotId: "noun-plur-absolute",
											answer: {
												form: "סְפָרִים",
												witness: {
													before: "קראתי ",
													target: "סְפָרִים",
													after: " רבים.",
												},
											},
										},
									],
								}),
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

test("Hebrew paradigm keeps valid private cells without repairing mismatched witnesses", async () => {
	const result = await run(
		knowledgeLuna({
			hebrewParadigm: {
				cells: [
					{
						slotId: "noun-plur-absolute",
						answer: {
							form: "סְפָרִים",
							witness: {
								before: "קראתי ",
								target: "סְפָרִים",
								after: " רבים.",
							},
						},
					},
					{
						slotId: "noun-plur-construct",
						answer: {
							form: "סִפְרֵי",
							witness: {
								before: "קראתי ",
								target: "סְפָרֵי",
								after: " הילדים.",
							},
						},
					},
				],
			},
		}),
		input({ request: { hebrewParadigm: null } }),
	);
	expect(result.failures).toEqual([]);
	expect(result.changes).toEqual([
		{
			kind: "Contribute",
			aspect: "hebrewParadigm",
			value: {
				forms: [
					{
						form: "סְפָרִים",
						features: { number: "Plur", definite: "Ind" },
					},
				],
			},
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

test("all-null private paradigm cells abstain without fabricated forms", async () => {
	const luna = knowledgeLuna({
		hebrewParadigm: {
			cells: [{ slotId: "noun-sing-absolute", answer: null }],
		},
	});
	const result = await run(
		luna,
		input({ request: { hebrewParadigm: null } }),
	);
	expect(result.changes).toEqual([]);
	expect(result.failures).toMatchObject([
		{ aspect: "hebrewParadigm", code: "Unresolved" },
	]);
	expect(luna.sent[0]?.input).toHaveProperty("slots");
	expect(luna.aspects()).toEqual(["hebrewParadigm"]);
});

test("actual transcription returns correct IPA in one writer call through the real response reader", async () => {
	const luna = knowledgeLuna({});
	const received: unknown[] = [];
	luna.ask = async (request) => {
		received.push(request.input);
		return lunaResponseOf(
			JSON.stringify({
				status: "completed",
				output: [
					{
						content: [
							{
								type: "output_text",
								text: JSON.stringify({ value: "ˈsefeʁ" }),
							},
						],
					},
				],
			}),
			request,
		);
	};
	const result = await run(luna, input({ request: { transcription: null } }));
	expect(result.failures).toEqual([]);
	expect(result.changes).toEqual([
		{ kind: "Contribute", aspect: "transcription", value: "ˈsefeʁ" },
	]);
	expect(received).toHaveLength(1);
	expect(received[0]).toMatchObject({
		aspect: "transcription",
		reading: { lemma: "ספר" },
		occurrence: { source: "ספר" },
	});
});

test("actual transcription rejects private citation objects under the restored legacy text contract", async () => {
	const luna = knowledgeLuna({
		transcription: {
			pointedCitation: "סְפָרִים",
			citationRole: "ResolvedCanonical",
			citationFeatures: {
				gender: "Masc",
				number: "Plur",
				definite: "Ind",
			},
			syllableCount: 2,
			stressedSyllable: 2,
			finalYod: "Absent",
			furtivePatah: false,
		},
	});
	const result = await run(luna, input({ request: { transcription: null } }));
	expect(result.changes).toEqual([]);
	expect(result.failures).toMatchObject([
		{ aspect: "transcription", code: "InvalidModelOutput" },
	]);
	expect(luna.aspects()).toEqual(["transcription"]);
});

test("Hebrew base knowledge uses the resolved sense, validates changes and preserves pointed headwords", async () => {
	const luna = knowledgeLuna({
		definition: "יצירה כתובה לקריאה.",
		transcription: "ˈsefeʁ",
		translations: ({ language }) =>
			language === "en" ? [tr("book")] : [tr("книга")],
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
			value: [tr("book")],
		},
		{
			kind: "Contribute",
			aspect: "translations",
			language: "ru",
			value: [tr("книга")],
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

test("Hebrew repeated encounters extract a native concrete pattern and contribute it only when new", async () => {
	const pattern: import("dumrel/types").ValencyPattern = [
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
		},
	];
	const execute = (known: boolean) => {
		const luna = knowledgeLuna({ valency: [pattern] });
		return Effect.runPromise(
			runOperation(
				"knowledge.accumulateValency",
				{ budget: requestBudget(6), payloads: true },
				{
					luna: {
						ask: luna.ask,
						configuration: defaultLunaConfiguration,
					},
					jev: { ask: knowledgeJev().ask, model: pinnedJevModel },
				},
				accumulateHebrewValency({
					language: "he",
					reading,
					attestation,
					sentence: input().sentence,
					valency: known ? [[...pattern]] : [],
				}),
			),
		);
	};
	const first = await execute(false);
	expect(first.failures).toEqual([]);
	expect(first.realizedPattern).toEqual(pattern);
	expect(first.changes).toEqual([
		{ kind: "Contribute", aspect: "valency", value: [pattern] },
	]);
	const repeat = await execute(true);
	expect(repeat.failures).toEqual([]);
	expect(repeat.realizedPattern).toEqual(pattern);
	expect(repeat.changes).toEqual([]);
});

test("Hebrew repeat valency preserves the stored pattern when complements are reordered", async () => {
	const preposition = (canonicalForm: string) => ({
		kind: "Preposition" as const,
		preposition: {
			unitKind: "Lemma" as const,
			language: "he" as const,
			family: "Lexeme" as const,
			kind: "ADP" as const,
			canonicalForm,
			coreFeatures: { abbr: null, case: null },
		},
	});
	const stored: import("dumrel/types").ValencyPattern = [
		preposition("על"),
		preposition("ל"),
	];
	const reversed = [...stored].reverse();
	const luna = knowledgeLuna({ valency: [reversed] });
	const result = await Effect.runPromise(
		runOperation(
			"knowledge.accumulateValency",
			{ budget: requestBudget(6), payloads: true },
			{
				luna: {
					ask: luna.ask,
					configuration: defaultLunaConfiguration,
				},
				jev: { ask: knowledgeJev().ask, model: pinnedJevModel },
			},
			accumulateHebrewValency({
				language: "he",
				reading,
				attestation,
				sentence: input().sentence,
				valency: [stored],
			}),
		),
	);
	expect(result.failures).toEqual([]);
	expect(result.changes).toEqual([]);
	expect(result.realizedPattern).toEqual(stored);
});
