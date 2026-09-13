import {
	type Constraint,
	ParsingError,
	parseValidationArtifact,
} from "common-utils";
import { validationOperations } from "dumling/validation";
import { encodedValidation } from "../generated/validation.js";
import type { Encounter } from "../types.js";
import { DumgenFailure } from "./failure.js";

const registry = JSON.parse(encodedValidation) as {
	roots: Record<string, Constraint>;
	definitions: Record<string, Constraint>;
};
export function parse<T>(
	name: string,
	input: unknown,
	stage: string,
	output = false,
): T {
	const root = registry.roots[name];
	if (!root) throw Error(`Missing validator ${name}`);
	const parsed = parseValidationArtifact<T>(
		{ version: 1, root, definitions: registry.definitions },
		input,
		{
			...validationOperations,
			"dumrel.normalize-text": (value) => ({
				value: (value as string).trim().normalize("NFC"),
			}),
		},
	);
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
export function markedContext(encounter: Encounter): {
	markedContext: string;
	members: string[];
} {
	const indices = new Set(encounter.target.memberSegmentIndices);
	const escapeText = (text: string) =>
		text
			.replaceAll("&", "&amp;")
			.replaceAll("<", "&lt;")
			.replaceAll(">", "&gt;");
	return {
		markedContext: encounter.sentence.segments
			.map((segment, index) =>
				indices.has(index)
					? `<TARGET>${escapeText(segment.text)}</TARGET>`
					: escapeText(segment.text),
			)
			.join(""),
		members: encounter.target.memberSegmentIndices.map(
			(index) => encounter.sentence.segments[index]!.text,
		),
	};
}
