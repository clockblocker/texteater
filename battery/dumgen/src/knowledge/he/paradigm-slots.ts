import { isRecord } from "common-utils";
import type * as Dumling from "dumling/types";
import { parseKnowledgeChange } from "dumrel";
import type * as Dumrel from "dumrel/types";

type HebrewParadigmForm = NonNullable<
	Dumrel.ReadingKnowledge["hebrewParadigm"]
>["forms"][number];

export type HebrewParadigmSlot = {
	readonly id: string;
	readonly instruction: string;
	readonly nativeFeatures: HebrewParadigmForm["features"];
};

function nativeCell(
	reading: Dumling.Reading,
	form: string,
	features: HebrewParadigmForm["features"],
): boolean {
	return parseKnowledgeChange({
		source: reading,
		change: {
			kind: "Contribute",
			aspect: "hebrewParadigm",
			value: { forms: [{ form, features }] },
		},
	}).success;
}

/** Requests are sparse opportunities to abstain, never a completeness promise. */
export function planHebrewParadigmSlots(
	reading: Dumling.Reading,
): readonly HebrewParadigmSlot[] {
	if (reading.lemma.language !== "he" || reading.lemma.family !== "Lexeme")
		return [];
	const slots: HebrewParadigmSlot[] = [];
	function add(
		id: string,
		instruction: string,
		nativeFeatures: HebrewParadigmForm["features"],
	) {
		if (nativeCell(reading, "צורה", nativeFeatures))
			slots.push({
				id,
				instruction: `${instruction} Return a positively known fully pointed head in this Reading's sense, or null if unavailable or uncertain. Supply a short natural contemporary Hebrew witness using exactly that head as target; keep complements in the context. Do not synthesize a stem or ending, substitute a synonym or change binyan.`,
				nativeFeatures,
			});
	}
	switch (reading.lemma.kind) {
		case "NOUN":
			add(
				"noun-sing-absolute",
				"Singular absolute (not construct), without an article.",
				{ number: "Sing", definite: "Ind" },
			);
			add(
				"noun-plur-absolute",
				"Plural absolute (not construct), without an article.",
				{ number: "Plur", definite: "Ind" },
			);
			add(
				"noun-plur-construct",
				"Plural construct head (סמיכות); its complement belongs only in witness.after, not in form.",
				{ number: "Plur", definite: "Cons" },
			);
			break;
		case "ADJ":
			for (const gender of ["Masc", "Fem"] as const)
				for (const number of ["Sing", "Plur"] as const)
					add(
						`adj-${gender}-${number}`,
						`Unmarked adjective: ${gender}, ${number}, without an article.`,
						{ gender, number },
					);
			break;
		case "VERB":
			add(
				"verb-past-3ms",
				"Finite past, third person masculine singular; not a participle.",
				{ tense: "Past", person: "3", gender: "Masc", number: "Sing" },
			);
			add(
				"verb-part-ms",
				"Masculine singular participle, not a finite past form.",
				{ verbForm: "Part", gender: "Masc", number: "Sing" },
			);
			add(
				"verb-part-fs",
				"Feminine singular participle, not a finite past form.",
				{ verbForm: "Part", gender: "Fem", number: "Sing" },
			);
			add(
				"verb-inf",
				"Infinitive, including its infinitival ל when appropriate; no finite or agreement features.",
				{ verbForm: "Inf" },
			);
	}
	return slots;
}

const shortString = { type: "string", maxLength: 160 };

/** Private model DTO: feature labels and verification claims are not accepted. */
export const hebrewSlotResponseSchema: Record<string, unknown> = {
	type: "object",
	additionalProperties: false,
	required: ["cells"],
	properties: {
		cells: {
			type: "array",
			maxItems: 4,
			items: {
				type: "object",
				additionalProperties: false,
				required: ["slotId", "answer"],
				properties: {
					slotId: { type: "string", minLength: 1 },
					answer: {
						anyOf: [
							{ type: "null" },
							{
								type: "object",
								additionalProperties: false,
								required: ["form", "witness"],
								properties: {
									form: { ...shortString, minLength: 1 },
									witness: {
										type: "object",
										additionalProperties: false,
										required: ["before", "target", "after"],
										properties: {
											before: shortString,
											target: {
												...shortString,
												minLength: 1,
											},
											after: shortString,
										},
									},
								},
							},
						],
					},
				},
			},
		},
	},
};

function exactKeys(value: Record<string, unknown>, keys: readonly string[]) {
	return (
		Object.keys(value).length === keys.length &&
		keys.every((key) => Object.hasOwn(value, key))
	);
}

function plain(value: unknown): value is string {
	return (
		typeof value === "string" && !/[<>`*_[\]{}]|&(?:#\w+|\w+);/u.test(value)
	);
}

function witnessedForm(answer: unknown): string | null {
	if (
		!isRecord(answer) ||
		!exactKeys(answer, ["form", "witness"]) ||
		!plain(answer.form) ||
		!answer.form.trim()
	)
		return null;
	const witness = answer.witness;
	if (
		!isRecord(witness) ||
		!exactKeys(witness, ["before", "target", "after"]) ||
		!plain(witness.before) ||
		!plain(witness.target) ||
		!plain(witness.after)
	)
		return null;
	if (
		!(witness.before + witness.after).trim() ||
		[...(witness.before + witness.target + witness.after)].length > 160 ||
		answer.form.normalize("NFC") !== witness.target.normalize("NFC")
	)
		return null;
	return answer.form;
}

/** Mechanical gates only: a matching generated witness is NOT lexical evidence. */
export function projectHebrewSlotAnswers(
	reading: Dumling.Reading,
	plan: readonly HebrewParadigmSlot[],
	output: unknown,
): { forms: HebrewParadigmForm[] } | null {
	if (
		!isRecord(output) ||
		!exactKeys(output, ["cells"]) ||
		!Array.isArray(output.cells)
	)
		return null;
	const counts = new Map<string, number>();
	for (const cell of output.cells)
		if (isRecord(cell) && typeof cell.slotId === "string")
			counts.set(cell.slotId, (counts.get(cell.slotId) ?? 0) + 1);
	const forms: HebrewParadigmForm[] = [];
	for (const cell of output.cells) {
		if (
			!isRecord(cell) ||
			!exactKeys(cell, ["slotId", "answer"]) ||
			typeof cell.slotId !== "string" ||
			counts.get(cell.slotId) !== 1
		)
			continue;
		const slots = plan.filter((slot) => slot.id === cell.slotId);
		const slot = slots[0];
		if (slots.length !== 1 || !slot) continue;
		const form = witnessedForm(cell.answer);
		if (form === null) continue;
		if (
			(reading.lemma.kind === "NOUN" || reading.lemma.kind === "ADJ") &&
			/\s/u.test(form)
		)
			continue;
		if (!nativeCell(reading, form, slot.nativeFeatures)) continue;
		forms.push({ form, features: { ...slot.nativeFeatures } });
	}
	return forms.length ? { forms } : null;
}
