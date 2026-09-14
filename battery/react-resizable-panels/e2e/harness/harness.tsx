import { useReducer } from "react";
import {
	createWorkspace,
	getWorkspaceStateLabel,
	Workspace,
	type WorkspaceCommand,
	type WorkspaceRenderContext,
	type WorkspaceState,
	workspaceReducer,
} from "react-resizable-panels/workspace";
import "react-resizable-panels/workspace.css";
import {
	type TransitionRecord,
	WorkspaceStateInspector,
} from "./state-inspector";

/**
 * The harness presents opaque Subjects so the browser tests exercise only what
 * the battery owns: placement, form, and gestures. A Text opens a Card Layer
 * of four Notes from any word; Notes are plain articles.
 */
export type HarnessSubject =
	| { kind: "Text" }
	| { kind: "Note"; note: NoteKind; word: string };

const NOTE_KINDS = ["Reading", "Lemma", "Surface", "Attestation"] as const;
type NoteKind = (typeof NOTE_KINDS)[number];

const SENTENCES = [
	"Die Banken sind geöffnet.",
	"Morgen bleiben sie geschlossen.",
	"Am Fluss beginnt ein ruhiger Weg.",
	"Eine Frau wartet vor dem alten Haus.",
	"Über den Dächern ziehen dunkle Wolken vorbei.",
	"Im Garten spielt ein Kind mit einem Ball.",
	"Der Zug kommt heute etwas später an.",
	"Auf dem Markt kaufen wir frisches Brot.",
	"Neben der Brücke steht ein kleines Café.",
	"Ein Mann liest dort jeden Tag die Zeitung.",
	"Nach dem Regen riecht die Luft nach Erde.",
	"Wir gehen langsam durch die leeren Straßen.",
	"Hinter dem Bahnhof beginnt der Wald.",
	"Zwischen den Bäumen scheint die Sonne.",
	"Am Abend kehren alle nach Hause zurück.",
	"In der Küche wartet eine warme Suppe.",
	"Später hören wir draußen die letzten Vögel.",
	"Dann wird es still in der kleinen Stadt.",
];

type HarnessState = {
	workspace: WorkspaceState<HarnessSubject>;
	history: TransitionRecord[];
};

function reduce(
	state: HarnessState,
	command: WorkspaceCommand<HarnessSubject>,
): HarnessState {
	const workspace = workspaceReducer(state.workspace, command);
	if (workspace === state.workspace) return state;
	const history =
		command.type === "ActivatePane"
			? state.history
			: [
					...state.history,
					{
						from: getWorkspaceStateLabel(state.workspace),
						command: command.type,
						to: getWorkspaceStateLabel(workspace),
					},
				].slice(-8);
	return { workspace, history };
}

export function labelSubject(subject: HarnessSubject): string {
	return subject.kind === "Text" ? "Source text" : subject.note;
}

export function Harness() {
	const [{ workspace, history }, dispatch] = useReducer(
		reduce,
		undefined,
		() => ({
			workspace: createWorkspace<HarnessSubject>({ kind: "Text" }),
			history: [],
		}),
	);
	return (
		<div className="harness">
			<Workspace
				state={workspace}
				dispatch={dispatch}
				labelSubject={labelSubject}
				renderSubject={(subject, context) =>
					subject.kind === "Text" ? (
						<TextSubject
							onSelectWord={(word, anchor) => {
								context.selectAnchor(anchor);
								dispatch({
									type: "OpenLayer",
									originPresentationId:
										context.presentationId,
									subjects: NOTE_KINDS.map((note) => ({
										kind: "Note",
										note,
										word,
									})),
								});
							}}
						/>
					) : (
						<NoteSubject subject={subject} context={context} />
					)
				}
			/>
			<WorkspaceStateInspector state={workspace} history={history} />
		</div>
	);
}

function TextSubject({
	onSelectWord,
}: {
	onSelectWord(word: string, anchor: HTMLElement): void;
}) {
	return (
		<article className="harness-text" aria-label="Source text">
			{SENTENCES.map((sentence) => (
				<p key={sentence}>
					{sentence.split(/(\s+)/).map((part, index) =>
						/^\s+$/.test(part) ? (
							// biome-ignore lint/suspicious/noArrayIndexKey: whitespace runs have no identity
							<span key={index}>{part}</span>
						) : (
							<button
								// biome-ignore lint/suspicious/noArrayIndexKey: words repeat within a sentence
								key={index}
								type="button"
								className="harness-word"
								onClick={(event) =>
									onSelectWord(
										part.replace(/[^\p{L}]/gu, ""),
										event.currentTarget,
									)
								}
							>
								{part}
							</button>
						),
					)}
				</p>
			))}
		</article>
	);
}

function NoteSubject({
	subject,
	context,
}: {
	subject: Extract<HarnessSubject, { kind: "Note" }>;
	context: WorkspaceRenderContext<HarnessSubject>;
}) {
	return (
		<article className="harness-note" aria-label={`${subject.note} Note`}>
			<h1>
				{subject.note}: {subject.word}
			</h1>
			<p>
				This {subject.note} Note is presented as a{" "}
				{context.presentation}.
			</p>
			<p>
				Its content is opaque to the workspace. The battery only decides
				where the Presentation rests and which form it takes.
			</p>
		</article>
	);
}
