/**
 * The licence judge (ADR 0048, Dumgen ADR 0003, #1260): for a Lemma's
 * later Reading, after Luna wrote its forms, one jev request with one
 * question per Variation Dimension whose written forms differ from the
 * stored variants.
 *
 * - A question shows the stored variants and Luna's new forms together,
 *   sorted as German sorts them, so nothing tells which Reading holds a
 *   form or which form Luna wrote.
 * - Its options are the selections of those forms, so the judge may take
 *   one form, several or all. A marker (`NoPlural`) is only ever selected
 *   alone, since Dumrel refuses a Licence that holds a marker beside a form.
 * - The judge takes the selection it picks, and nothing else: a form Luna
 *   omitted can still be taken, and only the judge's choice leaves one out.
 */
import type * as Dumrel from "dumrel/types";
import * as Effect from "effect/Effect";
import { InvalidModelOutput } from "../../errors.js";
import { choice, choiceOf } from "../../segment/ask.js";
import {
	type AspectContext,
	type AspectError,
	judgeState,
	KnowledgeUnresolved,
} from "./context.js";
import {
	dimensionParts,
	licencePolicy,
	licenceQuestion,
	markerForms,
} from "./licence-prompts.js";

/** jev's request, as the trace and a cache key it. */
const judgeStage = "paradigmLicence";

/**
 * The most forms one question shows. Its options are every selection, so
 * five forms give 31; a dimension with more is left unresolved and its
 * Reading Unstated there.
 */
const maximumForms = 5;

/** One form a question shows: its value, its variant id, and whether the Paradigm holds it. */
export type OfferedForm = {
	readonly value: string;
	readonly id: Dumrel.VariantId;
	readonly stored: boolean;
};

/** One dimension the judge is asked about, with the forms it shows. */
export type LicenceOffer = {
	readonly dimension: Dumrel.DimensionId;
	readonly forms: readonly OfferedForm[];
};

/** What the judge made of one dimension: the forms it takes, and how sure it was of each selection. */
export type LicenceVerdict = {
	readonly dimension: Dumrel.DimensionId;
	readonly taken: readonly OfferedForm[];
	/** Each option's probability, by its text. */
	readonly probabilities: Readonly<Record<string, number>>;
};

/** A form as the judge reads it: a marker by what it means. */
const shownForm = (value: string): string =>
	Object.hasOwn(markerForms, value) ? (markerForms[value] ?? value) : value;

/** An option's text: its forms as the judge reads them, joined. */
export const selectionText = (shown: readonly string[]): string =>
	shown.join(" and ");

/**
 * Every selection of `count` forms in order: by size, then by position,
 * none empty, a marker (`markers` holds its index) only alone.
 */
function selectionsOf(
	count: number,
	markers: ReadonlySet<number> = new Set(),
): number[][] {
	const selections: number[][] = [];
	for (let mask = 1; mask < 1 << count; mask++) {
		const picked = Array.from(
			{ length: count },
			(_, index) => index,
		).filter((index) => mask & (1 << index));
		if (picked.length > 1 && picked.some((index) => markers.has(index)))
			continue;
		selections.push(picked);
	}
	return selections.sort(
		(left, right) =>
			left.length - right.length ||
			left.join(",").localeCompare(right.join(",")),
	);
}

/** The forms of an offer in the order the judge sees them. */
const ordered = (forms: readonly OfferedForm[]) =>
	[...forms].sort((left, right) =>
		shownForm(left.value).localeCompare(shownForm(right.value), "de"),
	);

/**
 * Asks the judge about every offer in one request. A dimension showing
 * more than `maximumForms` forms is unresolved, an answer naming no
 * option unusable; the request failing fails every dimension asked.
 */
export const judgeLicences = (
	context: AspectContext,
	offers: readonly LicenceOffer[],
): Effect.Effect<
	{
		readonly verdicts: readonly LicenceVerdict[];
		readonly refused: ReadonlyMap<Dumrel.DimensionId, AspectError>;
	},
	AspectError
> =>
	Effect.gen(function* () {
		const refused = new Map<Dumrel.DimensionId, AspectError>();
		const asked = offers.flatMap(({ dimension, forms }) => {
			if (forms.length > maximumForms) {
				refused.set(
					dimension,
					new KnowledgeUnresolved({
						message: `The ${dimension} judge would show ${forms.length} forms, past ${maximumForms}`,
					}),
				);
				return [];
			}
			const shown = ordered(forms);
			const markers = new Set(
				shown.flatMap((form, index) =>
					Object.hasOwn(markerForms, form.value) ? [index] : [],
				),
			);
			const options = selectionsOf(shown.length, markers).map(
				(indices, at) => {
					const taken = indices.flatMap((index) => {
						const form = shown[index];
						return form ? [form] : [];
					});
					return {
						id: `s${at}`,
						taken,
						text: selectionText(
							taken.map(({ value }) => shownForm(value)),
						),
					};
				},
			);
			return [{ dimension, shown, options }];
		});
		if (asked.length === 0) return { verdicts: [], refused };
		const answers = yield* context.ask({
			stage: judgeStage,
			state: judgeState(context, { policy: { ...licencePolicy } }),
			questions: Object.fromEntries(
				asked.map(({ dimension, shown, options }) => [
					dimension,
					choice(
						{
							question: licenceQuestion,
							part: dimensionParts[dimension],
							forms: shown.map(({ value }) => shownForm(value)),
						},
						Object.fromEntries(
							options.map(({ id, text }) => [id, text]),
						),
					),
				]),
			),
		});
		const verdicts: LicenceVerdict[] = [];
		for (const { dimension, options } of asked) {
			const answer = choiceOf(answers, dimension);
			const picked = options.find(({ id }) => id === answer.choice);
			if (picked === undefined) {
				refused.set(
					dimension,
					new InvalidModelOutput({
						stage: judgeStage,
						message: `jev answered the ${dimension} licence with ${answer.choice}, no option of it`,
					}),
				);
				continue;
			}
			verdicts.push({
				dimension,
				taken: picked.taken,
				probabilities: Object.fromEntries(
					options.map(({ id, text }) => [
						text,
						answer.probabilities[id] ?? 0,
					]),
				),
			});
		}
		return { verdicts, refused };
	});
