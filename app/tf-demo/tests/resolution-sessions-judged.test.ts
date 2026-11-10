import { afterEach, beforeEach, expect, jest, test } from "bun:test";
import { api, internal } from "../convex/_generated/api";
import { projectJudgedGrammar } from "../server/resolutionSessionProjection";
import { createTestConvex } from "./support/convex";
import { enableDeploymentFlags } from "./support/deploymentFlags";
import { startSession } from "./support/occurrences";
import {
	bankenSource,
	bankGrammar,
	grammarProjection,
	session,
} from "./support/resolution-sessions";

/*
 * What jev judged of a click is a step of its Resolution Session before
 * GrammarAvailable (#1329): stored while Grammar is not yet, read by the
 * Resolution Note, and never seen after Grammar.
 */

enableDeploymentFlags();

beforeEach(() => {
	// Sessions schedule their runs; each test drives the run itself.
	jest.useFakeTimers();
});

afterEach(() => {
	jest.useRealTimers();
});

const judged = {
	coreFeatures: { nounKind: "Common" },
	members: [{ orthography: "Typo" as const }],
};

test("a judged save shows on the Resolution Note until GrammarAvailable replaces it, and a late one is dropped", async () => {
	const t = createTestConvex();
	const { select, sentenceId } = await bankenSource(t);
	const guard = await startSession(t, select("request-1"));
	const note = () =>
		t.query(api.resolutionSessions.getResolutionNote, {
			requestId: "request-1",
		});
	// Before the run is claimed, Grammar's place is not yet open.
	expect(
		await t.mutation(internal.resolutionSessions.saveJudged, {
			guard,
			judged,
		}),
	).toBe(false);
	await t.mutation(internal.resolutionSessions.beginRun, { guard });
	expect(
		await t.mutation(internal.resolutionSessions.saveJudged, {
			guard: { ...guard, runToken: "stale" },
			judged,
		}),
	).toBe(false);
	expect(
		await t.mutation(internal.resolutionSessions.saveJudged, {
			guard,
			judged,
		}),
	).toBe(true);
	expect(await note()).toMatchObject({ judged });
	expect((await note())?.grammar).toBeUndefined();

	await t.mutation(internal.resolutionSessions.advance, {
		guard,
		progress: "GrammarAvailable",
		grammar: grammarProjection(),
		grammaticalCheckpoint: bankGrammar(sentenceId),
	});
	expect(
		await t.mutation(internal.resolutionSessions.saveJudged, {
			guard,
			judged,
		}),
	).toBe(false);
	const after = await note();
	expect(after?.grammar).toMatchObject({ canonicalForm: "Bank" });
	expect(after?.judged).toBeUndefined();
	expect((await session(t, "request-1")).judged).toBeUndefined();
});

test("the judged projection keeps what the Card reads, without a gender Luna's article may still change", () => {
	const base = {
		route: {
			language: "de" as const,
			family: "Lexeme" as const,
			kind: "NOUN" as const,
		},
		surfaceFeatures: null,
		spelling: { kind: "Canonical" as const },
		members: [
			{ segment: 0, orthography: "Standard" as const },
			{ segment: 2, orthography: "Shorthand" as const },
		],
		realizationCoverage: "Full" as const,
	};
	expect(
		projectJudgedGrammar({
			...base,
			coreFeatures: { gender: "Masc", nounKind: "Common" },
			pending: ["gender", "case"],
		}),
	).toEqual({
		coreFeatures: { nounKind: "Common" },
		members: [{ orthography: "Standard" }, { orthography: "Shorthand" }],
	});
	expect(
		projectJudgedGrammar({
			...base,
			coreFeatures: { gender: "Masc", nounKind: "Proper" },
			pending: [],
		}).coreFeatures,
	).toEqual({ gender: "Masc", nounKind: "Proper" });
});
