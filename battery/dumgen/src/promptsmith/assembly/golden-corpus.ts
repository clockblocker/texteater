import { fileURLToPath } from "node:url";

import { stableJson } from "../../lib/stable-json";
import type {
	CaseSelection,
	GoldenCaseRegistry,
	GoldenCorpus,
	GoldenGroupTree,
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

export type SelectionState = {
	readonly corpus: CorpusState;
	readonly entries: readonly ParsedCaseEntry[];
};

const goldenCaseSources = new WeakMap<object, string>();
const corpusStates = new WeakMap<object, CorpusState>();
const selectionStates = new WeakMap<object, SelectionState>();

export function defineGoldenCases<
	const Cases extends Readonly<Record<string, object>>,
>(source: string, cases: Cases): Cases {
	const sourcePath = source.startsWith("file:")
		? fileURLToPath(source)
		: source;
	for (const goldenCase of Object.values(cases)) {
		goldenCaseSources.set(goldenCase, sourcePath);
	}
	return cases;
}

export function defineGoldenCorpus<
	InputSchema extends PromptInputSchema,
	OutputSchema extends PromptOutputSchema,
	const Groups extends GoldenGroupTree = Record<never, never>,
>(args: {
	readonly route: string;
	readonly inputSchema: InputSchema;
	readonly outputSchema: OutputSchema;
	readonly cases: GoldenCaseRegistry<InputSchema, OutputSchema>;
	readonly groups?: Groups;
	readonly fingerprintInput?: (
		input: import("zod").output<InputSchema>,
	) => string;
}): GoldenCorpus<InputSchema, OutputSchema, Groups> {
	assertNonEmpty(args.route, "Golden Corpus route");
	const identity = {};
	const parsedEntries = new Map<string, ParsedCaseEntry>();
	const exactFingerprints = new Map<string, string>();

	for (const [id, goldenCase] of Object.entries(args.cases)) {
		assertNonEmpty(id, "Golden Case ID");
		const location = `Golden Case "${id}" for route "${args.route}"`;
		const parsedInput = args.inputSchema.safeParse(goldenCase.input);
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
			sourcePath: goldenCaseSources.get(goldenCase),
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
	const groups = resolveGroups(
		args.groups ?? ({} as Groups),
		select,
		args.route,
		[],
	);

	const corpus = Object.freeze({
		route: args.route,
		inputSchema: args.inputSchema,
		outputSchema: args.outputSchema,
		cases,
		groups,
		select,
		all: () => select([...parsedEntries.keys()]),
	}) as GoldenCorpus<InputSchema, OutputSchema, Groups>;
	corpusStates.set(corpus, state);
	return corpus;
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

function resolveGroups(
	groups: GoldenGroupTree,
	select: (ids: readonly string[]) => CaseSelection,
	route: string,
	parents: readonly string[],
): unknown {
	const resolved: Record<string, unknown> = {};
	for (const [name, value] of Object.entries(groups)) {
		const path = [...parents, name];
		const location = `Golden Corpus "${route}" group "${path.join(".")}"`;
		if (Array.isArray(value)) {
			try {
				resolved[name] = select(value);
			} catch (cause) {
				throw new Error(`${location} is invalid.`, { cause });
			}
		} else if (value !== null && typeof value === "object") {
			resolved[name] = resolveGroups(
				value as GoldenGroupTree,
				select,
				route,
				path,
			);
		} else {
			throw new Error(
				`${location} must be an ID list or nested group object.`,
			);
		}
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
