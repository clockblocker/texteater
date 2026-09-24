import { afterAll, describe, expect, it } from "bun:test";
import type { FunctionReference, FunctionReturnType } from "convex/server";
import { closeTestingSessions, inferredType } from "prinfer/testing";

import type { api } from "../../convex/_generated/api";

afterAll(closeTestingSessions);

type Returned<Query extends FunctionReference<"query">> = NonNullable<
	FunctionReturnType<Query>
>;
type IsString<T> = string extends T ? true : false;

type ResolutionNote = Returned<typeof api.resolutionSessions.getResolutionNote>;
export type ResolutionNoteLifecycle = ResolutionNote extends {
	lifecycle: infer Lifecycle;
}
	? Lifecycle
	: "No lifecycle";
export type VerbResolutionGrammar = Extract<
	NonNullable<ResolutionNote["grammar"]>,
	{ kind: "VERB" }
>;
export type VerbResolutionReading = Extract<
	NonNullable<ResolutionNote["reading"]>,
	{ kind: "VERB" }
>;

type ShadowNote = Extract<
	Returned<typeof api.shadowNotes.get>,
	{ kind: "Shadow" }
>;
type ShadowCandidate = ShadowNote["inspection"]["candidates"][number];
export type ShadowPendingRelation =
	ShadowNote["references"]["page"][number]["pendingRelations"][number];
export type ShadowCandidateFamily = ShadowCandidate["family"];
export type ShadowCandidateKindIsString = IsString<ShadowCandidate["kind"]>;

type ReadingNote = Extract<
	Returned<typeof api.readingNotes.get>,
	{ kind: "Reading" }
>;
export type ReadingNoteKnowledge = ReadingNote["knowledge"];

type LemmaRouteNote = Extract<
	Returned<typeof api.routeNotes.get>,
	{ kind: "Lemma" }
>;
export type PresentedLemmaFamily = LemmaRouteNote["presented"]["family"];
export type PresentedLemmaKindIsString = IsString<
	LemmaRouteNote["presented"]["kind"]
>;
export type ConnectedSurfaceKindIsString = IsString<
	LemmaRouteNote["connections"]["surfaces"][number]["kind"]
>;

const full = { full: true, backend: "typescript7" } as const;
const inferred = (name: string) =>
	inferredType(import.meta.url, { name, ...full });

describe("Convex API types the client reads", () => {
	it("a Resolution Note carries its lifecycle as one tagged union", async () => {
		expect(await inferred("ResolutionNoteLifecycle")).toMatchInlineSnapshot(
			`"type ResolutionNoteLifecycle = { activity: "Running" | "Scheduled"; progress: "Committing" | "GrammarAvailable" | "ReadingAvailable" | "RouteAvailable" | "Starting"; state: "Active"; } | { attestationId: Id<"attestations">; canonical?: { attestationId: Id<"attestations">; lemmaId: Id<"lemmas">; normalizedSurface: string; readingId: Id<"readings">; surfaceId: Id<"surfaces">; surfaceLanguage: "de"; } | undefined; outcome: "Complete"; progress: "Committing"; state: "Terminal"; target: { kind: "Reading"; readingId: Id<"readings">; } | { attestationId: Id<"attestations">; kind: "Attestation"; }; } | { outcome: "Unresolved"; progress: "Committing" | "GrammarAvailable" | "ReadingAvailable" | "RouteAvailable" | "Starting"; state: "Terminal"; } | { diagnosticId: string; failureCode: "BudgetExhausted" | "CatalogMiss" | "DictionaryConflict" | "Internal" | "InvalidOutput" | "MembershipConflict" | "Network" | "ProviderUnavailable" | "RateLimited" | "Refusal" | "RequestRejected"; message: string; outcome: "PermanentFailure"; progress: "Committing" | "GrammarAvailable" | "ReadingAvailable" | "RouteAvailable" | "Starting"; state: "Terminal"; }"`,
		);
	}, 30_000);

	it("a Resolution Note projects its Lemma per Kind, without any", async () => {
		expect(await inferred("VerbResolutionGrammar")).toMatchInlineSnapshot(
			`"type VerbResolutionGrammar = { grundform: boolean | null; members: { attested: string; orthography: "Standard" | "Typo"; }[]; realizationCoverage: "Full" | "Partial"; normalizedSurface: string; spelling: "Canonical" | "Variant"; canonicalForm: string; family: "Lexeme"; kind: "VERB"; coreFeatures: { hasSepPrefix: string | null; lexicallyReflexive: "Yes" | null; verbType: "Mod" | null; }; }"`,
		);
		expect(await inferred("VerbResolutionReading")).toMatchInlineSnapshot(
			`"type VerbResolutionReading = { emojiDescription: string; canonicalForm: string; family: "Lexeme"; kind: "VERB"; }"`,
		);
	}, 30_000);

	it("a Shadow Note names its relations and types its candidates", async () => {
		expect(await inferred("ShadowPendingRelation")).toMatchInlineSnapshot(
			`"type ShadowPendingRelation = { locatorKey: string; relation: SemanticRelation; }"`,
		);
		expect(await inferred("ShadowCandidateFamily")).toMatchInlineSnapshot(
			`"type ShadowCandidateFamily = "Lexeme" | "Morpheme" | "Phraseme""`,
		);
		expect(
			await inferred("ShadowCandidateKindIsString"),
		).toMatchInlineSnapshot(`"type ShadowCandidateKindIsString = false"`);
	}, 30_000);

	it("a Reading Note names its Reading Knowledge", async () => {
		expect(await inferred("ReadingNoteKnowledge")).toMatchInlineSnapshot(
			`"type ReadingNoteKnowledge = Omit<ReadingKnowledge, "semanticRelations"> & { semanticRelations?: PresentedRelations | undefined; }"`,
		);
	}, 30_000);

	it("a Lemma route note presents its Family and Kind as Dumling values", async () => {
		expect(await inferred("PresentedLemmaFamily")).toMatchInlineSnapshot(
			`"type PresentedLemmaFamily = "Lexeme" | "Morpheme" | "Phraseme""`,
		);
		expect(
			await inferred("PresentedLemmaKindIsString"),
		).toMatchInlineSnapshot(`"type PresentedLemmaKindIsString = false"`);
		expect(
			await inferred("ConnectedSurfaceKindIsString"),
		).toMatchInlineSnapshot(`"type ConnectedSurfaceKindIsString = false"`);
	}, 30_000);
});
