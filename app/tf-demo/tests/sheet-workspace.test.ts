import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import {
	createSheetWorkspaceFixture,
	FIXTURE_TEXT_SUBJECT,
	renderFixtureSubject,
	SHEET_WORKSPACE_PATH,
} from "../src/playground/sheet-workspace/sheet-workspace-fixtures";
import {
	dismissCardLayer,
	reconcileCardLayers,
	removeLayerCard,
	replaceCardLayer,
} from "../src/workspace/card-layers";
import type { CardSheetWorkspaceProps } from "../src/workspace/card-sheet-workspace";
import {
	assertValidSheetWorkspace,
	type SheetWorkspace,
	transitionSheetWorkspace,
} from "../src/workspace/sheet-workspace";

const reading = {
	kind: "Note" as const,
	noteId: "workspace-note:reading:1:6",
};
const lemma = {
	kind: "Note" as const,
	noteId: "workspace-note:lemma:1:6",
};
const surface = {
	kind: "Note" as const,
	noteId: "workspace-note:surface:1:6",
};
const attestation = {
	kind: "Note" as const,
	noteId: "workspace-note:attestation:1:6",
};

function transition(
	workspace: SheetWorkspace,
	command: Parameters<typeof transitionSheetWorkspace>[1],
) {
	return transitionSheetWorkspace(workspace, command).workspace;
}

function pane(workspace: SheetWorkspace, paneId: string) {
	const result = workspace.panes.find((candidate) => candidate.id === paneId);
	if (!result) throw new Error(`Missing Pane ${paneId}.`);
	return result;
}

describe("Sheet workspace algebra", () => {
	test("starts with two independent Text Sheets and an empty destination", () => {
		const workspace = createSheetWorkspaceFixture();
		expect(pane(workspace, "west").sheets[0]?.subject).toEqual(
			FIXTURE_TEXT_SUBJECT,
		);
		expect(pane(workspace, "central").sheets[0]?.subject).toEqual(
			FIXTURE_TEXT_SUBJECT,
		);
		expect(pane(workspace, "east").sheets).toEqual([]);
		assertValidSheetWorkspace(workspace);
	});

	test("opens a Card as a new Sheet and locks only the first placement", () => {
		let workspace = createSheetWorkspaceFixture();
		workspace = transition(workspace, {
			type: "OpenSheet",
			sheet: { instanceId: "reading-sheet", subject: reading },
			origin: { kind: "Placement", paneId: "east" },
		});
		workspace = transition(workspace, {
			type: "OpenSheet",
			sheet: { instanceId: "lemma-sheet", subject: lemma },
			origin: { kind: "Placement", paneId: "east" },
		});
		expect(
			pane(workspace, "east").sheets.map((sheet) => [
				sheet.instanceId,
				sheet.locked,
			]),
		).toEqual([
			["reading-sheet", true],
			["lemma-sheet", false],
		]);
	});

	test("moves only the top Sheet and lets the destination lock win", () => {
		let workspace = createSheetWorkspaceFixture();
		workspace = transition(workspace, {
			type: "OpenSheet",
			sheet: { instanceId: "note-sheet", subject: reading },
			origin: { kind: "Placement", paneId: "central" },
		});
		const rejected = transitionSheetWorkspace(workspace, {
			type: "MoveTopSheet",
			sourcePaneId: "central",
			destinationPaneId: "west",
			sheetId: "sheet-central-text",
		});
		expect(rejected.rejection).toBe("source-sheet-is-not-top");

		const moved = transition(workspace, {
			type: "MoveTopSheet",
			sourcePaneId: "central",
			destinationPaneId: "west",
			sheetId: "note-sheet",
		});
		expect(pane(moved, "central").sheets).toHaveLength(1);
		expect(pane(moved, "west").sheets.at(-1)).toMatchObject({
			instanceId: "note-sheet",
			locked: false,
		});
		expect(moved.activePaneId).toBe("west");
	});

	test("exposes clickable Lock transfer, Collapse, and Explicit Removal algebra", () => {
		let workspace = createSheetWorkspaceFixture();
		workspace = transition(workspace, {
			type: "OpenSheet",
			sheet: { instanceId: "note-sheet", subject: reading },
			origin: { kind: "Placement", paneId: "central" },
		});
		workspace = transition(workspace, {
			type: "SetSheetLock",
			sheetId: "note-sheet",
			locked: true,
		});
		expect(
			pane(workspace, "central").sheets.map((sheet) => sheet.locked),
		).toEqual([false, true]);
		expect(
			transitionSheetWorkspace(workspace, {
				type: "Collapse",
				paneId: "central",
				extent: "top",
			}).status,
		).toBe("unchanged");
		workspace = transition(workspace, {
			type: "RemoveSheet",
			sheetId: "note-sheet",
		});
		expect(pane(workspace, "central").sheets).toHaveLength(1);
		expect(pane(workspace, "central").sheets[0]?.locked).toBe(false);
	});
});

describe("Pane-local Card Layers", () => {
	const fourCards = [
		{ key: "reading", subject: reading },
		{ key: "lemma", subject: lemma },
		{ key: "surface", subject: surface },
		{ key: "attestation", subject: attestation },
	] as const;

	test("keeps fixed user-facing order and replaces only the same Pane", () => {
		let layers = replaceCardLayer([], {
			paneId: "central",
			originSheetId: "sheet-central-text",
			cards: fourCards,
		});
		expect(layers[0]?.cards.map((card) => card.key)).toEqual([
			"reading",
			"lemma",
			"surface",
			"attestation",
		]);
		layers = replaceCardLayer(layers, {
			paneId: "west",
			originSheetId: "sheet-west-text",
			cards: fourCards,
		});
		expect(layers.map((layer) => layer.paneId).sort()).toEqual([
			"central",
			"west",
		]);
		layers = replaceCardLayer(layers, {
			paneId: "central",
			originSheetId: "sheet-central-text",
			cards: [{ key: "reading-new", subject: reading }],
		});
		expect(
			layers.find((layer) => layer.paneId === "west")?.cards,
		).toHaveLength(4);
		expect(
			layers.find((layer) => layer.paneId === "central")?.cards[0]?.key,
		).toBe("reading-new");
	});

	test("removes one placed Card without reordering the remaining Cards", () => {
		const layers = replaceCardLayer([], {
			paneId: "central",
			originSheetId: "sheet-central-text",
			cards: fourCards,
		});
		const lemmaId = layers[0]?.cards[1]?.id;
		if (!lemmaId) throw new Error("Missing Lemma Card.");
		const remaining = removeLayerCard(layers, "central", lemmaId);
		expect(remaining[0]?.cards.map((card) => card.key)).toEqual([
			"reading",
			"surface",
			"attestation",
		]);
		const oneCard = replaceCardLayer([], {
			paneId: "central",
			originSheetId: "sheet-central-text",
			cards: [{ key: "reading", subject: reading }],
		});
		const finalCardId = oneCard[0]?.cards[0]?.id;
		if (!finalCardId) throw new Error("Missing final Card.");
		expect(removeLayerCard(oneCard, "central", finalCardId)).toEqual([]);
	});

	test("dismisses explicitly and when the originating Sheet is hidden", () => {
		const layers = replaceCardLayer([], {
			paneId: "central",
			originSheetId: "sheet-central-text",
			cards: fourCards,
		});
		expect(dismissCardLayer(layers, "central")).toEqual([]);
		const hidden = transition(createSheetWorkspaceFixture(), {
			type: "OpenSheet",
			sheet: { instanceId: "cover", subject: reading },
			origin: { kind: "Placement", paneId: "central" },
		});
		expect(reconcileCardLayers(layers, hidden)).toEqual([]);
	});

	test("preserves a layer when a Card moves to another Pane", () => {
		const workspace = transition(createSheetWorkspaceFixture(), {
			type: "OpenSheet",
			sheet: { instanceId: "placed-reading", subject: reading },
			origin: { kind: "Placement", paneId: "east" },
		});
		const layers = replaceCardLayer([], {
			paneId: "central",
			originSheetId: "sheet-central-text",
			cards: fourCards.slice(1),
		});
		expect(reconcileCardLayers(layers, workspace)).toEqual(layers);
	});
});

test("the reusable interface renders actual Text and Note modules with presentation only", () => {
	const presentations: string[] = [];
	const renderer: CardSheetWorkspaceProps["renderSubject"] = (
		subject,
		presentation,
	) => {
		presentations.push(presentation);
		return renderFixtureSubject(subject, presentation);
	};
	const markup = renderToStaticMarkup(
		createElement(MemoryRouter, {}, renderer(reading, "Sheet")),
	);
	expect(presentations).toEqual(["Sheet"]);
	expect(markup).toContain('aria-label="Reading note"');
	expect(markup).toContain("<span>🔒</span><span>schließen</span>");
	expect(markup).toContain("to close");
	expect(markup).not.toContain("sheet-workspace-fixture");
	expect(markup).not.toContain("workspaceWidth");
	expect(SHEET_WORKSPACE_PATH).toBe("/playground/sheet-workspace/dnd-kit");
});
