import { isRecord } from "common-utils";
import { ParsingError } from "common-utils/validation";
import { readingIdentityKey } from "dumling";
import type * as Dumling from "dumling/types";
import { applyParadigmChanges } from "./apply-paradigm-changes.js";
import { compare } from "./fingerprint.js";
import { paradigmChangesFor } from "./paradigm.js";
import { parseReadingKnowledge } from "./parse-reading-knowledge.js";
import type {
	DimensionId,
	LemmaParadigm,
	ParadigmChange,
	ReadingWithKnowledge,
} from "./types.js";

/** The principal-part aspects Reading Knowledge held before ADR 0048. */
const principalPartAspects = [
	"plural",
	"conjugationClass",
	"preterite",
	"presentSingular",
	"pastParticiple",
	"subjunctivePast",
] as const;

type Path = (number | string)[];
const issue = (path: Path, message: string) =>
	new ParsingError([{ code: "custom", path, message }]);

/**
 * Moves the principal parts a Lemma's Readings stored as Reading Knowledge
 * before ADR 0048 into the Lemma's Paradigm, deterministically, and answers
 * the Paradigm with each Reading's remaining Knowledge, parsed:
 *
 * - each stored form or marker becomes a variant with provenance `Migrated`,
 *   pooled across the Readings by content id (`plural` → `plural`,
 *   `preterite` → `preterite`, `presentSingular` → `present1`, `present2` and
 *   `present3`, `pastParticiple` and `subjunctivePast` alike);
 * - a Reading that stored a dimension gets an explicit Licence of its forms,
 *   and one that stored nothing is Unstated there;
 * - a `conjugationClass` is dropped, since code derives classes from forms
 *   only.
 *
 * Readings are pooled in code-unit order of their identity keys, so two
 * spellings of one variant keep the first Reading's whatever the input
 * order. Readings come back in input order. A form the Paradigm would refuse,
 * or Knowledge that fails to parse, fails the migration with no partial value.
 */
export function migratePrincipalParts<const R extends Dumling.Reading>(input: {
	readonly lemma: Dumling.Lemma;
	readonly readings: readonly {
		readonly reading: R;
		readonly knowledge: unknown;
	}[];
}):
	| {
			readonly success: true;
			readonly value: {
				readonly paradigm: LemmaParadigm;
				readonly readings: ReadingWithKnowledge<R>[];
			};
	  }
	| { readonly success: false; readonly error: ParsingError } {
	const changes: ParadigmChange[] = [];
	const remaining: ReadingWithKnowledge<R>[] = [];
	const order = input.readings
		.map((entry, index) => ({
			...entry,
			index,
			key: readingIdentityKey(entry.reading),
		}))
		.sort((left, right) => compare(left.key, right.key));
	for (const { reading, knowledge, index } of order) {
		if (!isRecord(knowledge))
			return failed(
				issue(
					["readings", index, "knowledge"],
					"Expected Reading Knowledge",
				),
			);
		const forms = legacyForms(knowledge, ["readings", index, "knowledge"]);
		if (forms instanceof ParsingError) return failed(forms);
		for (const [dimension, values] of forms)
			changes.push(
				...paradigmChangesFor({
					reading,
					dimension,
					values,
					provenance: "Migrated",
				}),
			);
	}
	for (const [index, { reading, knowledge }] of input.readings.entries()) {
		const rest = Object.fromEntries(
			Object.entries(isRecord(knowledge) ? knowledge : {}).filter(
				([aspect]) =>
					!(principalPartAspects as readonly string[]).includes(
						aspect,
					),
			),
		);
		const parsed = parseReadingKnowledge({
			source: reading,
			knowledge: rest as never,
		});
		if (!parsed.success)
			return failed(prefixed(parsed.error, ["readings", index]));
		remaining.push({ reading, knowledge: parsed.value });
	}
	const paradigm = applyParadigmChanges({
		lemma: input.lemma,
		readings: input.readings.map((entry) => entry.reading),
		paradigm: { dimensions: {} },
		changes,
	});
	if (!paradigm.success) return paradigm;
	return {
		success: true,
		value: { paradigm: paradigm.value, readings: remaining },
	};
}

/** Each legacy principal part a Reading stored, as the dimension it moves to and its values. */
function legacyForms(
	knowledge: Readonly<Record<string, unknown>>,
	path: Path,
): [DimensionId, string[]][] | ParsingError {
	const forms: [DimensionId, string[]][] = [];
	const {
		plural,
		preterite,
		presentSingular,
		pastParticiple,
		subjunctivePast,
	} = knowledge;
	if (plural !== undefined) {
		const values = typeof plural === "string" ? [plural] : strings(plural);
		if (values === undefined)
			return issue([...path, "plural"], "A plural is forms or a marker");
		forms.push(["plural", values]);
	}
	for (const [aspect, value] of [
		["preterite", preterite],
		["pastParticiple", pastParticiple],
		["subjunctivePast", subjunctivePast],
	] as const) {
		if (value === undefined) continue;
		const values = strings(value);
		if (values === undefined)
			return issue([...path, aspect], `A ${aspect} is a list of forms`);
		forms.push([aspect, values]);
	}
	if (presentSingular !== undefined) {
		if (!isRecord(presentSingular))
			return issue(
				[...path, "presentSingular"],
				"A Präsens singular holds each person's forms",
			);
		for (const [person, dimension] of [
			["first", "present1"],
			["second", "present2"],
			["third", "present3"],
		] as const) {
			const values = strings(presentSingular[person]);
			if (values === undefined)
				return issue(
					[...path, "presentSingular", person],
					"A Präsens person is a list of forms",
				);
			forms.push([dimension, values]);
		}
	}
	return forms;
}

function strings(value: unknown): string[] | undefined {
	return Array.isArray(value) &&
		value.every((entry) => typeof entry === "string")
		? [...value]
		: undefined;
}

function prefixed(error: ParsingError, path: Path): ParsingError {
	return new ParsingError(
		error.issues.map((entry) => ({
			...entry,
			path: [...path, ...entry.path],
		})),
	);
}

const failed = (error: ParsingError) => ({ success: false, error }) as const;
