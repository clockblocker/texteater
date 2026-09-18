import assert from "node:assert/strict";

type PublicModule = Record<string, unknown>;
const lemma = {
	unitKind: "Lemma",
	language: "de",
	family: "Lexeme",
	kind: "NOUN",
	canonicalForm: "Bank",
	coreFeatures: { gender: "Fem", hyph: null },
};
const reading = { unitKind: "Reading", lemma, emojiDescription: "🏦" };
function call(module: PublicModule, name: string, ...args: unknown[]): any {
	const operation = module[name];
	assert.equal(
		typeof operation,
		"function",
		`Missing public operation ${name}`,
	);
	return (operation as (...args: unknown[]) => unknown)(...args);
}
export async function runRepresentativeOperation(
	id: string,
	module: PublicModule,
): Promise<void> {
	switch (id) {
		case "dumval.validate": {
			assert.equal(
				call(
					module,
					"parseValidationArtifact",
					{ version: 1, root: ["string"] },
					"value",
				),
				"value",
			);
			assert.ok(
				call(
					module,
					"parseValidationArtifact",
					{ version: 1, root: ["string"] },
					42,
				) instanceof (module.ParsingError as typeof Error),
			);
			break;
		}
		case "dumling.compiled-validation":
		case "dumrel.compiled-validation": {
			const { parseCompiledValidation, ParsingError } = await import(
				"dumval/runtime"
			);
			const registry =
				module.validationRegistry as import("dumval/runtime").CompiledValidationRegistry;
			const { validationOperations } = await import("dumling/validation");
			const key = id.startsWith("dumling")
				? "Lemma/de/Lexeme/NOUN"
				: "readingKnowledge";
			const parsed = parseCompiledValidation(
				registry,
				key,
				id.startsWith("dumling") ? lemma : {},
				validationOperations,
			);
			assert.ok(!(parsed instanceof ParsingError));
			assert.equal(Object.isFrozen(registry), true);
			break;
		}

		case "dumling.parse-unit":
			assert.equal(call(module, "parseUnit", lemma).success, true);
			break;
		case "dumling.validate-feature-bag": {
			const operations = module.validationOperations as Record<
				string,
				(input: unknown) => { value: unknown; issues?: unknown[] }
			>;
			assert.equal(
				typeof operations["dumling.feature-bag.marked"],
				"function",
			);
			assert.ok(
				(operations["dumling.feature-bag.marked"]!({ case: "Nom" })
					.issues?.length ?? 0) === 0,
			);
			break;
		}
		case "dumrel.knowledge-projection": {
			const result = call(module, "applyKnowledgeChange", {
				source: reading,
				knowledge: {},
				change: {
					kind: "Contribute",
					aspect: "definition",
					value: " bank ",
				},
			});
			assert.deepEqual(result, {
				success: true,
				value: { definition: "bank" },
			});
			assert.equal(
				call(module, "selectKnowledge", {
					route: { language: "de", family: "Lexeme", kind: "NOUN" },
				}).success,
				true,
			);
			assert.equal(
				call(module, "projectSemanticRelations", [
					{ reading, knowledge: result.value },
				]).success,
				true,
			);
			break;
		}
		case "dumdict.identity":
			assert.equal(
				typeof call(module, "makeSurfaceId", "de", {
					unitKind: "Surface",
					language: "de",
					lemma,
					normalizedSurface: "Bank",
					spelling: "Canonical",
					surfaceFeatures: null,
					inflectionalFeatures: {
						case: "Nom",
						number: "Sing",
						article: null,
					},
				}),
				"string",
			);
			break;
		case "dumdict.parse-record": {
			const result = call(module, "parseAsLemmaRecord", { lemma }, "de");
			assert.deepEqual(result, { lemma });
			break;
		}
		case "dumdict.session-storage": {
			const storage = call(module, "createMemoryStorage", "de");
			assert.deepEqual(storage.snapshot(), []);
			break;
		}
		case "dumdict.project-relations":
			assert.deepEqual(call(module, "projectSemanticRelations", []), {
				success: true,
				value: [],
			});
			break;
		case "dumdict.pending-identity":
			assert.equal(
				typeof module.createPendingSemanticRelationRecord,
				"function",
			);
			assert.deepEqual(
				call(module, "deduplicatePendingSemanticRelationRecords", []),
				[],
			);
			break;
		case "dumdict.plan-reading-entry": {
			const planner = call(module, "createDumdictPlanner", "de");
			const planned = planner.ensureReadingEntry(
				{ intent: "ensureReadingEntry", revision: "rss-0" },
				{
					entry: {
						reading,
						attestedTranslations: [],
						attestations: [],
						notes: "",
					},
				},
			);
			assert.equal(planned.status, "planned");
			assert.deepEqual(
				planned.plan.changes.map(
					(change: { type: string }) => change.type,
				),
				["createLemma", "createReading"],
			);
			break;
		}
		case "dumgen.select-authored": {
			const article = call(module, "selectNounHeadingArticle", lemma);
			assert.equal(article?.lemma?.canonicalForm, "die");
			assert.equal(
				call(module, "selectAuthoredArticle", article.reading),
				article,
			);
			break;
		}
		case "dumgen.validate-encounter": {
			const encounter = call(module, "validateEncounter", {
				sentence: {
					id: "rss",
					language: "de",
					segments: [{ kind: "ResolvableText", text: "Bank" }],
				},
				target: {
					family: "Lexeme",
					kind: "NOUN",
					memberSegmentIndices: [0],
				},
			});
			assert.equal(encounter.target.kind, "NOUN");
			break;
		}
		case "dumgen.resolve-supplied-target": {
			const dumgen = call(module, "createDumgen", {
				// Grammar resolution asks bounded feature questions; answer each
				// with its first concrete option so the probe never needs a model.
				judge: async (request: {
					questions: Record<
						string,
						{ criteria?: Record<string, unknown> }
					>;
				}) => ({
					model: "injected",
					usage: { input_tokens: 1, output_tokens: 1 },
					answers: Object.fromEntries(
						Object.entries(request.questions).map(
							([id, question]) => {
								const keys = Object.keys(
									question.criteria ?? {},
								);
								const choice =
									keys.find(
										(key) =>
											key !== "Unresolved" &&
											key !== "Unmarked",
									) ?? keys[0];
								return [
									id,
									{
										type: "choice",
										choice,
										confidence: 1,
										probabilities: Object.fromEntries(
											keys.map((key) => [
												key,
												key === choice ? 1 : 0,
											]),
										),
									},
								];
							},
						),
					),
				}),
				execute: async () => ({
					memberOrthographies: ["Standard"],
					normalizedMembers: ["Bank"],
					surface: {
						spelling: "Canonical",
						surfaceFeatures: null,
						inflectionalFeatures: { case: "Nom", number: "Sing" },
					},
					lemma: {
						canonicalForm: "Bank",
						coreFeatures: { gender: "Fem", hyph: null },
					},
					realizationCoverage: "Full",
				}),
			});
			const { runPromise } = await import("effect/Effect");
			const result: any = await runPromise(
				dumgen.resolveGrammar({
					sentence: {
						id: "rss",
						language: "de",
						segments: [{ kind: "ResolvableText", text: "Bank" }],
					},
					target: {
						family: "Lexeme",
						kind: "NOUN",
						memberSegmentIndices: [0],
					},
				}),
			);
			assert.equal(result.unitKind, "Attestation");
			break;
		}
		default:
			throw new Error(`Unknown representative operation: ${id}`);
	}
}
