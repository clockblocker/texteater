import { buildDumgen } from "dumgen";

import type {
	ClickResolutionRequest,
	EntityRepresentation,
	FeatureValue,
	Segment,
	SegmentationRequest,
	SegmentedSentence,
} from "./shared/contract";

const generate = buildDumgen();
const sentences = new Map<string, SegmentedSentence>();

function selectionBounds(input: SegmentationRequest): {
	start: number;
	end: number;
} {
	const start = Math.max(
		0,
		Math.min(input.selection.start, input.text.length),
	);
	const end = Math.max(
		start,
		Math.min(input.selection.end, input.text.length),
	);
	if (start === end)
		throw new Error("Select at least one character before segmenting.");
	return { start, end };
}

function featureRecord(
	features: ReadonlyArray<{ name: string; value: FeatureValue }>,
): Record<string, FeatureValue> {
	return Object.fromEntries(features.map(({ name, value }) => [name, value]));
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

function errorResponse(error: unknown): Response {
	const message =
		error instanceof Error ? error.message : "Generation failed.";
	const details: string[] = [];
	let current: unknown = error;
	for (let depth = 0; depth < 4 && current instanceof Error; depth += 1) {
		details.push(`${current.name}: ${current.message}`);
		current = current.cause;
	}
	return Response.json({ error: message, details }, { status: 502 });
}

const server = Bun.serve({
	hostname: "127.0.0.1",
	port: 3100,
	routes: {
		"/api/health": Response.json({
			ok: true,
			service: "laboratory",
			dumgen: true,
			model: "gpt-5-nano",
			apiKeyConfigured: Boolean(process.env.OPENAI_API_KEY),
		}),
		"/api/segment": {
			async POST(request) {
				try {
					const input = (await request.json()) as SegmentationRequest;
					if (
						typeof input?.text !== "string" ||
						typeof input?.selection?.start !== "number" ||
						typeof input?.selection?.end !== "number"
					) {
						return Response.json(
							{
								error: "Expected text and a numeric selection range.",
							},
							{ status: 400 },
						);
					}
					const selection = selectionBounds(input);
					const selectedText = input.text.slice(
						selection.start,
						selection.end,
					);
					const generated =
						await generate.laboratory.segmentation.de.segment({
							text: selectedText,
						});
					if (generated.decision !== "Accepted") {
						return Response.json({
							decision: generated.decision,
							sentence: null,
							generation: {
								model: "gpt-5-nano",
								prompt: "laboratory.segmentation.de.segment",
							},
						});
					}

					let offset = 0;
					const sentence: SegmentedSentence = {
						id: crypto.randomUUID(),
						language: "de",
						sourceText: input.text,
						selectedText,
						selection,
						segments: generated.segments.map((segment, index) => {
							const start = offset;
							offset += segment.text.length;
							return { ...segment, index, start, end: offset };
						}),
					};
					sentences.set(sentence.id, sentence);
					return Response.json({
						decision: generated.decision,
						sentence,
						generation: {
							model: "gpt-5-nano",
							prompt: "laboratory.segmentation.de.segment",
						},
					});
				} catch (error) {
					return errorResponse(error);
				}
			},
		},
		"/api/resolve": {
			async POST(request) {
				try {
					const input =
						(await request.json()) as ClickResolutionRequest;
					const sentence = sentences.get(input.segmentedSentenceId);
					if (!sentence) {
						return Response.json(
							{
								error: "Segmented sentence is no longer in memory.",
							},
							{ status: 404 },
						);
					}
					const clicked =
						sentence.segments[input.clickedSegmentIndex];
					if (clicked?.kind !== "ResolvableText") {
						return Response.json(
							{ error: "Only ResolvableText can be resolved." },
							{ status: 400 },
						);
					}
					const generated =
						await generate.laboratory.clickResolution.de.resolve({
							language: "de",
							clickedSegmentIndex: input.clickedSegmentIndex,
							segments: sentence.segments.map(
								({ index, kind, text }) => ({
									index,
									kind,
									text,
								}),
							),
						});
					const lemma = {
						language: "de" as const,
						canonicalForm: generated.lemma.canonicalForm,
						family: generated.lemma.family,
						kind: generated.lemma.kind,
						coreFeatures: featureRecord(
							generated.lemma.coreFeatures,
						),
					};
					const entity: EntityRepresentation = {
						resolution: "dumgen",
						model: "gpt-5-nano",
						selection: {
							segmentedSentenceId: sentence.id,
							clickedSegmentIndex: input.clickedSegmentIndex,
							surfaceSegmentIndices:
								generated.surfaceSegmentIndices,
							attestedSurface: constructAttestedSurface(
								sentence.segments,
								generated.surfaceSegmentIndices,
							),
							selectedOrthography: generated.selectedOrthography,
						},
						surface: {
							language: "de",
							normalizedSurface:
								generated.surface.normalizedSurface,
							kind: generated.surface.kind,
							inflectionalFeatures: featureRecord(
								generated.surface.inflectionalFeatures,
							),
							spelling: generated.surface.spelling,
							realizationCoverage:
								generated.surface.realizationCoverage,
							lemma,
						},
						reading: {
							lemma,
							emojiDescription:
								generated.reading.emojiDescription,
						},
					};
					return Response.json({
						entity,
						generation: {
							model: "gpt-5-nano",
							prompt: "laboratory.clickResolution.de.resolve",
						},
					});
				} catch (error) {
					return errorResponse(error);
				}
			},
		},
	},
});

console.log(`Laboratory API listening on ${server.url}`);
