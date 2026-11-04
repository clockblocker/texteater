import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	expect,
	test,
} from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { groundOf, panesOf, type WorkspaceState } from "compass";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { initialWorkspace } from "./application-menu";
import { compassWorkspaceOf } from "./compass/use-compass-workspace";
import { applicationWorkspaceAtom } from "./workspace-atoms";
import type { WorkspaceSubject } from "./workspace-subject";

const STORAGE_KEY = "tf-demo.workspace.compass.v1";

beforeAll(() => {
	GlobalRegistrator.register({ url: "http://localhost/" });
});

afterAll(async () => {
	await GlobalRegistrator.unregister();
});

/** Lets the registry run the node removals it schedules. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

beforeEach(() => {
	window.localStorage.clear();
});

// Each test's registry drops its atom on a later tick.
afterEach(settle);

const scroll = (scrollId: string): WorkspaceSubject => ({
	kind: "Scroll",
	target: { kind: "Scroll", scrollId },
});

/** A workspace over a fresh registry, as one mount of the app sees it. */
function mount() {
	const registry = AtomRegistry.make();
	const workspace = compassWorkspaceOf(registry, applicationWorkspaceAtom);
	const heard: WorkspaceState<WorkspaceSubject>[] = [];
	const unmount = registry.subscribe(applicationWorkspaceAtom, (state) =>
		heard.push(state),
	);
	return { registry, workspace, heard, unmount };
}

function saved(): unknown {
	const raw = window.localStorage.getItem(STORAGE_KEY);
	return raw === null ? null : JSON.parse(raw);
}

/** What the workspace saves of `state`, held gesture aside. */
function savedOf(state: WorkspaceState<WorkspaceSubject>) {
	return {
		layout: state.layout,
		activePaneId: state.activePaneId,
		nextId: state.nextId,
	};
}

function openScroll(
	workspace: ReturnType<typeof mount>["workspace"],
	scrollId: string,
) {
	return workspace.dispatch({
		type: "StepUp",
		paneId: workspace.current().activePaneId,
		to: { kind: "Sheet", subject: scroll(scrollId) },
	});
}

test("with nothing saved, the workspace starts at the Library and saves that", () => {
	const { workspace, unmount } = mount();
	const start = workspace.current();
	unmount();

	expect(start.layout).toEqual(initialWorkspace().layout);
	expect(start.held).toBeNull();
	expect(saved()).toEqual(savedOf(start));
});

test("a command goes through the reducer, reaches readers and is saved", () => {
	const { registry, workspace, heard, unmount } = mount();
	const next = openScroll(workspace, "first");
	unmount();

	const pane = panesOf(next.layout)[0];
	expect(pane && groundOf(pane)).toMatchObject({
		kind: "Sheet",
		presentation: { subject: scroll("first") },
	});
	expect(registry.get(applicationWorkspaceAtom)).toBe(next);
	expect(heard).toEqual([next]);
	expect(saved()).toEqual(savedOf(next));
});

test("a handler reads its own command's result at once", () => {
	const { workspace, unmount } = mount();
	const opened = openScroll(workspace, "first");
	expect(workspace.current()).toBe(opened);

	// The second command reduces the first one's result, not a render's.
	const lifted = workspace.dispatch({
		type: "LiftFresh",
		paneId: workspace.current().activePaneId,
		subject: scroll("second"),
	});
	unmount();

	expect(workspace.current()).toBe(lifted);
	expect(lifted.held?.checkpoint.layout).toBe(opened.layout);
});

test("the next mount reads back what the last one saved", async () => {
	const first = mount();
	const opened = openScroll(first.workspace, "first");
	first.unmount();
	await settle();

	const second = mount();
	const loaded = second.workspace.current();
	second.unmount();

	expect(loaded).toEqual({ ...opened, held: null });
});

test("a Card in hand is not saved, and the next mount has none", async () => {
	const first = mount();
	const opened = openScroll(first.workspace, "first");
	const lifted = first.workspace.dispatch({
		type: "LiftFresh",
		paneId: opened.activePaneId,
		subject: scroll("second"),
	});
	first.unmount();
	await settle();

	expect(saved()).toEqual({ ...savedOf(opened), nextId: lifted.nextId });
	const second = mount();
	const loaded = second.workspace.current();
	second.unmount();
	expect(loaded.held).toBeNull();
	expect(loaded.layout).toEqual(opened.layout);
});

test("resetting starts over and saves the start", () => {
	const { workspace, unmount } = mount();
	openScroll(workspace, "first");
	workspace.reset(initialWorkspace());
	const reset = workspace.current();
	unmount();

	expect(reset.layout).toEqual(initialWorkspace().layout);
	expect(saved()).toEqual(savedOf(reset));
});

test("a malformed save is replaced by the start on the first read", () => {
	window.localStorage.setItem(STORAGE_KEY, "{not json");
	const { workspace, unmount } = mount();
	const start = workspace.current();
	unmount();

	expect(start.layout).toEqual(initialWorkspace().layout);
	expect(saved()).toEqual(savedOf(start));
});
