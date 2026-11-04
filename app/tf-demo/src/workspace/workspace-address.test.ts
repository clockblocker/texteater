import { describe, expect, test } from "bun:test";
import {
	type PaneNode,
	panesOf,
	planNavigation,
	type WorkspaceState,
	workspaceReducer,
} from "compass";
import { initialWorkspace } from "./application-menu";
import { addressOf, sheetIdsOf, targetOf } from "./workspace-address";
import {
	type WorkspaceSubject,
	workspaceSubjectKey,
} from "./workspace-subject";

type State = WorkspaceState<WorkspaceSubject>;

function onlyPane(state: State): PaneNode<WorkspaceSubject> {
	const pane = panesOf(state.layout)[0];
	if (!pane) throw new Error("no Pane");
	return pane;
}

/** The fresh workspace taken to `pathname`, as a load in a fresh context does. */
function opened(pathname: string): State {
	const start = initialWorkspace();
	const target = targetOf(pathname);
	if (!target) throw new Error(`${pathname} is no Address`);
	const commands = planNavigation(
		start,
		start.activePaneId,
		target,
		(presentation, sheet) =>
			workspaceSubjectKey(presentation.subject) ===
			workspaceSubjectKey(sheet.subject),
	);
	return commands.reduce(workspaceReducer<WorkspaceSubject>, start);
}

describe("the Address", () => {
	test.each([
		"/menu",
		"/library",
		"/settings",
		"/scroll/s1",
		"/section/a/section/b/scroll/s1",
		"/section/a",
		"/section/a/reading/r1",
		"/scroll/s1/lemma/l1/surface/de/geh%C3%B6rt/attestation/a1",
		"/scroll/s1/shadow/sh1/source/s2/a2/step/req-1/reading",
		"/menu/lemma/l1",
		"/library/step/req-1/attestation",
		"/section/a/codex/b/source/s3",
	])(
		"%s opens a fresh workspace at the Sheet Stack it spells",
		(pathname) => {
			expect(addressOf(onlyPane(opened(pathname)))).toBe(pathname);
		},
	);

	test("the Menu and the Library are implied below the Library's selections", () => {
		const pane = onlyPane(opened("/section/a/scroll/s1"));
		expect(
			pane.line.map((rung) =>
				rung.kind === "Sheet"
					? workspaceSubjectKey(rung.presentation.subject)
					: rung.kind,
			),
		).toEqual(["Menu", "MenuItem", "Section:a", "Scroll:s1"]);
	});

	test("a Surface's form is one segment, whatever it holds", () => {
		const pane = onlyPane(opened("/menu/surface/de/a%2Fb%20c"));
		expect(pane.covers[0]?.presentation.subject.target).toEqual({
			kind: "Surface",
			language: "de",
			normalizedSurface: "a/b c",
		});
	});

	test("Go to source keeps its occurrence; titles and presentation context are never spelled", () => {
		const start = opened("/scroll/s1");
		const paneId = start.activePaneId;
		const state = [
			{
				kind: "Scroll",
				target: {
					kind: "Scroll",
					scrollId: "s2",
					focusAttestationId: "a2",
					title: "Die Banken",
				},
			},
			{
				kind: "Note",
				target: { kind: "Lemma", lemmaId: "l1" },
				presentationContext: { activeReadingId: "r1" },
			},
		]
			.map(
				(subject) =>
					({
						type: "FollowLink",
						paneId,
						subject: subject as WorkspaceSubject,
					}) as const,
			)
			.reduce(workspaceReducer<WorkspaceSubject>, start);
		expect(addressOf(onlyPane(state))).toBe(
			"/scroll/s1/source/s2/a2/lemma/l1",
		);
		const read = targetOf("/scroll/s1/source/s2/a2/lemma/l1");
		expect(read?.covers.map((cover) => cover.subject) as unknown).toEqual([
			{
				kind: "Scroll",
				target: {
					kind: "Scroll",
					scrollId: "s2",
					focusAttestationId: "a2",
				},
			},
			{ kind: "Note", target: { kind: "Lemma", lemmaId: "l1" } },
		]);
	});

	test("a depth spells only the bottom Sheets, for the history beneath the top", () => {
		const pane = onlyPane(opened("/section/a/scroll/s1/lemma/l1"));
		expect([1, 2, 3, 4, 5].map((depth) => addressOf(pane, depth))).toEqual([
			"/menu",
			"/library",
			"/section/a",
			"/section/a/scroll/s1",
			"/section/a/scroll/s1/lemma/l1",
		]);
	});

	test("a Sheet is its Presentation in the history, and the Menu's rungs are themselves", () => {
		const pane = onlyPane(opened("/scroll/s1/lemma/l1"));
		const ids = sheetIdsOf(pane);
		expect(ids.slice(0, 2)).toEqual(["menu", "library"]);
		expect(ids[2]).toBe(
			pane.line[2]?.kind === "Sheet" ? pane.line[2].presentation.id : "",
		);
		expect(ids[3]).toBe(pane.covers[0]?.presentation.id);
	});

	test.each([
		"/",
		"",
		"/playground",
		"/menu/section/a",
		"/settings/scroll/s1",
		"/scroll/s1/scroll/s2",
		"/scroll",
		"/scroll/s1/lemma",
		"/scroll/s1/surface/en/word",
		"/scroll/s1/step/req-1/lemma",
		"/scroll/s1/%E0%A4%A",
	])("%s is no Address", (pathname) => {
		expect(targetOf(pathname)).toBeNull();
	});
});
