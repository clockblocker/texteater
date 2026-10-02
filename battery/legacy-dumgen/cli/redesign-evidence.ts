import { readFile, writeFile } from "node:fs/promises";
import { Effect } from "effect";
import {
	defineGoldenCaseCollection,
	defineGoldenCorpus,
	stableJson,
} from "promptsmith";
import { runOperationExperiment } from "promptsmith/evaluation";
import { createOpenAIExecutor } from "promptsmith/openai";
import { saveRun } from "promptsmith/storage";
import { createTypeSafeExecutor } from "promptsmith/typesafe";
import { z } from "zod";
import baseline from "../evidence/typesafe-redesign/baseline.json";
import { operationExperiment } from "../src/development.js";
import held from "../src/evaluation/redesign/held-out.json";
import review from "../src/evaluation/redesign/review-cases.json";
import {
	comparisonInputSchema,
	knowledgeInputSchema,
} from "../src/generated/schemas.js";
import type { DumgenOptions, OperationTrace } from "../src/types.js";
import { createDumgen } from "../src/universal/dumgen.js";
import { effectiveConfiguration } from "../src/universal/model-configuration.js";
import {
	segmentedSentenceSchema,
	segmentInputSchema,
} from "../src/universal/schemas.js";
import { fingerprint, judgmentConfiguration } from "../src/universal/trace.js";

const directory = new URL("../evidence/typesafe-redesign/", import.meta.url);
const entrySchema = z.object({
	id: z.string(),
	role: z.enum(["review", "held-out"]),
	kind: z.enum(["corpus", "recognition", "intake", "reading", "knowledge"]),
	experiment: z.string().optional(),
	input: z.unknown(),
	expected: z.unknown(),
});
type Entry = z.output<typeof entrySchema>;
const options: DumgenOptions = {
	execute: async () => {
		throw Error("Preparation cannot generate");
	},
	judge: async () => {
		throw Error("Preparation cannot judge");
	},
	judgmentConfiguration: { model: "jev-latest", timeoutMs: 30_000 },
};
const recognizerInput = z.object({
	sentence: segmentedSentenceSchema.extend({ language: z.literal("de") }),
	clickedSegmentIndex: z.number(),
	candidates: z.array(z.string()).optional(),
});
async function unwrap<T>(
	effect: Effect.Effect<T, unknown>,
	signal?: AbortSignal,
): Promise<T> {
	const result = await Effect.runPromise(Effect.either(effect), { signal });
	if (result._tag === "Left") throw result.left;
	return result.right;
}
async function prepare() {
	const entries: Entry[] = [];
	for (const asset of baseline.assets) {
		if (
			asset.scope !== "in-scope" ||
			asset.id === "intake" ||
			asset.id.startsWith("target-classification/")
		)
			continue;
		const experiment = operationExperiment(asset.id, options);
		for (const caseId of asset.reviewCaseIds) {
			const golden = experiment.corpus.cases[caseId];
			if (!golden) throw Error(`Missing selected case ${caseId}`);
			entries.push({
				id: caseId,
				role: "review",
				kind: "corpus",
				experiment: asset.id,
				input: golden.input,
				expected: golden.idealOutput,
			});
		}
	}
	const dumgen = createDumgen(options);
	for (const example of review.constructions) {
		const sentence = await unwrap(
			dumgen.segmentSentence({
				language: "de",
				stitchedText: example.sourceSentence,
			}),
		);
		for (const [targetIndex, target] of example.targets.entries()) {
			// Every selected construction member is an occurrence, never a string-only click.
			const used = new Set<number>();
			const positions = target.members.map((text) => {
				const index = sentence.segments.findIndex(
					(segment, index) =>
						segment.kind === "ResolvableText" &&
						segment.text === text &&
						!used.has(index),
				);
				if (index < 0)
					throw Error(`Unaligned IDS member ${example.id}/${text}`);
				used.add(index);
				return index;
			});
			for (const clickedSegmentIndex of positions)
				entries.push({
					id: `${example.id}-target-${targetIndex}-click-${clickedSegmentIndex}`,
					role: "review",
					kind: "recognition",
					input: { sentence, clickedSegmentIndex },
					expected: {
						...target,
						memberSegmentIndices: positions,
						realizationCoverage: "Full",
						provenance: example.provenance,
					},
				});
		}
	}
	for (const item of review.intake)
		entries.push({
			id: item.id,
			role: "review",
			kind: "intake",
			input: { sourceSentences: item.sourceSentences },
			expected: item,
		});
	const lemma = {
		unitKind: "Lemma",
		language: "de",
		family: "Lexeme",
		kind: "NOUN",
		canonicalForm: "Schloss",
		coreFeatures: { gender: "Neut", hyph: null },
	};
	for (const item of review.reading) {
		if ("injectedChoice" in item) continue; // controlled uncertainty/collision stay deterministic tests
		const sentence = await unwrap(
			dumgen.segmentSentence({
				language: "de",
				stitchedText: item.markedContext.replaceAll(
					/<\/?TARGET>/gu,
					"",
				),
			}),
		);
		const index = sentence.segments.findIndex(
			(segment) => segment.text === item.lemma,
		);
		entries.push({
			id: item.id,
			role: "review",
			kind: "reading",
			input: {
				encounter: {
					sentence,
					target: {
						family: "Lexeme",
						kind: "NOUN",
						memberSegmentIndices: [index],
					},
				},
				lemma,
				candidates: item.candidates,
			},
			expected: item,
		});
	}
	for (const item of held.cases) {
		if (item.operation === "intake")
			entries.push({
				id: item.id,
				role: "held-out",
				kind: "intake",
				input: { sourceSentences: [item.sourceSentence] },
				expected: { humanReviewRequired: true },
			});
		else {
			const sentence = await unwrap(
				dumgen.segmentSentence({
					language: "de",
					stitchedText: item.sourceSentence,
				}),
			);
			const click = "clickText" in item ? item.clickText : undefined;
			const clickedSegmentIndex = sentence.segments.findIndex(
				(segment) => segment.text === click,
			);
			if (clickedSegmentIndex < 0)
				throw Error(`Missing held-out click ${item.id}`);
			entries.push({
				id: item.id,
				role: "held-out",
				kind:
					item.operation === "reading"
						? "reading"
						: item.operation === "knowledge"
							? "knowledge"
							: "recognition",
				input: {
					sentence,
					clickedSegmentIndex,
					...("candidates" in item
						? { candidates: item.candidates }
						: {}),
				},
				expected: { humanReviewRequired: true },
			});
		}
	}
	const manifest = {
		version: 1,
		question:
			"Evaluate integrated production behavior across all 22 grammar routes, every member click of 16 selected IDS constructions, stage edge paths, and the eight reserved held-out cases.",
		policy: {
			attemptsPerEntry: 1,
			automaticRetries: 0,
			tuning: false,
			heldOutUsedForTuning: false,
			deterministicOnlyEdges: [
				"Unresolved injection",
				"exact generated collision injection",
				"partial failure injection",
				"cancellation",
			],
		},
		configurations: {
			generation: effectiveConfiguration(options),
			judgment: judgmentConfiguration(options),
		},
		entries,
		fingerprint: await fingerprint(entries),
	};
	await writeFile(
		new URL("live-manifest.json", directory),
		JSON.stringify(manifest, null, 2) + "\n",
		{ flag: "wx" },
	);
	console.log(
		JSON.stringify({
			entries: entries.length,
			fingerprint: manifest.fingerprint,
		}),
	);
}
async function executeManifest() {
	const manifestName = process.argv[4] ?? "live-manifest.json";
	if (!/^[a-z0-9-]+manifest\.json$/u.test(manifestName))
		throw Error("Invalid manifest name");
	const manifest = JSON.parse(
		await readFile(new URL(manifestName, directory), "utf8"),
	);
	const entries = z.array(entrySchema).parse(manifest.entries);
	if ((await fingerprint(entries)) !== manifest.fingerprint)
		throw Error("Manifest fingerprint mismatch");
	const sourceRevision = process.argv[3];
	if (!sourceRevision) throw Error("Supply the committed source revision");
	const live: DumgenOptions = {
		...options,
		execute: (request) =>
			createOpenAIExecutor()({
				...request,
				configuration:
					request.configuration as import("promptsmith/evaluation").ModelConfiguration,
			}),
		judge: createTypeSafeExecutor(),
	};
	const corpus = defineGoldenCorpus({
		route: "typesafe-redesign/finite-review",
		inputSchema: entrySchema,
		outputSchema: z.unknown(),
		collections: {
			canonical: defineGoldenCaseCollection(import.meta.url, {
				cases: Object.fromEntries(
					entries.map((entry) => [
						entry.id,
						{ input: entry, idealOutput: entry.expected },
					]),
				),
			}),
		},
	});
	const outputDirectory = new URL("runs/", directory).pathname;
	// Claim before any call; rerunning this manifest is rejected, even after interruption.
	await writeFile(
		new URL(
			manifestName.replace("manifest.json", "attempt.json"),
			directory,
		),
		JSON.stringify({
			sourceRevision,
			fingerprint: manifest.fingerprint,
			startedAt: new Date().toISOString(),
		}) + "\n",
		{ flag: "wx" },
	);
	const controller = new AbortController();
	process.once("SIGINT", () => controller.abort());
	for (const entry of entries) {
		if (controller.signal.aborted) break;
		const run = await runOperationExperiment({
			experimentId: corpus.route,
			operationVersion: "judgments-2",
			evaluatorVersion: "finite-review-1",
			sourceRevision,
			configurations: manifest.configurations,
			signal: controller.signal,
			experiment: {
				corpus,
				demonstrations: corpus.select([]),
				evaluation: corpus.select([entry.id]),
				run: async (entry, context) => {
					const onOperation = (trace: OperationTrace) =>
						context.recordTrace(trace);
					const dumgen = createDumgen({ ...live, onOperation });
					if (entry.kind === "corpus") {
						if (!entry.experiment)
							throw Error("Missing experiment");
						return operationExperiment(entry.experiment, live).run(
							entry.input,
							context,
						);
					}
					if (entry.kind === "intake") {
						const input = segmentInputSchema.parse(entry.input);
						return unwrap(dumgen.segment(input), context.signal);
					}
					if (entry.kind === "reading" && entry.role === "review")
						return unwrap(
							dumgen.resolveOrGenerateReadingEmojiDescription(
								comparisonInputSchema.parse(entry.input),
							),
							context.signal,
						);
					const input = recognizerInput.parse(entry.input);
					const target = await unwrap(
						dumgen.classifyTarget({
							sentence: input.sentence,
							clickedSegmentIndex: input.clickedSegmentIndex,
						}),
						context.signal,
					);
					const encounter = { sentence: input.sentence, target };
					const attestation = await unwrap(
						dumgen.resolveGrammar({
							...encounter,
							contextAvailable: false,
						}),
						context.signal,
					);
					if (entry.kind === "recognition")
						return { target, attestation };
					const lemma = attestation.surface.lemma;
					const readingResult = await unwrap(
						dumgen.resolveOrGenerateReadingEmojiDescription(
							comparisonInputSchema.parse({
								encounter,
								lemma,
								candidates: input.candidates ?? [],
							}),
						),
						context.signal,
					);
					if (entry.kind === "reading")
						return { target, attestation, reading: readingResult };
					const reading = {
						unitKind: "Reading" as const,
						lemma,
						emojiDescription: readingResult.emojiDescription,
					};
					const knowledge = await unwrap(
						dumgen.produceKnowledge(
							knowledgeInputSchema.parse({
								encounter,
								reading,
								request: {
									definition: null,
									translations: { en: null },
									semanticRelations: {
										synonym: null,
										hypernym: null,
									},
								},
							}),
						),
						context.signal,
					);
					return { target, attestation, reading, knowledge };
				},
				evaluator: ({ input, output, idealOutput }) => ({
					humanReviewRequired: true,
					comparison:
						input.role === "held-out"
							? "held-out: no tuned expectation"
							: "review expectation",
					exactMatch: stableJson(output) === stableJson(idealOutput),
				}),
			},
		});
		const saved = await saveRun(outputDirectory, run);
		console.log(
			JSON.stringify({
				caseId: entry.id,
				status: run.cases[0]?.status,
				saved,
			}),
		);
	}
}
if (import.meta.main) {
	if (process.argv[2] === "prepare") await prepare();
	else if (process.argv[2] === "run") await executeManifest();
	else
		throw Error(
			"Use prepare or run REVISION; each manifest permits one live attempt.",
		);
}
