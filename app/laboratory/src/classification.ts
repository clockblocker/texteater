import type { buildDumgen } from "dumgen";
import { schemasFor } from "dumling/schema";

import type {
	EntityRepresentation,
	Lemma,
	Segment,
	SegmentedSentence,
	Selection,
	Surface,
} from "./shared/contract";

export const classificationPromptNames = [
	"laboratory.classification.de.selection",
	"laboratory.classification.de.surface",
	"laboratory.classification.de.lemma",
	"laboratory.classification.de.reading",
] as const;

type ClassificationStage = "selection" | "surface" | "lemma" | "reading";

export type GermanClassificationTrace = {
	inputs: Partial<Record<ClassificationStage, unknown>>;
	outputs: Partial<Record<ClassificationStage, unknown>>;
};

export function createGermanClassificationTrace(): GermanClassificationTrace {
	return { inputs: {}, outputs: {} };
}

function constructAttestedSurface(
	segments: readonly Segment[],
	indices: readonly number[],
): string {
	let result = "";
	for (let position = 0; position < indices.length; position += 1) {
		const index = indices[position] ?? 0;
		if (position > 0) {
			const previous = indices[position - 1] ?? index;
			if (
				segments
					.slice(previous + 1, index)
					.some((segment) => segment.kind === "Whitespace")
			) {
				result += " ";
			}
		}
		result += segments[index]?.text ?? "";
	}
	return result;
}

function featureRecord(
	features: ReadonlyArray<{ readonly name: string; readonly value: unknown }>,
): Record<string, unknown> {
	return Object.fromEntries(features.map(({ name, value }) => [name, value]));
}

type EntitySchemaGetter<T> = () => { parse(value: unknown): T };
type EntitySchemaBranches<T> = Record<
	string,
	Record<string, EntitySchemaGetter<T>>
>;

function parseGermanEntity<T extends Surface | Selection>(
	entityKind: "Surface" | "Selection",
	value: unknown,
	surfaceKind: "Citation" | "Inflection",
	lemma: Lemma,
): T {
	const bySurfaceKind = schemasFor.de.entity[entityKind] as unknown as Record<
		string,
		EntitySchemaBranches<T>
	>;
	const getSchema = bySurfaceKind[surfaceKind]?.[lemma.family]?.[lemma.kind];
	if (!getSchema) {
		throw new Error(
			`No German Dumling ${entityKind} schema exists for ${surfaceKind} ${lemma.family} ${lemma.kind}.`,
		);
	}
	return getSchema().parse(value);
}

export async function classifyGermanSegment(
	generate: ReturnType<typeof buildDumgen>,
	sentence: SegmentedSentence,
	clickedSegmentIndex: number,
	trace: GermanClassificationTrace,
): Promise<EntityRepresentation> {
	const segments = sentence.segments.map(({ index, kind, text }) => ({
		index,
		kind,
		text,
	}));

	const selectionInput = {
		language: "de" as const,
		segmentedSentenceId: sentence.id,
		clickedSegmentIndex,
		segments,
	};
	trace.inputs.selection = selectionInput;
	const selected =
		await generate.laboratory.classification.de.selection(selectionInput);
	trace.outputs.selection = selected;

	const attestedSurface = constructAttestedSurface(
		sentence.segments,
		selected.surfaceSegmentIndices,
	);
	const surfaceInput = {
		language: "de" as const,
		clickedSegmentIndex,
		segments,
		selection: {
			...selected,
			attestedSurface,
		},
	};
	trace.inputs.surface = surfaceInput;
	const classifiedSurface =
		await generate.laboratory.classification.de.surface(surfaceInput);
	trace.outputs.surface = classifiedSurface;

	const lemmaInput = {
		language: "de" as const,
		context: {
			sentenceText: sentence.selectedText,
			attestedSurface,
		},
		surface: classifiedSurface,
	};
	trace.inputs.lemma = lemmaInput;
	const lemma = await generate.laboratory.classification.de.lemma(lemmaInput);
	trace.outputs.lemma = lemma;

	const surfaceValue = {
		language: "de" as const,
		normalizedSurface: classifiedSurface.normalizedSurface,
		spelling: classifiedSurface.spelling,
		realizationCoverage: classifiedSurface.realizationCoverage,
		surfaceKind: classifiedSurface.surfaceKind,
		surfaceFeatures: classifiedSurface.surfaceFeatures,
		lemma,
		...(classifiedSurface.surfaceKind === "Inflection"
			? {
					inflectionalFeatures: featureRecord(
						classifiedSurface.inflectionalFeatures,
					),
				}
			: {}),
	};
	const surface = parseGermanEntity<Surface>(
		"Surface",
		surfaceValue,
		classifiedSurface.surfaceKind,
		lemma,
	);

	const selection = parseGermanEntity<Selection>(
		"Selection",
		{
			segmentedSentenceId: sentence.id,
			clickedSegmentIndex,
			surfaceSegmentIndices: selected.surfaceSegmentIndices,
			attestedSurface,
			selectedOrthography: selected.selectedOrthography,
			surface,
		},
		classifiedSurface.surfaceKind,
		lemma,
	);

	const readingInput = {
		language: "de" as const,
		context: {
			sentenceText: sentence.selectedText,
			attestedSurface,
			normalizedSurface: surface.normalizedSurface,
		},
		lemma,
		existingReadings: [],
	};
	trace.inputs.reading = readingInput;
	const reading =
		await generate.laboratory.classification.de.reading(readingInput);
	trace.outputs.reading = reading;

	return {
		resolution: "dumgen",
		model: "gpt-5-nano",
		selection,
		surface,
		reading,
	};
}
