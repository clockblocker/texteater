import { isRecord } from "common-utils";
import { normalizeForm } from "dumling";
import type * as Dumling from "dumling/types";
import {
	foldedCanonicalForm,
	lemmaIdentityKey,
} from "../../server/linguisticIdentity";
import type { ScrollLanguage } from "../../shared/supported-target-language";
import type { Id, TableNames } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { syncDefinitionText } from "./definitionTexts";
import { isLemmaRoute } from "./lemmaRoutes";
import type { StructuralShadowAspect } from "./validators";

export const MAX_STRUCTURAL_REFERENCES_PER_READING = 200;
const descriptorKeys = ["canonicalForm", "family", "kind", "language"];

export type ShadowDescriptor = {
	readonly language: ScrollLanguage;
	readonly canonicalForm: string;
	readonly family: Dumling.Family;
	readonly kind: Dumling.Kind;
};

export type StructuralShadowReference = {
	readonly descriptor: ShadowDescriptor;
	readonly aspect: StructuralShadowAspect;
	readonly path: string;
};

/**
 * The outcome of parsing a stored value. Read paths skip a failure and report
 * it; mutation paths go through the throwing wrappers, so a malformed write
 * aborts its transaction.
 */
type ParseResult<T> = { readonly ok: true; readonly value: T } | ParseFailure;
type ParseFailure = { readonly ok: false; readonly error: string };

function parsed<T>(value: T): ParseResult<T> {
	return { ok: true, value };
}

function parseFailure(error: string): ParseFailure {
	return { ok: false, error };
}

function unwrap<T>(result: ParseResult<T>): T {
	if (!result.ok) throw new Error(result.error);
	return result.value;
}

/**
 * Reports one stored row a read path skipped because it no longer parses, as
 * a single JSON line. Maintenance audits count such rows instead.
 */
export function warnMalformedStoredRow(
	table: TableNames,
	id: string,
	reason: string,
): void {
	console.warn(
		JSON.stringify({ event: "MalformedStoredRow", table, id, reason }),
	);
}

function parseNormalizedString(
	value: unknown,
	context: string,
): ParseResult<string> {
	if (typeof value !== "string") {
		return parseFailure(`${context} must be a string.`);
	}
	const normalized = normalizeForm(value);
	return normalized.length === 0
		? parseFailure(`${context} must not be empty.`)
		: parsed(normalized);
}

type ShadowDescriptorCandidate = {
	readonly language: ScrollLanguage;
	readonly canonicalForm: string;
	readonly family: string;
	readonly kind: string;
};

/** A descriptor whose Family and Kind name a Dumling Lemma route is a Unit Shadow descriptor. */
function isShadowDescriptor(
	candidate: ShadowDescriptorCandidate,
): candidate is ShadowDescriptor {
	return isLemmaRoute(candidate.language, candidate.family, candidate.kind);
}

/**
 * Compact storage-side check. The exhaustive Dumrel route validation happens
 * in the Node action adapter before a plan reaches Convex; this normalizes the
 * Canonical Form and checks the language, Family and Kind as the exact closed
 * names Dumdict's parser accepts.
 */
function parseShadowDescriptor(value: unknown): ParseResult<ShadowDescriptor> {
	if (!isRecord(value)) {
		return parseFailure("Unit Shadow descriptor must be an object.");
	}
	const actualKeys = Object.keys(value).sort();
	if (
		actualKeys.length !== descriptorKeys.length ||
		actualKeys.some((key, index) => key !== descriptorKeys[index])
	) {
		return parseFailure(
			"Unit Shadow descriptor must contain exactly language, canonicalForm, family, and kind.",
		);
	}
	const { language, family, kind } = value;
	if (typeof language !== "string" || language.length === 0) {
		return parseFailure(
			"Unit Shadow language must be a non-empty exact string.",
		);
	}
	if (language !== "de" && language !== "en" && language !== "he") {
		return parseFailure(`Unsupported Unit Shadow language: ${language}`);
	}
	const canonicalForm = parseNormalizedString(
		value.canonicalForm,
		"Unit Shadow canonicalForm",
	);
	if (!canonicalForm.ok) return canonicalForm;
	if (typeof family !== "string") {
		return parseFailure("Unit Shadow family must be a string.");
	}
	if (typeof kind !== "string") {
		return parseFailure("Unit Shadow kind must be a string.");
	}
	const candidate: ShadowDescriptorCandidate = {
		language,
		canonicalForm: canonicalForm.value,
		family,
		kind,
	};
	return isShadowDescriptor(candidate)
		? parsed(candidate)
		: parseFailure(
				`${language}/${family}/${kind} is not a supported Dumling Lemma route.`,
			);
}

export function normalizeShadowDescriptor(value: unknown): ShadowDescriptor {
	return unwrap(parseShadowDescriptor(value));
}

function shadowKeyOf(descriptor: ShadowDescriptor): string {
	return JSON.stringify([
		descriptor.language,
		foldedCanonicalForm(descriptor),
		descriptor.family,
		descriptor.kind,
	]);
}

/**
 * The Shadow row key: the descriptor with its Canonical Form case-folded, so
 * `LOL` and `lol` intern one Shadow, as they name one Lemma (system ADR 0002).
 */
export function shadowKeyFor(value: unknown): string {
	return shadowKeyOf(normalizeShadowDescriptor(value));
}

export function parseStoredShadowDescriptor(
	value: unknown,
): ParseResult<ShadowDescriptor> {
	if (!isRecord(value))
		return parseFailure("Stored Shadow must be an object.");
	return parseShadowDescriptor({
		language: value.language,
		canonicalForm: value.canonicalForm,
		family: value.family,
		kind: value.kind,
	});
}

export function descriptorFromStoredShadow(value: unknown): ShadowDescriptor {
	return unwrap(parseStoredShadowDescriptor(value));
}

/** False for a malformed input; the comparison itself runs unguarded. */
export function shadowIsCompatible(
	shadowValue: unknown,
	descriptorValue: unknown,
): boolean {
	if (!isRecord(shadowValue)) return false;
	const descriptor = parseShadowDescriptor(descriptorValue);
	if (!descriptor.ok) return false;
	const { value } = descriptor;
	return (
		shadowValue.shadowKey === shadowKeyOf(value) &&
		shadowValue.language === value.language &&
		typeof shadowValue.canonicalForm === "string" &&
		foldedCanonicalForm({
			language: value.language,
			canonicalForm: shadowValue.canonicalForm,
		}) === foldedCanonicalForm(value) &&
		shadowValue.family === value.family &&
		shadowValue.kind === value.kind
	);
}

export function structuralShadowLocatorKey(
	ownerReadingKey: string,
	aspect: StructuralShadowReference["aspect"],
	path: string,
): string {
	return JSON.stringify([ownerReadingKey, aspect, path]);
}

/**
 * The Unit Shadow a stored link target names (ADR 0050): a Shadow target as
 * it is, or a Lemma target's route and Canonical Form. The Lemma, not its
 * Shadow, stays the link's identity; the Shadow only lets the Shadow Note
 * list the link while no Lemma with that identity is stored.
 */
function parseLinkTargetDescriptor(
	value: unknown,
	context: string,
): ParseResult<ShadowDescriptor> {
	if (!isRecord(value)) return parseFailure(`${context} must be an object.`);
	if (value.unitKind === undefined) return parseShadowDescriptor(value);
	if (value.unitKind !== "Lemma") {
		return parseFailure(`${context} must be a Lemma or a Unit Shadow.`);
	}
	return parseShadowDescriptor({
		language: value.language,
		canonicalForm: value.canonicalForm,
		family: value.family,
		kind: value.kind,
	});
}

/** One reference per linked piece of a stored Breakdown, at `<part>.<index>`. */
function parseBreakdownReferences(
	breakdown: unknown,
): ParseResult<StructuralShadowReference[]> {
	if (breakdown === undefined) return parsed([]);
	if (!isRecord(breakdown)) {
		return parseFailure("Breakdown must be an object.");
	}
	const references: StructuralShadowReference[] = [];
	for (const part of ["constituents", "morphemes"] as const) {
		const pieces = breakdown[part];
		if (pieces === undefined) continue;
		if (!Array.isArray(pieces)) {
			return parseFailure(`Breakdown ${part} must be an array.`);
		}
		for (const [index, piece] of pieces.entries()) {
			if (!isRecord(piece)) {
				return parseFailure(
					`Breakdown piece ${part}.${index} must be an object.`,
				);
			}
			if (piece.target === undefined) continue;
			const descriptor = parseLinkTargetDescriptor(
				piece.target,
				`Breakdown target ${part}.${index}`,
			);
			if (!descriptor.ok) return descriptor;
			references.push({
				descriptor: descriptor.value,
				aspect: "breakdown",
				path: `${part}.${index}`,
			});
		}
	}
	return parsed(references);
}

/** Collects every structural occurrence without descriptor deduplication. */
export function parseStructuralShadowReferences(
	knowledgeValue: unknown,
): ParseResult<StructuralShadowReference[]> {
	if (knowledgeValue === undefined) return parsed([]);
	if (!isRecord(knowledgeValue)) {
		return parseFailure("Reading Knowledge must be an object.");
	}
	const breakdown = parseBreakdownReferences(knowledgeValue.breakdown);
	if (!breakdown.ok) return breakdown;
	const references = [...breakdown.value];
	const target = parseSourceTarget(knowledgeValue);
	if (!target.ok) return target;
	if (target.value !== undefined) {
		const descriptor = parseLinkTargetDescriptor(
			target.value,
			"Source target",
		);
		if (!descriptor.ok) return descriptor;
		references.push({
			descriptor: descriptor.value,
			aspect: "source",
			path: "target",
		});
	}
	if (references.length > MAX_STRUCTURAL_REFERENCES_PER_READING) {
		return parseFailure(
			`Reading Knowledge supports at most ${MAX_STRUCTURAL_REFERENCES_PER_READING} structural Shadow references.`,
		);
	}
	return parsed(references);
}

export function collectStructuralShadowReferences(
	knowledgeValue: unknown,
): StructuralShadowReference[] {
	return unwrap(parseStructuralShadowReferences(knowledgeValue));
}

async function internShadow(
	ctx: MutationCtx,
	value: unknown,
): Promise<Id<"shadows">> {
	const descriptor = normalizeShadowDescriptor(value);
	const shadowKey = shadowKeyFor(descriptor);
	const existing = await ctx.db
		.query("shadows")
		.withIndex("by_shadow_key", (q) => q.eq("shadowKey", shadowKey))
		.unique();
	if (existing) {
		if (!shadowIsCompatible(existing, descriptor)) {
			throw new Error(
				"Shadow fingerprint collides with another descriptor.",
			);
		}
		return existing._id;
	}
	return ctx.db.insert("shadows", { shadowKey, ...descriptor });
}

export function parsePendingShadowDescriptor(
	recordValue: unknown,
): ParseResult<ShadowDescriptor> {
	if (!isRecord(recordValue)) {
		return parseFailure(
			"Pending Semantic Relation record must be an object.",
		);
	}
	if (!isRecord(recordValue.pending)) {
		return parseFailure(
			"Pending Semantic Relation value must be an object.",
		);
	}
	return parseShadowDescriptor(recordValue.pending.target);
}

/**
 * Whether a stored Pending Semantic Relation record resolves to a Lemma. A
 * resolved record keeps its Shadow beside the direct claim it stands for
 * (system ADR 0011), so it is no pending relation and no Shadow Note
 * reference.
 */
export function isResolvedPendingRecord(recordValue: unknown): boolean {
	return isRecord(recordValue) && recordValue.resolvedLemma !== undefined;
}

export function pendingShadowDescriptor(
	recordValue: unknown,
): ShadowDescriptor {
	return unwrap(parsePendingShadowDescriptor(recordValue));
}

export async function attachPendingShadowReference(
	ctx: MutationCtx,
	recordValue: unknown,
): Promise<Id<"shadows">> {
	return internShadow(ctx, pendingShadowDescriptor(recordValue));
}

async function syncStructuralShadowReferences(
	ctx: MutationCtx,
	ownerReadingKey: string,
	knowledgeValue: unknown,
): Promise<void> {
	const desired = collectStructuralShadowReferences(knowledgeValue);
	const existing = await ctx.db
		.query("structuralShadowReferences")
		.withIndex("by_owner_reading_key", (q) =>
			q.eq("ownerReadingKey", ownerReadingKey),
		)
		.take(MAX_STRUCTURAL_REFERENCES_PER_READING + 1);
	if (existing.length > MAX_STRUCTURAL_REFERENCES_PER_READING) {
		throw new Error(
			`Stored Reading exceeds ${MAX_STRUCTURAL_REFERENCES_PER_READING} structural Shadow references.`,
		);
	}

	const existingByLocator = new Map<string, (typeof existing)[number]>();
	const duplicateIds: Id<"structuralShadowReferences">[] = [];
	for (const reference of existing) {
		const duplicate = existingByLocator.get(reference.locatorKey);
		if (duplicate) {
			duplicateIds.push(reference._id);
			continue;
		}
		existingByLocator.set(reference.locatorKey, reference);
	}
	await Promise.all(duplicateIds.map((id) => ctx.db.delete(id)));

	async function syncDesiredReference(index: number): Promise<void> {
		const reference = desired[index];
		if (!reference) return;
		const locatorKey = structuralShadowLocatorKey(
			ownerReadingKey,
			reference.aspect,
			reference.path,
		);
		const shadowId = await internShadow(ctx, reference.descriptor);
		const stored = existingByLocator.get(locatorKey);
		if (stored) {
			existingByLocator.delete(locatorKey);
			if (stored.shadowId !== shadowId) {
				await ctx.db.patch(stored._id, { shadowId });
			}
			return syncDesiredReference(index + 1);
		}
		await ctx.db.insert("structuralShadowReferences", {
			shadowId,
			ownerReadingKey,
			aspect: reference.aspect,
			path: reference.path,
			locatorKey,
		});
		return syncDesiredReference(index + 1);
	}
	await syncDesiredReference(0);

	await Promise.all(
		[...existingByLocator.values()].map((obsolete) =>
			ctx.db.delete(obsolete._id),
		),
	);
}

/**
 * The target a stored Source names (ADR 0050), if any: a Lemma or a Unit
 * Shadow, as stored.
 */
function parseSourceTarget(
	knowledge: unknown,
): ParseResult<Record<string, unknown> | undefined> {
	const source = isRecord(knowledge) ? knowledge.source : undefined;
	if (source === undefined) return parsed(undefined);
	if (!isRecord(source)) return parseFailure("Source must be an object.");
	if (!isRecord(source.target)) {
		return parseFailure("Source target must be an object.");
	}
	return parsed(source.target);
}

/**
 * The Lemma key of a stored Source whose target is a Lemma, so the Lemma
 * finds the Readings built on it. A pending Shadow target has none.
 */
function sourceLemmaKeyOf(knowledge: unknown): string | undefined {
	const target = unwrap(parseSourceTarget(knowledge));
	return target && target.unitKind === "Lemma"
		? lemmaIdentityKey(target as Dumling.Lemma)
		: undefined;
}

/**
 * The sole accumulated-Knowledge replacement seam. Reading writes and their
 * structural Shadow projection are committed in the same Convex transaction.
 */
export async function replaceAccumulatedKnowledge(
	ctx: MutationCtx,
	ownerReadingKey: string,
	knowledge: unknown,
	options: { readonly status?: "Partial" | "Full" } = {},
): Promise<Id<"accumulatedKnowledge"> | null> {
	const existing = await ctx.db
		.query("accumulatedKnowledge")
		.withIndex("by_owner_reading_key", (q) =>
			q.eq("ownerReadingKey", ownerReadingKey),
		)
		.unique();
	const status = options.status ?? existing?.status ?? "Partial";
	if (knowledge === undefined && !existing) return null;
	const content = knowledge ?? {};
	await syncStructuralShadowReferences(ctx, ownerReadingKey, content);
	await syncDefinitionText(ctx, ownerReadingKey, content);
	const sourceLemmaKey = sourceLemmaKeyOf(content);
	if (existing) {
		// Coverage evidence outlives the content it was recorded beside.
		await ctx.db.patch(existing._id, {
			knowledge: content,
			status,
			sourceLemmaKey,
			updatedAt: Date.now(),
		});
		return existing._id;
	}
	return ctx.db.insert("accumulatedKnowledge", {
		ownerReadingKey,
		knowledge: content,
		status,
		...(sourceLemmaKey ? { sourceLemmaKey } : {}),
		updatedAt: Date.now(),
	});
}

/** Create a status row for Knowledge stored outside the base-Knowledge column. */
export async function ensureAccumulatedKnowledgeStatus(
	ctx: MutationCtx,
	ownerReadingKey: string,
	requestedStatus: "Partial" | "Full" = "Partial",
): Promise<Id<"accumulatedKnowledge">> {
	const existing = await ctx.db
		.query("accumulatedKnowledge")
		.withIndex("by_owner_reading_key", (q) =>
			q.eq("ownerReadingKey", ownerReadingKey),
		)
		.unique();
	if (existing) {
		if (existing.status !== "Full" && requestedStatus === "Full") {
			await ctx.db.patch(existing._id, {
				status: "Full",
				updatedAt: Date.now(),
			});
		}
		return existing._id;
	}
	return ctx.db.insert("accumulatedKnowledge", {
		ownerReadingKey,
		knowledge: {},
		status: requestedStatus,
		updatedAt: Date.now(),
	});
}
