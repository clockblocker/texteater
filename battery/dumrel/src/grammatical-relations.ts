import type {
	GrammaticalRelationClaim,
	GrammaticalRelationProjection,
	GrammaticalSeries,
} from "./types.js";
import {
	grammaticalRelationValues,
	grammaticalSeriesAxisValues,
} from "./vocabulary.js";

export type {
	GrammaticalEndpointKind,
	GrammaticalRelation,
	GrammaticalRelationClaim,
	GrammaticalRelationProjection,
	GrammaticalSeries,
	GrammaticalSeriesAxis,
	GrammaticalSeriesMember,
	LemmaGrammaticalRelationClaim,
	LemmaGrammaticalSeries,
	ReadingGrammaticalRelationClaim,
	ReadingGrammaticalSeries,
} from "./types.js";
export {
	grammaticalRelationValues,
	grammaticalSeriesAxisValues,
} from "./vocabulary.js";

export const grammaticalRelationAlgebra = deepFreeze({
	CaseCounterpart: {
		symmetric: true,
		transitive: false,
		substitutive: false,
	},
	PersonCounterpart: {
		symmetric: true,
		transitive: false,
		substitutive: false,
	},
} as const);

/** Compiles one authored Series into unique, canonical direct peer claims. */
export function compileGrammaticalSeries(
	series: GrammaticalSeries,
): GrammaticalRelationClaim[] {
	const unique = new Map<
		string,
		(typeof series.members)[number]["endpoint"]
	>();
	for (const { endpoint } of series.members) {
		unique.set(endpointKey(endpoint), endpoint);
	}
	const endpoints = [...unique.entries()].toSorted(([left], [right]) =>
		left.localeCompare(right),
	);
	const claims: GrammaticalRelationClaim[] = [];
	for (
		let sourceIndex = 0;
		sourceIndex < endpoints.length;
		sourceIndex += 1
	) {
		for (
			let targetIndex = sourceIndex + 1;
			targetIndex < endpoints.length;
			targetIndex += 1
		) {
			const source = endpoints[sourceIndex]?.[1];
			const target = endpoints[targetIndex]?.[1];
			if (!source || !target) continue;
			claims.push(
				series.endpointKind === "reading"
					? {
							endpointKind: "reading",
							relation: series.relation,
							source: source as never,
							target: target as never,
						}
					: {
							endpointKind: "lemma",
							relation: series.relation,
							source: source as never,
							target: target as never,
						},
			);
		}
	}
	return deepFreeze(claims);
}

/** Projects symmetric inverse views only; there is no transitive closure. */
export function projectGrammaticalRelations(
	claims: readonly GrammaticalRelationClaim[],
): GrammaticalRelationProjection[] {
	const projections = new Map<string, GrammaticalRelationProjection>();
	for (const claim of claims) {
		if (endpointKey(claim.source) === endpointKey(claim.target)) continue;
		putProjection(projections, { ...claim, provenance: "direct" });
		putProjection(projections, {
			...claim,
			source: claim.target,
			target: claim.source,
			provenance: "inferred",
		} as GrammaticalRelationProjection);
	}
	return deepFreeze(
		[...projections.values()].toSorted((left, right) =>
			projectionKey(left).localeCompare(projectionKey(right)),
		),
	);
}

function putProjection(
	projections: Map<string, GrammaticalRelationProjection>,
	projection: GrammaticalRelationProjection,
): void {
	const key = projectionKey(projection);
	const existing = projections.get(key);
	if (!existing || existing.provenance === "inferred") {
		projections.set(key, projection);
	}
}

function projectionKey(claim: GrammaticalRelationClaim): string {
	return [
		claim.endpointKind,
		claim.relation,
		endpointKey(claim.source),
		endpointKey(claim.target),
	].join("\0");
}

function endpointKey(endpoint: unknown): string {
	return canonicalJson(endpoint);
}

function canonicalJson(value: unknown): string {
	if (value === null || typeof value !== "object")
		return JSON.stringify(value);
	if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
	return `{${Object.entries(value as Record<string, unknown>)
		.toSorted(([left], [right]) => left.localeCompare(right))
		.map(
			([key, member]) =>
				`${JSON.stringify(key)}:${canonicalJson(member)}`,
		)
		.join(",")}}`;
}

function deepFreeze<T>(value: T): T {
	if (value !== null && typeof value === "object") {
		for (const member of Object.values(value)) deepFreeze(member);
		Object.freeze(value);
	}
	return value;
}

grammaticalRelationValues satisfies readonly string[];
grammaticalSeriesAxisValues satisfies readonly string[];
