import {
	findPane,
	isRooted,
	type NavigationRung,
	type NavigationSheet,
	type NavigationTarget,
	type PaneNode,
	type Presentation,
	panesOf,
	planNavigation,
	type Rung,
	type WorkspaceState,
	workspaceReducer,
} from "compass";
import { LIBRARY, MENU_ITEMS } from "./application-menu";
import {
	isWorkspaceSubject,
	type WorkspaceSubject,
	workspaceSubjectKey,
} from "./workspace-subject";

/**
 * The Address: the URL path that spells the one Pane's Sheet Stack (tf-demo
 * ADR 0015). The Ground line comes first, one rung per segment: `/menu`,
 * `/library`, `/settings`, or the Library's selections,
 * `/section/<id>/…/scroll/<id>`, with the Menu and the Library implied. Each
 * Cover follows as its own segments: `/reading/<id>`, `/lemma/<id>`,
 * `/surface/de/<form>`, `/attestation/<id>`, `/shadow/<id>`,
 * `/source/<scrollId>/<attestationId>` for Go to source, `/step/<requestId>/
 * <reading|attestation>`, and `/codex/<sectionId>` or `/source/<scrollId>`
 * for a Section or a Scroll that is a Cover without a focus.
 *
 * Only identity is spelled, as the opaque ids `workspaceSubjectKey` reads.
 * Decks, presentation context, titles, scroll positions and the Held Card
 * never are, so loading an Address deals nothing.
 */

/**
 * The Pane the Address spells: the Active Pane when it is Rooted, else the
 * first Rooted Pane. While splits are parked (tf-demo ADR 0013) it is the
 * only Pane.
 */
export function addressedPane(
	state: WorkspaceState<WorkspaceSubject>,
): PaneNode<WorkspaceSubject> | null {
	const active = findPane(state.layout, state.activePaneId);
	return active && isRooted(active)
		? active
		: (panesOf(state.layout).find(isRooted) ?? null);
}

/**
 * Whether an open Presentation is the Sheet a target names: the same
 * Presentation when the target knows its id, else the same Subject.
 */
export function isSameSheet(
	presentation: Presentation<WorkspaceSubject>,
	sheet: NavigationSheet<WorkspaceSubject>,
): boolean {
	return sheet.presentationId === undefined
		? workspaceSubjectKey(presentation.subject) ===
				workspaceSubjectKey(sheet.subject)
		: presentation.id === sheet.presentationId;
}

/**
 * The workspace taken to the Sheet Stack `pathname` spells, as a load
 * takes it: the Sheets it shares keep their Decks and context. A path that
 * is no Address, such as a bare `/`, leaves it as it is.
 */
export function openAddress(
	state: WorkspaceState<WorkspaceSubject>,
	pathname: string,
): WorkspaceState<WorkspaceSubject> {
	const target = targetOf(pathname);
	const pane = addressedPane(state);
	if (!target || !pane) return state;
	return planNavigation(state, pane.id, target, isSameSheet).reduce(
		workspaceReducer<WorkspaceSubject>,
		state,
	);
}

/** What a Sheet is in a Pane's history: its Presentation's id, or the rung it is. */
export function sheetIdsOf(pane: PaneNode<WorkspaceSubject>): string[] {
	return [
		...pane.line.map((rung) =>
			rung.kind === "Menu"
				? "menu"
				: rung.kind === "MenuItem"
					? rung.item
					: rung.presentation.id,
		),
		...pane.covers.map((cover) => cover.presentation.id),
	];
}

/**
 * The Address of a Rooted Pane's Sheet Stack, or of its bottom `depth`
 * Sheets. A Floating Pane has none.
 */
export function addressOf(
	pane: PaneNode<WorkspaceSubject>,
	depth = pane.line.length + pane.covers.length,
): string | null {
	if (!isRooted(pane) || depth < 1) return null;
	const line = pane.line.slice(0, depth);
	const covers = pane.covers.slice(0, Math.max(0, depth - line.length));
	const segments = [
		...lineSegments(line),
		...covers.flatMap((cover) => coverSegments(cover.presentation.subject)),
	];
	return `/${segments.map(encodeURIComponent).join("/")}`;
}

function lineSegments(line: readonly Rung<WorkspaceSubject>[]): string[] {
	const item = line[1];
	if (item?.kind !== "MenuItem") return ["menu"];
	const selections = line
		.slice(2)
		.flatMap((rung) =>
			rung.kind !== "Sheet"
				? []
				: rung.presentation.subject.kind === "Section"
					? ["section", rung.presentation.subject.target.sectionId]
					: rung.presentation.subject.kind === "Scroll"
						? ["scroll", rung.presentation.subject.target.scrollId]
						: coverSegments(rung.presentation.subject),
		);
	return selections.length && item.item === LIBRARY
		? selections
		: [item.item, ...selections];
}

function coverSegments(subject: WorkspaceSubject): string[] {
	const { target } = subject;
	switch (target.kind) {
		case "Section":
			return ["codex", target.sectionId];
		case "Scroll":
			return target.focusAttestationId === undefined
				? ["source", target.scrollId]
				: ["source", target.scrollId, target.focusAttestationId];
		case "Reading":
			return ["reading", target.readingId];
		case "Lemma":
			return ["lemma", target.lemmaId];
		case "Surface":
			return ["surface", target.language, target.normalizedSurface];
		case "Attestation":
			return ["attestation", target.attestationId];
		case "Shadow":
			return ["shadow", target.shadowId];
		case "ResolutionStep":
			return ["step", target.requestId, target.stepKind.toLowerCase()];
	}
}

/** The keywords that start a Cover's segments. */
const COVERS = new Set([
	"codex",
	"source",
	"reading",
	"lemma",
	"surface",
	"attestation",
	"shadow",
	"step",
]);

/**
 * The Sheet Stack an Address spells, or `null` for a bare `/` and for any
 * path that is no Address.
 */
export function targetOf(
	pathname: string,
): NavigationTarget<WorkspaceSubject> | null {
	let segments: string[];
	try {
		segments = pathname
			.split("/")
			.filter((segment) => segment.length > 0)
			.map(decodeURIComponent);
	} catch {
		return null;
	}
	const reader = segmentReader(segments);
	const line = readLine(reader);
	if (!line) return null;
	const covers: NavigationSheet<WorkspaceSubject>[] = [];
	while (!reader.done()) {
		const subject = readCover(reader);
		if (!subject) return null;
		covers.push({ subject });
	}
	return { line, covers };
}

type SegmentReader = {
	readonly peek: () => string | undefined;
	readonly take: () => string | undefined;
	readonly done: () => boolean;
};

function segmentReader(segments: readonly string[]): SegmentReader {
	let at = 0;
	return {
		peek: () => segments[at],
		take: () => segments[at++],
		done: () => at >= segments.length,
	};
}

function readLine(
	reader: SegmentReader,
): NavigationRung<WorkspaceSubject>[] | null {
	const first = reader.peek();
	if (first === undefined) return null;
	const line: NavigationRung<WorkspaceSubject>[] = [{ kind: "Menu" }];
	if (first === "menu") {
		reader.take();
		return line;
	}
	if (MENU_ITEMS.has(first)) reader.take();
	else if (first !== "section" && first !== "scroll") return null;
	const item = MENU_ITEMS.has(first) ? first : LIBRARY;
	line.push({ kind: "MenuItem", item });
	if (item !== LIBRARY) return line;
	/* Sections, at any depth, then at most one Scroll, which ends the line */
	for (;;) {
		const kind = reader.peek();
		if (kind !== "section" && kind !== "scroll") return line;
		reader.take();
		const id = reader.take();
		if (!id) return null;
		const subject = asSubject(
			kind === "section"
				? {
						kind: "Section",
						target: { kind: "Section", sectionId: id },
					}
				: { kind: "Scroll", target: { kind: "Scroll", scrollId: id } },
		);
		if (!subject) return null;
		line.push({ kind: "Sheet", sheet: { subject } });
		if (kind === "scroll") return line;
	}
}

function readCover(reader: SegmentReader): WorkspaceSubject | null {
	const kind = reader.take();
	const id = reader.take();
	if (!id) return null;
	switch (kind) {
		case "codex":
			return asSubject({
				kind: "Section",
				target: { kind: "Section", sectionId: id },
			});
		case "source": {
			const focus = reader.peek();
			const focused = focus !== undefined && !COVERS.has(focus);
			if (focused) reader.take();
			return asSubject({
				kind: "Scroll",
				target: {
					kind: "Scroll",
					scrollId: id,
					...(focused ? { focusAttestationId: focus } : {}),
				},
			});
		}
		case "reading":
			return note({ kind: "Reading", readingId: id });
		case "lemma":
			return note({ kind: "Lemma", lemmaId: id });
		case "surface": {
			const form = reader.take();
			return form
				? note({
						kind: "Surface",
						language: id,
						normalizedSurface: form,
					})
				: null;
		}
		case "attestation":
			return note({ kind: "Attestation", attestationId: id });
		case "shadow":
			return note({ kind: "Shadow", shadowId: id });
		case "step": {
			const step = reader.take();
			const stepKind =
				step === "reading"
					? "Reading"
					: step === "attestation"
						? "Attestation"
						: null;
			return stepKind
				? note({ kind: "ResolutionStep", requestId: id, stepKind })
				: null;
		}
		default:
			return null;
	}
}

function note(target: Record<string, string>): WorkspaceSubject | null {
	return asSubject({ kind: "Note", target });
}

/** A Subject read back from segments, checked as Workspace Persistence checks one. */
function asSubject(value: unknown): WorkspaceSubject | null {
	return isWorkspaceSubject(value) ? value : null;
}
