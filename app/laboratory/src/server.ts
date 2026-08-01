import { buildDumgen } from "dumgen";
import {
	appendSessionEvent,
	describeErrors,
	type LaboratoryOperation,
	type LoggedError,
} from "./session-log";
import type {
	ClickResolutionRequest,
	EntityRepresentation,
	FeatureValue,
	Segment,
	SegmentationRequest,
	SegmentedSentence,
} from "./shared/contract";

const generate = buildDumgen();
const model = "gpt-5-nano";
const segmentationPrompt = "laboratory.segmentation.de.segment";
const clickResolutionPrompt = "laboratory.clickResolution.de.resolve";
const sentences = new Map<
	string,
	{ sessionId: string; sentence: SegmentedSentence }
>();
let currentSessionId = crypto.randomUUID();

type ApplicationResult = {
	status: number;
	body: unknown;
};

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

function errorResult(error: unknown): ApplicationResult {
	const message =
		error instanceof Error ? error.message : "Generation failed.";
	const details = describeErrors(error).map(
		({ name, message: detail }) => `${name}: ${detail}`,
	);
	return { status: 502, body: { error: message, details } };
}

async function logAttempt(input: {
	timestamp: string;
	sessionId: string;
	operation: LaboratoryOperation;
	requestInput: unknown;
	promptInput: unknown;
	promptName: string;
	validatedOutput: unknown;
	applicationResult: ApplicationResult | null;
	startedAt: number;
	errors: LoggedError[];
}): Promise<void> {
	try {
		await appendSessionEvent({
			timestamp: input.timestamp,
			sessionId: input.sessionId,
			operation: input.operation,
			input: {
				request: input.requestInput,
				prompt: input.promptInput,
			},
			promptName: input.promptName,
			model,
			validatedOutput: input.validatedOutput,
			applicationResult: input.applicationResult,
			latencyMs: Number((performance.now() - input.startedAt).toFixed(1)),
			errors: input.errors,
		});
	} catch (error) {
		console.error("Failed to append laboratory session event.", error);
	}
}

const server = Bun.serve({
	hostname: "127.0.0.1",
	port: 3100,
	routes: {
		"/api/health": Response.json({
			ok: true,
			service: "laboratory",
			dumgen: true,
			model,
			apiKeyConfigured: Boolean(process.env.OPENAI_API_KEY),
		}),
		"/api/session": {
			GET() {
				return Response.json({ sessionId: currentSessionId });
			},
			POST() {
				currentSessionId = crypto.randomUUID();
				sentences.clear();
				return Response.json({ sessionId: currentSessionId });
			},
		},
		"/api/segment": {
			async POST(request) {
				const timestamp = new Date().toISOString();
				const startedAt = performance.now();
				const sessionId = currentSessionId;
				let requestInput: unknown = null;
				let promptInput: unknown = null;
				let validatedOutput: unknown = null;
				let applicationResult: ApplicationResult | null = null;
				let errors: LoggedError[] = [];
				try {
					requestInput = await request.json();
					const input = requestInput as SegmentationRequest;
					if (
						typeof input?.text !== "string" ||
						typeof input?.selection?.start !== "number" ||
						typeof input?.selection?.end !== "number"
					) {
						const error = new TypeError(
							"Expected text and a numeric selection range.",
						);
						errors = describeErrors(error);
						applicationResult = {
							status: 400,
							body: { error: error.message },
						};
						return Response.json(applicationResult.body, {
							status: 400,
						});
					}
					const selection = selectionBounds(input);
					const selectedText = input.text.slice(
						selection.start,
						selection.end,
					);
					const prompt = { text: selectedText };
					promptInput = prompt;
					const generated =
						await generate.laboratory.segmentation.de.segment(
							prompt,
						);
					validatedOutput = generated;
					if (generated.decision !== "Accepted") {
						applicationResult = {
							status: 200,
							body: {
								decision: generated.decision,
								sentence: null,
								generation: {
									model,
									prompt: segmentationPrompt,
								},
							},
						};
						return Response.json(applicationResult.body);
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
					if (sessionId !== currentSessionId) {
						throw new Error(
							"Laboratory session was reset during segmentation.",
						);
					}
					sentences.set(sentence.id, { sessionId, sentence });
					applicationResult = {
						status: 200,
						body: {
							decision: generated.decision,
							sentence,
							generation: {
								model,
								prompt: segmentationPrompt,
							},
						},
					};
					return Response.json(applicationResult.body);
				} catch (error) {
					errors = describeErrors(error);
					applicationResult = errorResult(error);
					return Response.json(applicationResult.body, {
						status: applicationResult.status,
					});
				} finally {
					await logAttempt({
						timestamp,
						sessionId,
						operation: "segmentation",
						requestInput,
						promptInput,
						promptName: segmentationPrompt,
						validatedOutput,
						applicationResult,
						startedAt,
						errors,
					});
				}
			},
		},
		"/api/resolve": {
			async POST(request) {
				const timestamp = new Date().toISOString();
				const startedAt = performance.now();
				const sessionId = currentSessionId;
				let requestInput: unknown = null;
				let promptInput: unknown = null;
				let validatedOutput: unknown = null;
				let applicationResult: ApplicationResult | null = null;
				let errors: LoggedError[] = [];
				try {
					requestInput = await request.json();
					const input = requestInput as ClickResolutionRequest;
					if (
						typeof input?.segmentedSentenceId !== "string" ||
						typeof input?.clickedSegmentIndex !== "number"
					) {
						const error = new TypeError(
							"Expected a segmented sentence ID and clicked segment index.",
						);
						errors = describeErrors(error);
						applicationResult = {
							status: 400,
							body: { error: error.message },
						};
						return Response.json(applicationResult.body, {
							status: 400,
						});
					}
					const stored = sentences.get(input.segmentedSentenceId);
					if (!stored || stored.sessionId !== sessionId) {
						const error = new Error(
							"Segmented sentence is no longer in the current session.",
						);
						errors = describeErrors(error);
						applicationResult = {
							status: 404,
							body: { error: error.message },
						};
						return Response.json(applicationResult.body, {
							status: 404,
						});
					}
					const { sentence } = stored;
					const clicked =
						sentence.segments[input.clickedSegmentIndex];
					if (clicked?.kind !== "ResolvableText") {
						const error = new Error(
							"Only ResolvableText can be resolved.",
						);
						errors = describeErrors(error);
						applicationResult = {
							status: 400,
							body: { error: error.message },
						};
						return Response.json(applicationResult.body, {
							status: 400,
						});
					}
					const prompt = {
						language: "de" as const,
						clickedSegmentIndex: input.clickedSegmentIndex,
						segments: sentence.segments.map(
							({ index, kind, text }) => ({
								index,
								kind,
								text,
							}),
						),
					};
					promptInput = prompt;
					const generated =
						await generate.laboratory.clickResolution.de.resolve(
							prompt,
						);
					validatedOutput = generated;
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
						model,
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
					if (sessionId !== currentSessionId) {
						throw new Error(
							"Laboratory session was reset during click resolution.",
						);
					}
					applicationResult = {
						status: 200,
						body: {
							entity,
							generation: {
								model,
								prompt: clickResolutionPrompt,
							},
						},
					};
					return Response.json(applicationResult.body);
				} catch (error) {
					errors = describeErrors(error);
					applicationResult = errorResult(error);
					return Response.json(applicationResult.body, {
						status: applicationResult.status,
					});
				} finally {
					await logAttempt({
						timestamp,
						sessionId,
						operation: "click-resolution",
						requestInput,
						promptInput,
						promptName: clickResolutionPrompt,
						validatedOutput,
						applicationResult,
						startedAt,
						errors,
					});
				}
			},
		},
	},
});

console.log(`Laboratory API listening on ${server.url}`);
