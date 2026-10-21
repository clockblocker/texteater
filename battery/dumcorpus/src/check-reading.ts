/**
 * The Reading layer's and Knowledge layer's checks of one target: its
 * Reading, the Reading Knowledge it owns and what it licenses in its Lemma's
 * Paradigm, each against Dumling and dumrel.
 */
import { normalizeForm, parseUnit, routeOf } from "dumling";
import type * as Dumling from "dumling/types";
import {
	applyParadigmChanges,
	paradigmChangesFor,
	paradigmDimensions,
	parseReadingKnowledge,
	selectKnowledge,
	variantIdOf,
} from "dumrel";
import type * as Dumrel from "dumrel/types";
import type { ReadingParadigm } from "./corpus-types.js";
import { sameValue } from "./same-value.js";

/**
 * Builds the target's Reading from its Attestation's Lemma and authored Emoji
 * Description and checks it with Dumling's Reading schema. A target that
 * names none fails the Reading layer. A Foreign Reading is its Lemma alone,
 * so its target names it with no Emoji Description (ADR 0045); Dumling
 * rejects a missing one on any other route.
 */
export function checkReading(
	authored: { emojiDescription?: string } | undefined,
	attestation: Dumling.Attestation,
): {
	value?: Dumling.Reading;
	issues: { path: string; message: string }[];
} {
	if (authored === undefined)
		return {
			issues: [
				{ path: "reading", message: "A target names its Reading" },
			],
		};
	const parsed = parseUnit({
		unitKind: "Reading",
		lemma: attestation.surface.lemma,
		...(authored.emojiDescription === undefined
			? {}
			: { emojiDescription: authored.emojiDescription }),
	});
	if (!parsed.success)
		return {
			issues: parsed.error.issues.map((error) => ({
				path: ["reading", ...error.path].join("."),
				message: error.message,
			})),
		};
	if (parsed.chain.unitKind !== "Reading")
		return { issues: [{ path: "reading", message: "Expected a Reading" }] };
	const reading = parsed.chain.value;
	if (
		"emojiDescription" in reading &&
		reading.emojiDescription !== authored.emojiDescription
	)
		return {
			issues: [
				{
					path: "reading.emojiDescription",
					message: `Store the Emoji Description as parseUnit normalizes it: ${JSON.stringify(reading.emojiDescription)}`,
				},
			],
		};
	return { value: reading, issues: [] };
}

/**
 * Checks a target's Reading Knowledge against the Reading that owns it with
 * dumrel's `parseReadingKnowledge`, which rejects an aspect or relation the
 * Reading's route cannot hold (an `endonym` outside PROPN). Where dumrel has
 * a Knowledge Policy for the route, each stored relation must also be one the
 * route requests. The Knowledge is stored as dumrel normalizes it.
 */
export function checkKnowledge(
	authored: unknown,
	reading: Dumling.Reading,
): {
	knowledge?: Dumrel.ReadingKnowledge;
	issues: { path: string; message: string }[];
} {
	const at = (path: readonly PropertyKey[]) =>
		["reading", "knowledge", ...path.slice(path[0] === "knowledge" ? 1 : 0)]
			.map(String)
			.join(".");
	const parsed = parseReadingKnowledge({
		source: reading,
		knowledge: authored,
	});
	if (!parsed.success)
		return {
			issues: parsed.error.issues.map((error) => ({
				path: at(error.path),
				message: error.message,
			})),
		};
	const knowledge: Dumrel.ReadingKnowledge = parsed.value;
	const issues: { path: string; message: string }[] = [];
	const { language, family, kind } = reading.lemma;
	const policy = selectKnowledge({ route: routeOf(reading.lemma) });
	const requested = policy.success
		? (policy.value.semanticRelations ?? {})
		: undefined;
	for (const relation of Object.keys(knowledge.semanticRelations ?? {}))
		if (
			requested &&
			relation !== "targetKind" &&
			!Object.hasOwn(requested, relation)
		)
			issues.push({
				path: at(["semanticRelations", relation]),
				message: `A ${language} ${family} ${kind} Reading has no ${relation} relation`,
			});
	if (!sameValue(knowledge, authored))
		issues.push({
			path: at([]),
			message: "Store the Knowledge exactly as dumrel normalizes it",
		});
	return { knowledge, issues };
}

/**
 * Checks what a target's Reading licenses in its Lemma's Paradigm with
 * dumrel (ADR 0048): each dimension is one its route's Paradigm Policy names,
 * each form or marker is one the dimension takes, listed once, and one
 * holding a marker holds nothing else. The forms are stored as dumrel
 * normalizes them.
 */
export function checkParadigm(
	authored: Readonly<Record<string, readonly string[]>>,
	reading: Dumling.Reading,
): { paradigm?: ReadingParadigm; issues: { path: string; message: string }[] } {
	const issues: { path: string; message: string }[] = [];
	const dimensions = paradigmDimensions(reading.lemma);
	const paradigm: Partial<Record<Dumrel.DimensionId, readonly string[]>> = {};
	for (const [name, values] of Object.entries(authored)) {
		const at = `reading.paradigm.${name}`;
		const dimension = dimensions.find((known) => known === name);
		if (dimension === undefined) {
			const { language, family, kind } = reading.lemma;
			issues.push({
				path: at,
				message: `A ${language} ${family} ${kind} Lemma's Paradigm has no ${name} dimension`,
			});
			continue;
		}
		const ids = values.map((value) =>
			variantIdOf(reading.lemma, dimension, value),
		);
		if (new Set(ids).size !== ids.length) {
			issues.push({ path: at, message: "List each form once" });
			continue;
		}
		const applied = applyParadigmChanges({
			lemma: reading.lemma,
			readings: [reading],
			paradigm: { dimensions: {} },
			changes: paradigmChangesFor({
				reading,
				dimension,
				values,
				provenance: "Authored",
			}),
		});
		if (!applied.success) {
			for (const error of applied.error.issues)
				issues.push({ path: at, message: error.message });
			continue;
		}
		if (values.some((value) => value !== normalizeForm(value)))
			issues.push({
				path: at,
				message: "Store each form exactly as dumrel normalizes it",
			});
		paradigm[dimension] = values;
	}
	return issues.length > 0 ? { issues } : { paradigm, issues };
}
