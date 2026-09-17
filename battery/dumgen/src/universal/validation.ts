import { validationOperations } from "dumling/validation";
import {
	type CompiledValidationRegistry,
	ParsingError,
	parseCompiledValidation,
} from "dumval/runtime";
import { validationRegistry } from "../generated/linked-validation.js";
import type { Encounter, SegmentedSentence } from "../types.js";
import { DumgenFailure } from "./failure.js";

const registry: CompiledValidationRegistry = validationRegistry;
export function parse<T>(
	name: string,
	input: unknown,
	stage: string,
	output = false,
): T {
	const root = registry.roots[name];
	if (!root) throw Error(`Missing validator ${name}`);
	const parsed = parseCompiledValidation<T>(registry, name, input, {
		...validationOperations,
		"dumrel.normalize-text": (value) => ({
			value: (value as string).trim().normalize("NFC"),
		}),
	});
	if (parsed instanceof ParsingError)
		throw new DumgenFailure(
			output ? "InvalidModelOutput" : "InvalidInput",
			stage,
			parsed.message,
		);
	return parsed;
}
export function validateEncounter(
	value: unknown,
	stage = "validateEncounter",
): Encounter {
	const encounter = parse<Encounter>("encounterSchema", value, stage);
	let previous = -1;
	for (const index of encounter.target.memberSegmentIndices) {
		if (
			index <= previous ||
			encounter.sentence.segments[index]?.kind !== "ResolvableText"
		)
			throw new DumgenFailure(
				"InvalidInput",
				stage,
				"Target membership must be ordered, unique and in bounds over ResolvableText segments",
			);
		previous = index;
	}
	return encounter;
}
const escapeText = (text: string) =>
	text
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;");

/** Preserve source text and segment indices; only selectable occurrences get tags. */
export function indexedContext(sentence: SegmentedSentence): string {
	return sentence.segments
		.map((segment, index) =>
			segment.kind === "ResolvableText"
				? `<s${index}>${escapeText(segment.text)}</s${index}>`
				: escapeText(segment.text),
		)
		.join("");
}

export function markedContext(encounter: Encounter): {
	markedContext: string;
	members: string[];
} {
	const indices = new Set(encounter.target.memberSegmentIndices);
	return {
		markedContext: encounter.sentence.segments
			.map((segment, index) =>
				indices.has(index)
					? `<TARGET>${escapeText(segment.text)}</TARGET>`
					: escapeText(segment.text),
			)
			.join(""),
		members: encounter.target.memberSegmentIndices.map((index) => {
			const segment = encounter.sentence.segments[index];
			if (!segment) throw Error(`Missing target segment: ${index}`);
			return segment.text;
		}),
	};
}
