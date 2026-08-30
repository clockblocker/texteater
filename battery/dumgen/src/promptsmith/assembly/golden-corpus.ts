import { fileURLToPath } from "node:url";

import { stableJson } from "../../lib/stable-json";
import type {
	CaseSelection,
	GoldenCase,
	GoldenCaseCollection,
	GoldenCaseCollectionRegistry,
	GoldenCaseGroup,
	GoldenCaseGroupRegistry,
	GoldenCaseRegistry,
	GoldenCorpus,
	ParsedGoldenCase,
	PromptInputSchema,
	PromptOutputSchema,
} from "./contracts";
import { normalizeContaminationKeys } from "./local-demonstrations";

type ParsedCaseEntry = {
	readonly id: string;
	readonly value: ParsedGoldenCase<PromptInputSchema, PromptOutputSchema>;
	readonly exactFingerprint: string;
	readonly routeFingerprint?: string;
	readonly contaminationKeys: readonly string[];
	readonly sourcePath?: string;
};

type CorpusState = {
	readonly identity: object;
	readonly route: string;
	readonly inputSchema: PromptInputSchema;
	readonly outputSchema: PromptOutputSchema;
	readonly entries: ReadonlyMap<string, ParsedCaseEntry>;
	readonly fingerprintInput?: (input: unknown) => string;
};

type GoldenCaseGroupState = {
	readonly cases: Readonly<Record<string, object>>;
};

type GoldenCaseCollectionState = {
	readonly sourcePath: string;
	readonly groups: Readonly<Record<string, GoldenCaseGroupState>>;
	readonly cases: Readonly<Record<string, object>>;
};

type SchemaGoldenCaseCollection<
	InputSchema extends PromptInputSchema,
	OutputSchema extends PromptOutputSchema,
> = GoldenCaseCollection<
	Readonly<
		Record<
			string,
			GoldenCaseGroup<GoldenCaseRegistry<InputSchema, OutputSchema>>
		>
	>,
	GoldenCaseRegistry<InputSchema, OutputSchema>
>;

export type SelectionState = {
	readonly corpus: CorpusState;
	readonly entries: readonly ParsedCaseEntry[];
};

const goldenCaseGroupStates = new WeakMap<object, GoldenCaseGroupState>();
const goldenCaseCollectionStates = new WeakMap<
	object,
	GoldenCaseCollectionState
>();
const corpusStates = new WeakMap<object, CorpusState>();
const selectionStates = new WeakMap<object, SelectionState>();

/** Defines a named composition group without assigning a consumer role. */
export function defineGoldenCaseGroup<
	const Cases extends Readonly<Record<string, object>>,
>(cases: Cases): GoldenCaseGroup<Cases> {
	const group = Object.freeze({}) as GoldenCaseGroup<Cases>;
	goldenCaseGroupStates.set(group, { cases });
	return group;
}

/** Defines one semantic case collection and records its source provenance. */
export function defineGoldenCaseCollection<
	const Groups extends GoldenCaseGroupRegistry = Record<never, never>,
	const Cases extends Readonly<Record<string, object>> = Record<never, never>,
>(
	source: string,
	definition: {
		readonly groups?: Groups;
		readonly cases: Cases;
	},
): GoldenCaseCollection<Groups, Cases> {
	const groups: Record<string, GoldenCaseGroupState> = {};
	for (const [name, group] of Object.entries(definition.groups ?? {})) {
		const state = goldenCaseGroupStates.get(group);
		if (state === undefined) {
			throw new Error(
				`Golden Case group "${name}" was not created by defineGoldenCaseGroup.`,
			);
		}
		groups[name] = state;
	}

	const collection = Object.freeze({}) as GoldenCaseCollection<Groups, Cases>;
	goldenCaseCollectionStates.set(collection, {
		sourcePath: source.startsWith("file:") ? fileURLToPath(source) : source,
		groups: Object.freeze(groups),
		cases: definition.cases,
	});
	return collection;
}

/**
 * Builds and freezes a route's Golden Corpus. Construction parses every case,
 * rejects duplicate exact inputs, resolves groups, and preserves explicit IDs.
 */
export function defineGoldenCorpus<
	InputSchema extends PromptInputSchema,
	OutputSchema extends PromptOutputSchema,
	const Collections extends Readonly<
		Record<string, SchemaGoldenCaseCollection<InputSchema, OutputSchema>>
	>,
>(args: {
	readonly route: string;
	readonly inputSchema: InputSchema;
	readonly outputSchema: OutputSchema;
	readonly collections: Collections;
	readonly fingerprintInput?: (
		input: import("zod").output<InputSchema>,
	) => string;
}): GoldenCorpus<InputSchema, OutputSchema, Collections> {
	assertNonEmpty(args.route, "Golden Corpus route");
	const identity = {};
	const parsedEntries = new Map<string, ParsedCaseEntry>();
	const exactFingerprints = new Map<string, string>();
	const {
		cases: flattenedCases,
		collections: collectionIds,
		groups: groupIds,
	} = flattenCollections(args.collections, args.route);

	for (const { id, goldenCase, sourcePath } of flattenedCases) {
		assertNonEmpty(id, "Golden Case ID");
		const location = `Golden Case "${id}" for route "${args.route}"`;
		const parsedInput = args.inputSchema.safeParse(
			withLegacyPronounReferenceNulls(goldenCase.input),
		);
		if (!parsedInput.success) {
			throw new Error(`${location} has invalid input.`, {
				cause: parsedInput.error,
			});
		}
		const parsedOutput = args.outputSchema.safeParse(
			goldenCase.idealOutput,
		);
		if (!parsedOutput.success) {
			throw new Error(`${location} has invalid ideal output.`, {
				cause: parsedOutput.error,
			});
		}

		const explanation = goldenCase.explanation?.trim();
		if (explanation !== undefined && explanation.length === 0) {
			throw new Error(`${location} has an empty explanation.`);
		}
		const contaminationKeys = normalizeContaminationKeys(
			location,
			goldenCase.contaminationKeys,
		);
		const exactFingerprint = stableJson(parsedInput.data);
		const duplicateId = exactFingerprints.get(exactFingerprint);
		if (duplicateId !== undefined) {
			throw new Error(
				`Golden Corpus "${args.route}" has duplicate exact parsed-input fingerprints for cases "${duplicateId}" and "${id}".`,
			);
		}
		exactFingerprints.set(exactFingerprint, id);

		const routeFingerprint = args.fingerprintInput?.(parsedInput.data);
		if (
			routeFingerprint !== undefined &&
			typeof routeFingerprint !== "string"
		) {
			throw new Error(
				`${location} produced a non-string route fingerprint.`,
			);
		}
		const value = deepFreeze({
			input: parsedInput.data,
			idealOutput: parsedOutput.data,
			...(explanation === undefined ? {} : { explanation }),
			...(contaminationKeys.length === 0 ? {} : { contaminationKeys }),
		}) as ParsedGoldenCase<InputSchema, OutputSchema>;
		parsedEntries.set(id, {
			id,
			value,
			exactFingerprint,
			...(routeFingerprint === undefined ? {} : { routeFingerprint }),
			contaminationKeys,
			sourcePath,
		});
	}

	const state: CorpusState = {
		identity,
		route: args.route,
		inputSchema: args.inputSchema,
		outputSchema: args.outputSchema,
		entries: parsedEntries,
		...(args.fingerprintInput === undefined
			? {}
			: {
					fingerprintInput: args.fingerprintInput as (
						input: unknown,
					) => string,
				}),
	};
	const select = (ids: readonly string[]) => createSelection(state, ids);
	const cases = Object.freeze(
		Object.fromEntries(
			[...parsedEntries].map(([id, entry]) => [id, entry.value]),
		),
	) as Readonly<Record<string, ParsedGoldenCase<InputSchema, OutputSchema>>>;
	const groups = resolveGroups(groupIds, select, args.route);
	const resolvedCollections = resolveCollections(
		collectionIds,
		select,
		args.route,
	);

	const corpus = Object.freeze({
		route: args.route,
		inputSchema: args.inputSchema,
		outputSchema: args.outputSchema,
		cases,
		collections: resolvedCollections,
		groups,
		select,
		all: () => select([...parsedEntries.keys()]),
	}) as GoldenCorpus<InputSchema, OutputSchema, Collections>;
	corpusStates.set(corpus, state);
	return corpus;
}

function withLegacyPronounReferenceNulls(input: unknown): unknown {
	if (input === null || typeof input !== "object" || Array.isArray(input)) {
		return input;
	}
	const value = input as Readonly<Record<string, unknown>>;
	const reading = value.reading;
	if (
		reading === null ||
		typeof reading !== "object" ||
		Array.isArray(reading)
	) {
		return input;
	}
	const readingRecord = reading as Readonly<Record<string, unknown>>;
	const lemma = readingRecord.lemma;
	if (lemma === null || typeof lemma !== "object" || Array.isArray(lemma)) {
		return input;
	}
	const lemmaRecord = lemma as Readonly<Record<string, unknown>>;
	const core = lemmaRecord.coreFeatures;
	if (
		lemmaRecord.language !== "de" ||
		lemmaRecord.family !== "Lexeme" ||
		lemmaRecord.kind !== "PRON" ||
		core === null ||
		typeof core !== "object" ||
		Array.isArray(core)
	) {
		return input;
	}
	const coreRecord = core as Readonly<Record<string, unknown>>;
	if (
		Object.hasOwn(coreRecord, "referenceGender") &&
		Object.hasOwn(coreRecord, "referenceNumber")
	) {
		return input;
	}
	return {
		...value,
		reading: {
			...readingRecord,
			lemma: {
				...lemmaRecord,
				coreFeatures: {
					...coreRecord,
					referenceGender: coreRecord.referenceGender ?? null,
					referenceNumber: coreRecord.referenceNumber ?? null,
				},
			},
		},
	};
}

export function getGoldenCorpusState(corpus: GoldenCorpus): CorpusState {
	const state = corpusStates.get(corpus);
	if (state === undefined) {
		throw new Error("GoldenCorpus was not created by defineGoldenCorpus.");
	}
	return state;
}

export function getSelectionState(selection: CaseSelection): SelectionState {
	const state = selectionStates.get(selection);
	if (state === undefined) {
		throw new Error("CaseSelection was not created by a Golden Corpus.");
	}
	return state;
}

export function tryGetSelectionState(
	selection: object,
): SelectionState | undefined {
	return selectionStates.get(selection);
}

export function selectedCaseSourcePaths(
	selection: CaseSelection,
): readonly string[] {
	const seen = new Set<string>();
	const paths: string[] = [];
	for (const entry of getSelectionState(selection).entries) {
		if (entry.sourcePath !== undefined && !seen.has(entry.sourcePath)) {
			seen.add(entry.sourcePath);
			paths.push(entry.sourcePath);
		}
	}
	return Object.freeze(paths);
}

function createSelection(
	corpus: CorpusState,
	ids: readonly string[],
): CaseSelection {
	const seen = new Set<string>();
	const entries: ParsedCaseEntry[] = [];
	for (const id of ids) {
		if (seen.has(id)) {
			throw new Error(
				`CaseSelection for route "${corpus.route}" repeats case ID "${id}".`,
			);
		}
		const entry = corpus.entries.get(id);
		if (entry === undefined) {
			throw new Error(
				`CaseSelection for route "${corpus.route}" names unknown case ID "${id}".`,
			);
		}
		seen.add(id);
		entries.push(entry);
	}

	const frozenEntries = Object.freeze(entries);
	const frozenIds = Object.freeze(entries.map(({ id }) => id));
	const frozenCases = Object.freeze(entries.map(({ value }) => value));
	const selection: CaseSelection = Object.freeze({
		ids: frozenIds,
		cases: frozenCases,
		isEmpty: entries.length === 0,
		has: (caseId: string) => seen.has(caseId),
		union(other: CaseSelection) {
			const right = assertSameCorpus(corpus, other);
			return createSelection(corpus, [
				...frozenIds,
				...right.entries
					.map(({ id }) => id)
					.filter((id) => !seen.has(id)),
			]);
		},
		intersection(other: CaseSelection) {
			const rightIds = new Set(
				assertSameCorpus(corpus, other).entries.map(({ id }) => id),
			);
			return createSelection(
				corpus,
				frozenIds.filter((id) => rightIds.has(id)),
			);
		},
		difference(other: CaseSelection) {
			const rightIds = new Set(
				assertSameCorpus(corpus, other).entries.map(({ id }) => id),
			);
			return createSelection(
				corpus,
				frozenIds.filter((id) => !rightIds.has(id)),
			);
		},
		isDisjointFrom(other: CaseSelection) {
			return assertSameCorpus(corpus, other).entries.every(
				({ id }) => !seen.has(id),
			);
		},
	});
	selectionStates.set(selection, { corpus, entries: frozenEntries });
	return selection;
}

function assertSameCorpus(
	corpus: CorpusState,
	other: CaseSelection,
): SelectionState {
	const otherState = getSelectionState(other);
	if (otherState.corpus.identity !== corpus.identity) {
		throw new Error(
			`Cannot combine CaseSelections from different Golden Corpora ("${corpus.route}" and "${otherState.corpus.route}").`,
		);
	}
	return otherState;
}

function flattenCollections(
	collections: GoldenCaseCollectionRegistry,
	route: string,
): {
	readonly cases: readonly {
		readonly id: string;
		readonly goldenCase: GoldenCase<unknown, unknown>;
		readonly sourcePath: string;
	}[];
	readonly groups: Readonly<
		Record<string, Readonly<Record<string, readonly string[]>>>
	>;
	readonly collections: Readonly<Record<string, readonly string[]>>;
} {
	const cases: {
		id: string;
		goldenCase: GoldenCase<unknown, unknown>;
		sourcePath: string;
	}[] = [];
	const groups: Record<
		string,
		Readonly<Record<string, readonly string[]>>
	> = {};
	const collectionIds: Record<string, readonly string[]> = {};
	const caseLocations = new Map<string, string>();

	for (const [collectionName, collection] of Object.entries(collections)) {
		assertNonEmpty(collectionName, "Golden Case collection name");
		const state = goldenCaseCollectionStates.get(collection);
		if (state === undefined) {
			throw new Error(
				`Golden Corpus "${route}" collection "${collectionName}" was not created by defineGoldenCaseCollection.`,
			);
		}

		const collectionGroups: Record<string, readonly string[]> = {};
		const collectionCaseIds: string[] = [];
		for (const [groupName, group] of Object.entries(state.groups)) {
			assertNonEmpty(groupName, "Golden Case group name");
			const location = `collection "${collectionName}" group "${groupName}"`;
			const groupIds = Object.keys(group.cases);
			collectionGroups[groupName] = Object.freeze(groupIds);
			for (const [id, goldenCase] of Object.entries(group.cases)) {
				addFlattenedCase(id, goldenCase, state.sourcePath, location);
				collectionCaseIds.push(id);
			}
		}
		groups[collectionName] = Object.freeze(collectionGroups);

		const location = `collection "${collectionName}"`;
		for (const [id, goldenCase] of Object.entries(state.cases)) {
			addFlattenedCase(id, goldenCase, state.sourcePath, location);
			collectionCaseIds.push(id);
		}
		collectionIds[collectionName] = Object.freeze(collectionCaseIds);
	}

	return {
		cases: Object.freeze(cases),
		collections: Object.freeze(collectionIds),
		groups: Object.freeze(groups),
	};

	function addFlattenedCase(
		id: string,
		goldenCase: object,
		sourcePath: string,
		location: string,
	): void {
		assertNonEmpty(id, "Golden Case ID");
		const previousLocation = caseLocations.get(id);
		if (previousLocation !== undefined) {
			throw new Error(
				`Golden Corpus "${route}" repeats case ID "${id}" in ${previousLocation} and ${location}.`,
			);
		}
		caseLocations.set(id, location);
		cases.push({
			id,
			goldenCase: goldenCase as GoldenCase<unknown, unknown>,
			sourcePath,
		});
	}
}

function resolveCollections(
	collections: Readonly<Record<string, readonly string[]>>,
	select: (ids: readonly string[]) => CaseSelection,
	route: string,
): unknown {
	const resolved: Record<string, CaseSelection> = {};
	for (const [collectionName, ids] of Object.entries(collections)) {
		try {
			resolved[collectionName] = select(ids);
		} catch (cause) {
			throw new Error(
				`Golden Corpus "${route}" collection "${collectionName}" is invalid.`,
				{ cause },
			);
		}
	}
	return Object.freeze(resolved);
}

function resolveGroups(
	groups: Readonly<
		Record<string, Readonly<Record<string, readonly string[]>>>
	>,
	select: (ids: readonly string[]) => CaseSelection,
	route: string,
): unknown {
	const resolved: Record<string, unknown> = {};
	for (const [collectionName, collectionGroups] of Object.entries(groups)) {
		const resolvedCollection: Record<string, CaseSelection> = {};
		for (const [groupName, ids] of Object.entries(collectionGroups)) {
			const location = `Golden Corpus "${route}" group "${collectionName}.${groupName}"`;
			try {
				resolvedCollection[groupName] = select(ids);
			} catch (cause) {
				throw new Error(`${location} is invalid.`, { cause });
			}
		}
		resolved[collectionName] = Object.freeze(resolvedCollection);
	}
	return Object.freeze(resolved);
}

function assertNonEmpty(value: string, label: string): void {
	if (value.trim().length === 0) {
		throw new Error(`${label} must not be empty.`);
	}
}

function deepFreeze<T>(value: T): T {
	if (
		value !== null &&
		typeof value === "object" &&
		!Object.isFrozen(value)
	) {
		for (const nested of Object.values(value)) deepFreeze(nested);
		Object.freeze(value);
	}
	return value;
}
