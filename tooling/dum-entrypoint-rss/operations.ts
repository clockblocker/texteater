type PublicModule = Record<string, unknown>;

type RepresentativeOperation = (
	publicModule: PublicModule,
) => Promise<void> | void;

const germanNounLemma = {
	canonicalForm: "Haus",
	coreFeatures: { gender: "Neut", hyph: null },
	family: "Lexeme",
	kind: "NOUN",
	language: "de",
} as const;

const englishVerbLemma = {
	canonicalForm: "walk",
	coreFeatures: {
		abbr: null,
		extPos: null,
		hasGovPrep: null,
		phrasal: null,
		style: null,
	},
	family: "Lexeme",
	kind: "VERB",
	language: "en",
} as const;

const englishReading = {
	emojiDescription: "🚶",
	lemma: englishVerbLemma,
} as const;

function exportedFunction(
	publicModule: PublicModule,
	name: string,
): (...args: never[]) => unknown {
	const value = publicModule[name];
	if (typeof value !== "function") {
		throw new Error(`Representative operation expected export ${name}.`);
	}
	return value as (...args: never[]) => unknown;
}

function assert(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

function noNetworkSdk() {
	return {
		async structuredGeneration() {
			throw new Error(
				"RSS representative operation must not call a model.",
			);
		},
		async unstructuredGeneration() {
			throw new Error(
				"RSS representative operation must not call a model.",
			);
		},
	};
}

const operations: Readonly<Record<string, RepresentativeOperation>> = {
	"dumling.parse-lemma"(publicModule) {
		const getLanguageApi = exportedFunction(publicModule, "getLanguageApi");
		const languageApi = getLanguageApi("de" as never) as {
			parse: { lemma(input: unknown): { success: boolean } };
		};
		assert(
			languageApi.parse.lemma(germanNounLemma).success,
			"Dumling representative Lemma must parse.",
		);
	},
	"dumling.reading-fingerprint"(publicModule) {
		const readingFingerprint = exportedFunction(
			publicModule,
			"readingFingerprint",
		);
		const fingerprint = readingFingerprint(englishReading as never);
		assert(
			typeof fingerprint === "string" && fingerprint.length > 0,
			"Dumling representative Reading must have a fingerprint.",
		);
	},
	"dumling.id-round-trip"(publicModule) {
		const buildIdOperations = exportedFunction(
			publicModule,
			"buildIdOperations",
		) as unknown as (
			language: "en",
			parse: {
				lemma(input: unknown): { success: true; data: unknown };
				surface(input: unknown): { success: true; data: unknown };
			},
		) => {
			decode: {
				asLemmaIdentity(input: string): {
					data?: {
						kind: string;
						language: string;
					};
					success: boolean;
				};
			};
			encode: { asBase64Url(input: unknown): string };
		};
		const acceptCanonicalEntity = (input: unknown) => ({
			data: input,
			success: true as const,
		});
		const id = buildIdOperations("en", {
			lemma: acceptCanonicalEntity,
			surface: acceptCanonicalEntity,
		});
		const encoded = id.encode.asBase64Url(englishVerbLemma);
		const decoded = id.decode.asLemmaIdentity(encoded);
		assert(
			decoded.success &&
				decoded.data?.kind === "Lemma" &&
				decoded.data.language === "en",
			"Dumling lean ID facade must round-trip a canonical English Lemma.",
		);
	},
	"dumling.read-vocabulary"(publicModule) {
		assert(
			Array.isArray(publicModule.memberOrthographyValues) &&
				publicModule.memberOrthographyValues.includes("Standard"),
			"Dumling runtime vocabulary must contain Standard orthography.",
		);
	},
	"dumrel.apply-knowledge-change"(publicModule) {
		const applyKnowledgeChange = exportedFunction(
			publicModule,
			"applyKnowledgeChange",
		);
		const result = applyKnowledgeChange(
			undefined as never,
			{
				aspect: "definition",
				kind: "Contribute",
				value: " a dwelling ",
			} as never,
		) as { definition?: string };
		assert(
			result.definition === "a dwelling",
			"Dumrel representative Knowledge Change must normalize its value.",
		);
	},
	"dumrel.project-relations"(publicModule) {
		const projectRelations = exportedFunction(
			publicModule,
			"projectRelations",
		);
		const result = projectRelations({
			edges: [],
			readings: [{ lemma: "lemma:house", reading: "reading:house" }],
		} as never);
		assert(
			Array.isArray(result) && result.length === 0,
			"Dumrel representative graph must project to an empty edge list.",
		);
	},
	"dumrel.read-default-settings"(publicModule) {
		const settings = publicModule.DEFAULT_KNOWLEDGE_SETTINGS as
			| { definition?: boolean }
			| undefined;
		assert(
			settings?.definition === true && Object.isFrozen(settings),
			"Dumrel default Knowledge Settings must be enabled and frozen.",
		);
	},
	"dumrel.read-vocabulary"(publicModule) {
		assert(
			Array.isArray(publicModule.semanticRelationValues) &&
				publicModule.semanticRelationValues.includes("synonym"),
			"Dumrel runtime vocabulary must contain synonym.",
		);
	},
	"dumdict.apply-knowledge-change"(publicModule) {
		const applyDumdictKnowledgeChange = exportedFunction(
			publicModule,
			"applyDumdictKnowledgeChange",
		);
		const result = applyDumdictKnowledgeChange(
			{
				attestations: ["They walk home together."],
				attestedTranslations: ["walk"],
				notes: "Core motion reading.",
				reading: englishReading,
			} as never,
			{
				change: {
					aspect: "definition",
					kind: "Contribute",
					value: " motion on foot ",
				},
				reading: englishReading,
			} as never,
		) as { knowledge?: { definition?: string } };
		assert(
			result.knowledge?.definition === "motion on foot",
			"Dumdict representative Knowledge Change must update the Reading Entry.",
		);
	},
	"dumdict.project-relations"(publicModule) {
		const projectSemanticRelations = exportedFunction(
			publicModule,
			"projectSemanticRelations",
		);
		const result = projectSemanticRelations({
			lemmas: [],
			readings: [],
		} as never);
		assert(
			Array.isArray(result) && result.length === 0,
			"Dumdict empty inventory must project to an empty relation list.",
		);
	},
	"dumgen.build"(publicModule) {
		const buildDumgen = exportedFunction(publicModule, "buildDumgen");
		const dumgen = buildDumgen({ sdk: noNetworkSdk() } as never) as {
			segment?: unknown;
		};
		assert(
			typeof dumgen.segment === "function",
			"Dumgen representative runtime must expose segmentation.",
		);
	},
	"dumgen.project-grammatical-input"(publicModule) {
		const project = exportedFunction(
			publicModule,
			"projectGrammaticalResolutionInput",
		);
		const result = project({
			memberSegmentIndices: [0],
			segments: [{ kind: "ResolvableText", text: "Haus" }],
		} as never) as { markedContext?: string; members?: readonly string[] };
		assert(
			result.markedContext === "<TARGET>Haus</TARGET>" &&
				result.members?.[0] === "Haus",
			"Dumgen representative grammatical input must preserve the target.",
		);
	},
	"dumgen.build-knowledge"(publicModule) {
		const buildKnowledgeDumgen = exportedFunction(
			publicModule,
			"buildKnowledgeDumgen",
		);
		const dumgen = buildKnowledgeDumgen({
			sdk: noNetworkSdk(),
		} as never) as {
			generate?: unknown;
		};
		assert(
			typeof dumgen.generate === "object",
			"Dumgen representative Knowledge runtime must expose generation.",
		);
	},
	"dumgen.build-knowledge-runtime"(publicModule) {
		const buildKnowledgeDumgenRuntime = exportedFunction(
			publicModule,
			"buildKnowledgeDumgenRuntime",
		);
		const dumgen = buildKnowledgeDumgenRuntime({
			sdk: noNetworkSdk(),
		} as never) as {
			generate?: unknown;
		};
		assert(
			typeof dumgen.generate === "object",
			"Dumgen representative injected Knowledge runtime must expose generation.",
		);
	},
	async "dumgen.openai-fetch"(publicModule) {
		const buildOpenAiFetchSdk = exportedFunction(
			publicModule,
			"buildOpenAiFetchSdk",
		);
		const sdk = buildOpenAiFetchSdk({
			apiKey: "rss-audit",
			fetch: async () =>
				Response.json({
					output: [
						{
							content: [{ text: "ok", type: "output_text" }],
							type: "message",
						},
					],
					status: "completed",
				}),
		} as never) as {
			unstructuredGeneration(input: string): Promise<string>;
		};
		assert(
			(await sdk.unstructuredGeneration("rss audit")) === "ok",
			"Dumgen fetch adapter must complete a representative response.",
		);
	},
	"dumgen.build-runtime"(publicModule) {
		const buildDumgenRuntime = exportedFunction(
			publicModule,
			"buildDumgenRuntime",
		);
		const dumgen = buildDumgenRuntime({
			generateKnowledge: async () => {
				throw new Error(
					"RSS representative operation must not call a model.",
				);
			},
			sdk: noNetworkSdk(),
		} as never) as { resolve?: unknown };
		assert(
			typeof dumgen.resolve === "object",
			"Dumgen representative injected runtime must expose resolution.",
		);
	},
	"dumgen.read-vocabulary"(publicModule) {
		assert(
			Array.isArray(publicModule.segmentKindValues) &&
				publicModule.segmentKindValues.includes("ResolvableText"),
			"Dumgen runtime vocabulary must contain ResolvableText.",
		);
	},
};

export async function runRepresentativeOperation(
	operationId: string,
	publicModule: PublicModule,
): Promise<void> {
	const operation = operations[operationId];
	if (operation === undefined) {
		throw new Error(`Unknown representative operation: ${operationId}`);
	}
	await operation(publicModule);
}
