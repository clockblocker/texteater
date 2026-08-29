export type AnyRecord = Record<string, unknown>;

export function requireRecord(value: unknown, context: string): AnyRecord {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(`${context} must be an object.`);
	}
	return value as AnyRecord;
}

export function requireString(value: unknown, context: string): string {
	if (typeof value !== "string" || value.length === 0) {
		throw new Error(`${context} must be a non-empty string.`);
	}
	return value;
}

export function withoutKeys(
	record: AnyRecord,
	keys: readonly string[],
): AnyRecord {
	const result = { ...record };
	for (const key of keys) delete result[key];
	return result;
}

export function stableFingerprint(value: unknown): string {
	return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(sortValue);
	if (value !== null && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value as AnyRecord)
				.sort(([left], [right]) =>
					left < right ? -1 : left > right ? 1 : 0,
				)
				.map(([key, child]) => [key, sortValue(child)]),
		);
	}
	return value;
}

function appendUnique(
	existing: readonly unknown[],
	additions: readonly unknown[],
): unknown[] {
	const result = existing.map((value) => structuredClone(value));
	const fingerprints = new Set(result.map(stableFingerprint));
	for (const value of additions) {
		const fingerprint = stableFingerprint(value);
		if (fingerprints.has(fingerprint)) continue;
		result.push(structuredClone(value));
		fingerprints.add(fingerprint);
	}
	return result;
}

function stableUnique(values: readonly unknown[]): unknown[] {
	return appendUnique([], values);
}

export function requireChangeKind(
	value: unknown,
): "Contribute" | "Correct" | "Retract" {
	if (value !== "Contribute" && value !== "Correct" && value !== "Retract") {
		throw new Error(`Unsupported Knowledge Change kind: ${String(value)}`);
	}
	return value;
}

export function requireArray(value: unknown, context: string): unknown[] {
	if (!Array.isArray(value)) throw new Error(`${context} must be an array.`);
	return value;
}

/** Apply a Knowledge Change that was validated before entering persistence. */
export function applyTrustedReadingKnowledgeChange(
	existingValue: unknown,
	change: AnyRecord,
): AnyRecord {
	const result =
		existingValue === undefined
			? {}
			: structuredClone(
					requireRecord(existingValue, "Stored Reading Knowledge"),
				);
	const kind = requireChangeKind(change.kind);
	const aspect = requireString(change.aspect, "Knowledge Change aspect");
	if (aspect === "translations") {
		const language = requireString(
			change.language,
			"Translation target language",
		);
		const buckets =
			result.translations === undefined
				? {}
				: {
						...requireRecord(
							result.translations,
							"Reading translation buckets",
						),
					};
		if (kind === "Retract") delete buckets[language];
		else {
			const values = requireArray(change.value, "Translation values");
			const current =
				buckets[language] === undefined
					? []
					: requireArray(
							buckets[language],
							"Stored translation values",
						);
			buckets[language] =
				kind === "Correct"
					? stableUnique(values)
					: appendUnique(current, values);
		}
		if (Object.keys(buckets).length === 0) delete result.translations;
		else result.translations = buckets;
		return result;
	}
	if (aspect === "semanticRelations") {
		const relation = requireString(change.relation, "Semantic Relation");
		const relations =
			result.semanticRelations === undefined
				? {}
				: {
						...requireRecord(
							result.semanticRelations,
							"Stored Semantic Relations",
						),
					};
		if (kind === "Retract") delete relations[relation];
		else {
			const values = requireArray(
				change.value,
				"Semantic Relation values",
			);
			const current =
				relations[relation] === undefined
					? []
					: requireArray(
							relations[relation],
							"Stored Semantic Relation values",
						);
			relations[relation] =
				kind === "Correct"
					? stableUnique(values)
					: appendUnique(current, values);
		}
		if (Object.keys(relations).length === 0)
			delete result.semanticRelations;
		else result.semanticRelations = relations;
		return result;
	}
	if (
		aspect !== "transcription" &&
		aspect !== "definition" &&
		aspect !== "morphologicalTree" &&
		aspect !== "lexicalBreakdown"
	) {
		throw new Error(`Unsupported Reading Knowledge aspect: ${aspect}`);
	}
	if (kind === "Retract") {
		delete result[aspect];
		return result;
	}
	if (change.value === undefined) {
		throw new Error(`${aspect} Knowledge Change requires a value.`);
	}
	if (
		kind === "Contribute" &&
		result[aspect] !== undefined &&
		stableFingerprint(result[aspect]) !== stableFingerprint(change.value)
	) {
		throw new Error(
			`Contribute conflicts with existing ${aspect}; use Correct to replace it.`,
		);
	}
	result[aspect] = structuredClone(change.value);
	return result;
}
