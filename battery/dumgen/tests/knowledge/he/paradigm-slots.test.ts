import { expect, test } from "bun:test";
import type * as Dumling from "dumling/types";
import {
	hebrewSlotResponseSchema,
	planHebrewParadigmSlots,
	projectHebrewSlotAnswers,
} from "../../../src/knowledge/he/paradigm-slots.js";

const noun = {
	unitKind: "Reading",
	lemma: {
		unitKind: "Lemma",
		language: "he",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "ספר",
		coreFeatures: { gender: "Masc", abbr: null },
	},
	emojiDescription: "📚",
} as const satisfies Dumling.Reading<"he">;
const adjective = {
	...noun,
	lemma: {
		...noun.lemma,
		kind: "ADJ",
		canonicalForm: "טוב",
		coreFeatures: { abbr: null },
	},
} as const satisfies Dumling.Reading<"he">;
const verb = {
	...noun,
	lemma: {
		...noun.lemma,
		kind: "VERB",
		canonicalForm: "כתב",
		coreFeatures: { hebBinyan: "PAAL", hebExistential: null },
	},
} as const satisfies Dumling.Reading<"he">;
function required<T>(value: T | undefined): T {
	if (value === undefined)
		throw new Error("Required test fixture is missing");
	return value;
}
const plan = planHebrewParadigmSlots(noun);
const absolute = required(
	plan.find(
		(slot) =>
			slot.nativeFeatures.number === "Plur" &&
			slot.nativeFeatures.definite === "Ind",
	),
);
const construct = required(
	plan.find((slot) => slot.nativeFeatures.definite === "Cons"),
);
const cell = (slotId: string, form = "סְפָרִים", target = form) => ({
	slotId,
	answer: { form, witness: { before: "קראתי ", target, after: " רבים." } },
});

test("bounded code-owned native plans omit noun gender and adjective definiteness", () => {
	expect(plan.map((slot) => slot.nativeFeatures)).toEqual([
		{ number: "Sing", definite: "Ind" },
		{ number: "Plur", definite: "Ind" },
		{ number: "Plur", definite: "Cons" },
	]);
	const adj = planHebrewParadigmSlots(adjective);
	expect(adj).toHaveLength(4);
	for (const slots of [plan, adj, planHebrewParadigmSlots(verb)]) {
		expect(new Set(slots.map((slot) => slot.id)).size).toBe(slots.length);
		for (const slot of slots)
			expect(slot.instruction.length).toBeGreaterThan(0);
	}
	for (const slot of adj)
		expect(slot.nativeFeatures.definite).toBeUndefined();
	expect(
		planHebrewParadigmSlots({
			...verb,
			lemma: { ...verb.lemma, kind: "AUX" },
		} as unknown as Dumling.Reading),
	).toEqual([]);
});

test("projects by slot ID only, with no private evidence or model features", () => {
	const result = projectHebrewSlotAnswers(noun, plan, {
		cells: [
			{ slotId: construct.id, answer: null },
			cell(absolute.id),
			cell("unknown"),
		],
	});
	expect(result).toEqual({
		forms: [{ form: "סְפָרִים", features: absolute.nativeFeatures }],
	});
	expect(
		projectHebrewSlotAnswers(noun, plan, {
			cells: [
				{
					...cell(absolute.id),
					answer: {
						...cell(absolute.id).answer,
						features: { definite: "Cons" },
					},
				},
			],
		}),
	).toBeNull();
});

test("witness vowel mismatch omits only the malformed sibling", () => {
	expect(
		projectHebrewSlotAnswers(noun, plan, {
			cells: [cell(absolute.id), cell(construct.id, "סִפְרֵי", "סְפָרֵי")],
		}),
	).toEqual({
		forms: [{ form: "סְפָרִים", features: absolute.nativeFeatures }],
	});
	const literal = "סֶּפֶר";
	expect(
		projectHebrewSlotAnswers(noun, plan, {
			cells: [cell(absolute.id, literal, literal.normalize("NFC"))],
		})?.forms[0]?.form,
	).toBe(literal);
});

test("construct complements remain witness-only and missing cells stay missing", () => {
	const answer = cell(construct.id, "סִפְרֵי");
	answer.answer.witness.after = " הילדים.";
	expect(projectHebrewSlotAnswers(noun, plan, { cells: [answer] })).toEqual({
		forms: [{ form: "סִפְרֵי", features: construct.nativeFeatures }],
	});
	expect(
		projectHebrewSlotAnswers(noun, plan, {
			cells: [cell(construct.id, "סִפְרֵי הילדים")],
		}),
	).toBeNull();
	for (const cells of [
		[],
		plan.map((slot) => ({ slotId: slot.id, answer: null })),
	])
		expect(projectHebrewSlotAnswers(noun, plan, { cells })).toBeNull();
});

test("duplicate IDs are omitted entirely without discarding good siblings", () => {
	expect(
		projectHebrewSlotAnswers(noun, plan, {
			cells: [
				cell(absolute.id),
				cell(absolute.id),
				cell(construct.id, "סִפְרֵי"),
			],
		}),
	).toEqual({
		forms: [{ form: "סִפְרֵי", features: construct.nativeFeatures }],
	});
});

test("strict cell gates reject markup, empty context, excessive length and extra fields independently", () => {
	const bad = [
		{ ...cell(construct.id), extra: true },
		{
			slotId: construct.id,
			answer: {
				...cell(construct.id).answer,
				witness: { before: " ", target: "סְפָרִים", after: "" },
			},
		},
		{
			slotId: construct.id,
			answer: {
				...cell(construct.id).answer,
				witness: { before: "<b>", target: "סְפָרִים", after: "</b>" },
			},
		},
		{
			slotId: construct.id,
			answer: {
				...cell(construct.id).answer,
				witness: {
					before: "א".repeat(160),
					target: "סְפָרִים",
					after: ".",
				},
			},
		},
	];
	for (const candidate of bad)
		expect(
			projectHebrewSlotAnswers(noun, plan, {
				cells: [candidate, cell(absolute.id)],
			})?.forms,
		).toHaveLength(1);
	for (const output of [
		null,
		[],
		{ forms: [] },
		{ cells: [], approved: true },
	])
		expect(projectHebrewSlotAnswers(noun, plan, output)).toBeNull();
});

test("nonfinite bundles have no finite features; mechanical self-agreement is NOT lexical verification", () => {
	const slots = planHebrewParadigmSlots(verb);
	expect(slots).toHaveLength(4);
	expect(slots.map((slot) => slot.nativeFeatures)).toEqual([
		{ tense: "Past", person: "3", gender: "Masc", number: "Sing" },
		{ verbForm: "Part", gender: "Masc", number: "Sing" },
		{ verbForm: "Part", gender: "Fem", number: "Sing" },
		{ verbForm: "Inf" },
	]);
	// Deliberately synthetic: matching spelling cannot establish correct Hebrew vowels.
	const result = projectHebrewSlotAnswers(verb, slots, {
		cells: [cell(required(slots[3]).id, "לַזְבְּגֵל")],
	});
	expect(result).toEqual({
		forms: [{ form: "לַזְבְּגֵל", features: { verbForm: "Inf" } }],
	});
	expect(JSON.stringify(result)).not.toMatch(
		/witness|verified|confidence|approval|slotId/,
	);
});

test("private JSON schema is a strict cells envelope with nullable answers", () => {
	expect(hebrewSlotResponseSchema.type).toBe("object");
	expect(hebrewSlotResponseSchema.required).toEqual(["cells"]);
	expect(hebrewSlotResponseSchema.additionalProperties).toBe(false);
	expect(JSON.stringify(hebrewSlotResponseSchema)).not.toContain(
		'"features"',
	);
});
