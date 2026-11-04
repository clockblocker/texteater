import {
	afterAll,
	afterEach,
	beforeAll,
	beforeEach,
	expect,
	test,
} from "bun:test";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import type { WorkspaceCommand } from "compass";
import * as AtomRegistry from "effect/reactivity/AtomRegistry";
import { compassWorkspaceOf } from "./compass/use-compass-workspace";
import { connectWorkspaceHistory } from "./connect-workspace-history";
import { addressedPane, addressOf } from "./workspace-address";
import { applicationWorkspaceAtom } from "./workspace-atoms";
import { workspaceEntryOf } from "./workspace-history";
import type { WorkspaceSubject } from "./workspace-subject";

beforeAll(() => {
	GlobalRegistrator.register({ url: "http://localhost/" });
});

afterAll(async () => {
	await GlobalRegistrator.unregister();
});

/** Lets the registry, and the browser's Back and Forward, finish. */
const settle = () => new Promise((resolve) => setTimeout(resolve, 20));

beforeEach(() => {
	window.localStorage.clear();
});

afterEach(settle);

const lemma: WorkspaceSubject = {
	kind: "Note",
	target: { kind: "Lemma", lemmaId: "l1" },
} as WorkspaceSubject;
const shadow: WorkspaceSubject = {
	kind: "Note",
	target: { kind: "Shadow", shadowId: "sh1" },
};

/** The app opened at `pathname` in a fresh entry, as a pasted link opens it. */
function open(pathname: string) {
	window.history.pushState(null, "", pathname);
	const registry = AtomRegistry.make();
	const workspace = compassWorkspaceOf(registry, applicationWorkspaceAtom);
	const stopReading = registry.subscribe(applicationWorkspaceAtom, () => {});
	const cancelled: string[] = [];
	const disconnect = connectWorkspaceHistory(registry, () =>
		cancelled.push("gesture"),
	);
	const paneId = () => workspace.current().activePaneId;
	const send = (command: WorkspaceCommand<WorkspaceSubject>) =>
		workspace.dispatch(command);
	const top = () => {
		const pane = addressedPane(workspace.current());
		if (!pane) throw new Error("no Pane");
		return pane.covers.at(-1) ?? pane.line.at(-1);
	};
	const shown = () => {
		const pane = addressedPane(workspace.current());
		return pane ? addressOf(pane) : null;
	};
	return {
		workspace,
		send,
		paneId,
		top,
		shown,
		cancelled,
		close: () => {
			disconnect();
			stopReading();
		},
	};
}

async function back(steps = 1) {
	window.history.go(-steps);
	await settle();
}

type Entry = { readonly pathname: string; readonly state: unknown };

function here(): Entry {
	return {
		pathname: window.location.pathname,
		state: structuredClone(window.history.state),
	};
}

/**
 * Forward to `entry`. happy-dom drops the entries ahead when one is
 * replaced, as every landing does, so Forward is played as the browser
 * plays it: the entry comes back, then `popstate`.
 */
async function forwardTo(entry: Entry) {
	window.history.pushState(entry.state, "", entry.pathname);
	window.dispatchEvent(new PopStateEvent("popstate"));
	await settle();
}

test("a pasted Address opens there, one entry per Sheet, and Back takes them off as ← would", async () => {
	const length = window.history.length;
	const app = open("/section/a/scroll/s1/lemma/l1");
	expect(window.location.pathname).toBe("/section/a/scroll/s1/lemma/l1");
	expect(window.history.length).toBe(length + 5);
	expect(workspaceEntryOf(window.history.state)?.index).toBe(4);

	await back();
	expect(app.shown()).toBe("/section/a/scroll/s1");
	expect(window.location.pathname).toBe("/section/a/scroll/s1");
	await back();
	expect(app.shown()).toBe("/section/a");
	app.close();
});

test("a Link pushes; Back closes its Cover, and Forward follows it afresh with no Deck", async () => {
	const app = open("/scroll/s1");
	const length = window.history.length;
	app.send({ type: "FollowLink", paneId: app.paneId(), subject: lemma });
	const followed = app.top()?.id;
	expect(window.location.pathname).toBe("/scroll/s1/lemma/l1");
	expect(window.history.length).toBe(length + 1);
	app.send({
		type: "Deal",
		sheetId: followed ?? "",
		selection: "click",
		cards: [{ subject: shadow }],
	});
	expect(window.history.length).toBe(length + 1);
	const ahead = here();

	await back();
	expect(app.shown()).toBe("/scroll/s1");
	await forwardTo(ahead);
	expect(app.shown()).toBe("/scroll/s1/lemma/l1");
	const reopened = app.top();
	expect(reopened?.id).not.toBe(followed);
	expect(reopened?.deck).toBeNull();
	expect(window.location.pathname).toBe("/scroll/s1/lemma/l1");
	app.close();
});

test("← on a Cover goes back an entry, and × goes back past every Cover", async () => {
	const app = open("/scroll/s1");
	const length = window.history.length;
	app.send({ type: "FollowLink", paneId: app.paneId(), subject: lemma });
	app.send({ type: "FollowLink", paneId: app.paneId(), subject: shadow });
	app.send({ type: "FollowLink", paneId: app.paneId(), subject: lemma });
	expect(window.history.length).toBe(length + 3);
	const ahead = here();

	app.send({ type: "GoBack", sheetId: app.top()?.id ?? "" });
	await settle();
	expect(window.location.pathname).toBe("/scroll/s1/lemma/l1/shadow/sh1");
	app.send({ type: "ClearCovers", paneId: app.paneId() });
	await settle();
	expect(window.location.pathname).toBe("/scroll/s1");
	expect(workspaceEntryOf(window.history.state)?.index).toBe(2);

	/* the entries above are Forward's now: it follows the Links again */
	await forwardTo(ahead);
	expect(app.shown()).toBe("/scroll/s1/lemma/l1/shadow/sh1/lemma/l1");
	app.close();
});

test("Back collapses a Cover whose Card is in a live Deck, as ← does", async () => {
	const app = open("/scroll/s1");
	const ground = app.top();
	app.send({
		type: "Deal",
		sheetId: ground?.id ?? "",
		selection: "click",
		cards: [{ subject: lemma }],
	});
	const card = app.top()?.deck?.cards[0];
	app.send({
		type: "LiftCard",
		sheetId: ground?.id ?? "",
		presentationId: card?.id ?? "",
	});
	app.send({ type: "Expand", paneId: app.paneId() });
	expect(window.location.pathname).toBe("/scroll/s1/lemma/l1");

	await back();
	expect(app.shown()).toBe("/scroll/s1");
	expect(app.top()?.deck?.frontId).toBe(card?.id ?? "");
	app.close();
});

test("Next goes back to the Sections it keeps, then pushes the new Scroll", async () => {
	const app = open("/section/a/scroll/s1");
	const index = workspaceEntryOf(window.history.state)?.index ?? -1;
	app.send({
		type: "WalkLine",
		paneId: app.paneId(),
		keep: 1,
		to: [{ kind: "Scroll", target: { kind: "Scroll", scrollId: "s2" } }],
	});
	await settle();
	expect(window.location.pathname).toBe("/section/a/scroll/s2");
	expect(workspaceEntryOf(window.history.state)?.index).toBe(index);

	await back();
	expect(app.shown()).toBe("/section/a");
	app.close();
});

test("a Card in hand is let go before Back moves the stack", async () => {
	const app = open("/scroll/s1");
	app.send({ type: "FollowLink", paneId: app.paneId(), subject: lemma });
	app.send({ type: "LiftFresh", paneId: app.paneId(), subject: shadow });
	expect(app.workspace.current().held).not.toBeNull();

	await back();
	expect(app.cancelled).toEqual(["gesture"]);
	expect(app.workspace.current().held).toBeNull();
	expect(app.shown()).toBe("/scroll/s1");
	app.close();
});

test("a Resolution Step renamed in place replaces its entry", () => {
	const app = open("/scroll/s1");
	const ground = app.top();
	const step: WorkspaceSubject = {
		kind: "Note",
		target: { kind: "ResolutionStep", requestId: "r", stepKind: "Reading" },
	};
	app.send({
		type: "Deal",
		sheetId: ground?.id ?? "",
		selection: "click",
		cards: [{ subject: step, key: "reading" }],
	});
	const deck = app.top()?.deck;
	const card = deck?.cards[0];
	app.send({
		type: "LiftCard",
		sheetId: ground?.id ?? "",
		presentationId: card?.id ?? "",
	});
	app.send({ type: "Expand", paneId: app.paneId() });
	const length = window.history.length;
	expect(window.location.pathname).toBe("/scroll/s1/step/r/reading");

	app.send({
		type: "ReconcileDeck",
		deckId: deck?.id ?? "",
		cards: [
			{
				key: "reading",
				subject: {
					kind: "Note",
					target: { kind: "Reading", readingId: "rd1" },
				},
			},
		],
	});
	expect(window.location.pathname).toBe("/scroll/s1/reading/rd1");
	expect(window.history.length).toBe(length);
	app.close();
});

test("a bare / resumes the saved workspace, and the URL shows what came back", async () => {
	const first = open("/scroll/s1/lemma/l1");
	first.close();
	await settle();
	const second = open("/");
	expect(window.location.pathname).toBe("/scroll/s1/lemma/l1");
	second.close();
});
