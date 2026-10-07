import { describe, expect, test } from "bun:test";
import {
	createWorkspace,
	findPane,
	groundOf,
	type WorkspaceCommand,
	type WorkspaceState,
	workspaceReducer,
} from "compass";
import type { Id } from "../convex/_generated/dataModel";
import {
	type ApplicationWorkspaceStorage,
	loadApplicationWorkspace,
	saveApplicationWorkspace,
} from "../src/workspace/application-workspace-persistence";
import type { WorkspaceSubject } from "../src/workspace/workspace-subject";

const MENU_ITEMS = new Set(["library", "settings"]);
const KEY = "tf-demo.workspace.compass.v1";

const text: WorkspaceSubject = {
	kind: "Text",
	target: { kind: "Text", textId: "text-1", title: "Die Banken" },
};
const reading = (requestId: string): WorkspaceSubject => ({
	kind: "Note",
	target: { kind: "Reading", readingId: "reading-1" },
	presentationContext: { resolutionRequestId: requestId },
});
const lemma: WorkspaceSubject = {
	kind: "Note",
	target: { kind: "Lemma", lemmaId: "lemma-1" as Id<"lemmas"> },
};

function memoryStorage(entries: Record<string, string> = {}) {
	const items = new Map(Object.entries(entries));
	return {
		items,
		getItem: (key: string) => items.get(key) ?? null,
		setItem: (key: string, value: string) => {
			items.set(key, value);
		},
	} satisfies ApplicationWorkspaceStorage & { items: Map<string, string> };
}

function run(
	state: WorkspaceState<WorkspaceSubject>,
	...commands: WorkspaceCommand<WorkspaceSubject>[]
) {
	return commands.reduce(workspaceReducer, state);
}

/** A Text on the Ground of the first Pane with a two-Card Deck dealt on it. */
function dealtOnText() {
	const start = run(
		createWorkspace<WorkspaceSubject>(),
		{
			type: "StepUp",
			paneId: "pane-1",
			to: { kind: "MenuItem", item: "library" },
		},
		{
			type: "StepUp",
			paneId: "pane-1",
			to: { kind: "Sheet", subject: text },
		},
	);
	const pane = findPane(start.layout, "pane-1");
	if (!pane) throw new Error("no pane");
	return run(start, {
		type: "Deal",
		sheetId: groundOf(pane).id,
		selection: "sentence-1:2",
		cards: [
			{ key: "r:Reading", subject: reading("r") },
			{ key: "r:Lemma", subject: lemma },
		],
	});
}

const fresh = () => createWorkspace<WorkspaceSubject>();

describe("Workspace Persistence", () => {
	test("a Deck, its Cards' keys and the id counter survive a reload", () => {
		const state = dealtOnText();
		const storage = memoryStorage();
		saveApplicationWorkspace(state, storage);
		const loaded = loadApplicationWorkspace(fresh, MENU_ITEMS, storage);
		expect(loaded).toEqual({ ...state, held: null });
		const pane = findPane(loaded.layout, "pane-1");
		expect(
			pane && groundOf(pane).deck?.cards.map((card) => card.key),
		).toEqual(["r:Reading", "r:Lemma"]);
	});

	test("a held gesture is never saved: the workspace as the Lift found it is", () => {
		const before = dealtOnText();
		const pane = findPane(before.layout, "pane-1");
		if (!pane) throw new Error("no Pane");
		/* a Rooted Ground lifts and its Pane steps down while it is in hand */
		const holding = run(before, {
			type: "LiftSheet",
			sheetId: groundOf(pane).id,
		});
		expect(holding.held).not.toBeNull();
		expect(holding.layout).not.toEqual(before.layout);
		const storage = memoryStorage();
		saveApplicationWorkspace(holding, storage);
		const saved = JSON.parse(storage.items.get(KEY) ?? "null");
		expect(Object.keys(saved).sort()).toEqual([
			"activePaneId",
			"layout",
			"nextId",
		]);
		expect(saved.layout).toEqual(before.layout);
		expect(saved.nextId).toBe(holding.nextId);
	});

	test("the old version-2 key and anything malformed are ignored", () => {
		const legacy = memoryStorage({
			"tf-demo.workspace.v2": JSON.stringify({ version: 2 }),
		});
		expect(loadApplicationWorkspace(fresh, MENU_ITEMS, legacy)).toEqual(
			fresh(),
		);
		for (const raw of [
			"not json",
			JSON.stringify({
				layout: { kind: "Pane" },
				activePaneId: "p",
				nextId: 1,
			}),
			JSON.stringify({
				...JSON.parse(JSON.stringify(dealtOnText())),
				nextId: "3",
			}),
		]) {
			const storage = memoryStorage({ [KEY]: raw });
			expect(
				loadApplicationWorkspace(fresh, MENU_ITEMS, storage),
			).toEqual(fresh());
		}
	});

	test("a Subject or a Menu Item the app no longer knows discards the save", () => {
		const state = dealtOnText();
		const storage = memoryStorage();
		saveApplicationWorkspace(state, storage);
		const raw = storage.items.get(KEY) ?? "";
		const unknownItem = memoryStorage({
			[KEY]: raw.replace('"item":"library"', '"item":"archive"'),
		});
		expect(
			loadApplicationWorkspace(fresh, MENU_ITEMS, unknownItem),
		).toEqual(fresh());
		const unknownSubject = memoryStorage({
			[KEY]: raw.replace('"kind":"Lemma"', '"kind":"Poem"'),
		});
		expect(
			loadApplicationWorkspace(fresh, MENU_ITEMS, unknownSubject),
		).toEqual(fresh());
	});

	test("an Active Pane that is gone falls back to the first Pane", () => {
		const state = dealtOnText();
		const storage = memoryStorage({
			[KEY]: JSON.stringify({
				layout: state.layout,
				activePaneId: "pane-99",
				nextId: state.nextId,
			}),
		});
		expect(
			loadApplicationWorkspace(fresh, MENU_ITEMS, storage).activePaneId,
		).toBe("pane-1");
	});
});
