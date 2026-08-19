import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

const MAX_STRUCTURAL_REFERENCES_PER_READING = 200;
const descriptorKeys = ["canonicalForm", "family", "kind", "language"];
const lexemeKinds = new Set([
	"ADJ",
	"ADP",
	"ADV",
	"AUX",
	"CCONJ",
	"DET",
	"INTJ",
	"NOUN",
	"NUM",
	"PART",
	"PRON",
	"PROPN",
	"PUNCT",
	"SCONJ",
	"SYM",
	"VERB",
	"X",
]);
const morphemeKinds = new Set([
	"Circumfix",
	"Clitic",
	"Duplifix",
	"Infix",
	"Interfix",
	"Prefix",
	"Root",
	"Suffix",
	"Suffixoid",
	"ToneMarking",
	"Transfix",
]);
const commonPhrasemeKinds = new Set([
	"Aphorism",
	"DiscourseFormula",
	"Idiom",
	"Proverb",
]);

type ServerCtx = MutationCtx | QueryCtx;
type UnknownRecord = Record<string, unknown>;

export type ShadowDescriptor = {
	readonly language: "de" | "he";
	readonly canonicalForm: string;
	readonly family: string;
	readonly kind: string;
};

export type StructuralShadowReference = {
	readonly descriptor: ShadowDescriptor;
	readonly aspect: "morphologicalTree" | "lexicalBreakdown";
	readonly path: string;
};

function requireRecord(value: unknown, context: string): UnknownRecord {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(`${context} must be an object.`);
	}
	return value as UnknownRecord;
}

function normalizedString(value: unknown, context: string): string {
	if (typeof value !== "string") {
		throw new Error(`${context} must be a string.`);
	}
	const normalized = value.trim().normalize("NFC");
	if (normalized.length === 0) {
		throw new Error(`${context} must not be empty.`);
	}
	return normalized;
}

function exactNonEmptyString(value: unknown, context: string): string {
	if (typeof value !== "string" || value.length === 0) {
		throw new Error(`${context} must be a non-empty exact string.`);
	}
	return value;
}

/**
 * Compact storage-side normalization. The exhaustive Dumrel route validation
 * happens in the Node action adapter before a plan reaches Convex; this repeats
 * only the stable value normalization needed to protect legacy/backfill writes.
 */
export function normalizeShadowDescriptor(value: unknown): ShadowDescriptor {
	const descriptor = requireRecord(value, "Unit Shadow descriptor");
	const actualKeys = Object.keys(descriptor).sort();
	if (
		actualKeys.length !== descriptorKeys.length ||
		actualKeys.some((key, index) => key !== descriptorKeys[index])
	) {
		throw new Error(
			"Unit Shadow descriptor must contain exactly language, canonicalForm, family, and kind.",
		);
	}
	const language = exactNonEmptyString(
		descriptor.language,
		"Unit Shadow language",
	);
	if (language !== "de" && language !== "he") {
		throw new Error(`Unsupported Unit Shadow language: ${language}`);
	}
	const normalized: ShadowDescriptor = {
		language,
		canonicalForm: normalizedString(
			descriptor.canonicalForm,
			"Unit Shadow canonicalForm",
		),
		family: normalizedString(descriptor.family, "Unit Shadow family"),
		kind: normalizedString(descriptor.kind, "Unit Shadow kind"),
	};
	const validRoute =
		(normalized.family === "Lexeme" && lexemeKinds.has(normalized.kind)) ||
		(normalized.family === "Morpheme" &&
			morphemeKinds.has(normalized.kind)) ||
		(normalized.family === "Construction" &&
			normalized.kind === "Fusion") ||
		(normalized.family === "Phraseme" &&
			(commonPhrasemeKinds.has(normalized.kind) ||
				(normalized.language === "de" &&
					normalized.kind === "Collocation")));
	if (!validRoute) {
		throw new Error(
			`${normalized.language}/${normalized.family}/${normalized.kind} is not a supported Dumling Lemma route.`,
		);
	}
	return normalized;
}

export function shadowKeyFor(value: unknown): string {
	const descriptor = normalizeShadowDescriptor(value);
	return JSON.stringify([
		descriptor.language,
		descriptor.canonicalForm,
		descriptor.family,
		descriptor.kind,
	]);
}

export function descriptorFromStoredShadow(value: unknown): ShadowDescriptor {
	const shadow = requireRecord(value, "Stored Shadow");
	return normalizeShadowDescriptor({
		language: shadow.language,
		canonicalForm: shadow.canonicalForm,
		family: shadow.family,
		kind: shadow.kind,
	});
}

export function shadowIsCompatible(
	shadowValue: unknown,
	descriptorValue: unknown,
): boolean {
	try {
		const shadow = requireRecord(shadowValue, "Stored Shadow");
		const descriptor = normalizeShadowDescriptor(descriptorValue);
		return (
			shadow.shadowKey === shadowKeyFor(descriptor) &&
			shadow.language === descriptor.language &&
			shadow.canonicalForm === descriptor.canonicalForm &&
			shadow.family === descriptor.family &&
			shadow.kind === descriptor.kind
		);
	} catch {
		return false;
	}
}

export function structuralShadowLocatorKey(
	ownerReadingKey: string,
	aspect: StructuralShadowReference["aspect"],
	path: string,
): string {
	return JSON.stringify([ownerReadingKey, aspect, path]);
}

function visitMorphologicalNode(
	value: unknown,
	path: string,
	references: StructuralShadowReference[],
): void {
	const node = requireRecord(value, `Morphological Tree node at ${path}`);
	if (node.nodeKind === "morphemeReading") return;
	if (node.nodeKind === "unitShadow") {
		const descriptor = normalizeShadowDescriptor(node.unitShadow);
		if (
			descriptor.family !== "Lexeme" &&
			descriptor.family !== "Phraseme"
		) {
			throw new Error(
				`Morphological Tree Unit Shadow at ${path} must be lexical.`,
			);
		}
		references.push({
			descriptor,
			aspect: "morphologicalTree",
			path,
		});
		return;
	}
	if (node.nodeKind !== "structure" || !Array.isArray(node.children)) {
		throw new Error(`Unsupported Morphological Tree node at ${path}.`);
	}
	for (const [index, child] of node.children.entries()) {
		visitMorphologicalNode(child, `${path}.children[${index}]`, references);
	}
}

/** Collects every structural occurrence without descriptor deduplication. */
export function collectStructuralShadowReferences(
	knowledgeValue: unknown,
): StructuralShadowReference[] {
	if (knowledgeValue === undefined) return [];
	const knowledge = requireRecord(knowledgeValue, "Reading Knowledge");
	const references: StructuralShadowReference[] = [];
	if (knowledge.morphologicalTree !== undefined) {
		const tree = requireRecord(
			knowledge.morphologicalTree,
			"Morphological Tree",
		);
		visitMorphologicalNode(tree.root, "root", references);
	}
	if (knowledge.lexicalBreakdown !== undefined) {
		if (!Array.isArray(knowledge.lexicalBreakdown)) {
			throw new Error("Lexical Breakdown must be an array.");
		}
		for (const [
			index,
			descriptor,
		] of knowledge.lexicalBreakdown.entries()) {
			const normalized = normalizeShadowDescriptor(descriptor);
			if (normalized.family !== "Lexeme") {
				throw new Error(
					`Lexical Breakdown Unit Shadow at [${index}] must be a Lexeme.`,
				);
			}
			references.push({
				descriptor: normalized,
				aspect: "lexicalBreakdown",
				path: `[${index}]`,
			});
		}
	}
	if (references.length > MAX_STRUCTURAL_REFERENCES_PER_READING) {
		throw new Error(
			`Reading Knowledge supports at most ${MAX_STRUCTURAL_REFERENCES_PER_READING} structural Shadow references.`,
		);
	}
	return references;
}

export async function internShadow(
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

export function pendingShadowDescriptor(
	recordValue: unknown,
): ShadowDescriptor {
	const record = requireRecord(
		recordValue,
		"Pending Semantic Relation record",
	);
	const pending = requireRecord(
		record.pending,
		"Pending Semantic Relation value",
	);
	return normalizeShadowDescriptor(pending.target);
}

export async function attachPendingShadowReference(
	ctx: MutationCtx,
	recordValue: unknown,
): Promise<Id<"shadows">> {
	return internShadow(ctx, pendingShadowDescriptor(recordValue));
}

export async function shadowMatchesDescriptor(
	ctx: ServerCtx,
	shadowId: Id<"shadows">,
	descriptorValue: unknown,
): Promise<boolean> {
	const [shadow, descriptor] = await Promise.all([
		ctx.db.get(shadowId),
		Promise.resolve(normalizeShadowDescriptor(descriptorValue)),
	]);
	return Boolean(shadow && shadowIsCompatible(shadow, descriptor));
}

export async function syncStructuralShadowReferences(
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
	for (const reference of existing) {
		const duplicate = existingByLocator.get(reference.locatorKey);
		if (duplicate) {
			await ctx.db.delete(reference._id);
			continue;
		}
		existingByLocator.set(reference.locatorKey, reference);
	}

	for (const reference of desired) {
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
			continue;
		}
		await ctx.db.insert("structuralShadowReferences", {
			shadowId,
			ownerReadingKey,
			aspect: reference.aspect,
			path: reference.path,
			locatorKey,
		});
	}

	for (const obsolete of existingByLocator.values()) {
		await ctx.db.delete(obsolete._id);
	}
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
	const requestedStatus = options.status ?? "Partial";
	const status: "Partial" | "Full" =
		existing?.status === "Full" || requestedStatus === "Full"
			? "Full"
			: "Partial";
	if (knowledge === undefined) {
		if (!existing) return null;
		await syncStructuralShadowReferences(ctx, ownerReadingKey, {});
		await ctx.db.replace(existing._id, {
			ownerReadingKey,
			knowledge: {},
			status,
			updatedAt: Date.now(),
		});
		return existing._id;
	}
	await syncStructuralShadowReferences(ctx, ownerReadingKey, knowledge);
	const value = { ownerReadingKey, knowledge, status, updatedAt: Date.now() };
	if (existing) {
		await ctx.db.replace(existing._id, value);
		return existing._id;
	}
	return ctx.db.insert("accumulatedKnowledge", value);
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

/** Destructive reset-only seam; ordinary Knowledge writes are monotonic. */
export async function deleteAccumulatedKnowledge(
	ctx: MutationCtx,
	ownerReadingKey: string,
): Promise<boolean> {
	await syncStructuralShadowReferences(ctx, ownerReadingKey, {});
	const existing = await ctx.db
		.query("accumulatedKnowledge")
		.withIndex("by_owner_reading_key", (q) =>
			q.eq("ownerReadingKey", ownerReadingKey),
		)
		.unique();
	if (!existing) return false;
	await ctx.db.delete(existing._id);
	return true;
}
