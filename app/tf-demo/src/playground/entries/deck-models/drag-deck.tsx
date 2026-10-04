import { useMemo, useState } from "react";
import { useMotionPreference } from "@/lib/motion-preference";
import { Compass } from "@/workspace/compass/compass";
import {
	ALL_INTERACTIONS,
	type DeckInteraction,
} from "@/workspace/compass/interaction-policy";
import { GroundList } from "@/workspace/compass/pane-chrome";
import type { MenuItem, MenuItemView } from "@/workspace/compass/subject";
import { useCompassWorkspace } from "@/workspace/compass/use-compass-workspace";
import type { DeckMotionOverrides } from "@/workspace/motion/runtime-config";
import { noteFor, TEXTS, textById } from "./dummy";
import {
	initialWorkspace,
	LIBRARY,
	ROOT_PANE,
	type Subject,
	subjectLabel,
} from "./model";
import { FixtureNotesProvider } from "./real-note";
import { RULES } from "./rules";
import { ModelShell, useEventLog } from "./shared";
import { playgroundRenderer } from "./subjects";

/**
 * COMPASS — the Pane algebra (Wayfinder map texteater#473), on dummy
 * Subjects. The renderer, its gestures and its motion are tf-demo's
 * production Compass (`@/workspace/compass`); this is its proving ground:
 * the Subjects, a toolbar of switches under study, the rules, and a log
 * of every command the reader's actions send.
 */

/** Where the workbench's stage, with no Text above its Deck, puts the Deck's top. */
const STAGE_DECK_TOP_REM = 3;

const SETTINGS = "settings";

const MENU: readonly MenuItem[] = [
	{ key: LIBRARY, label: "Library" },
	{ key: SETTINGS, label: "Settings" },
];

export type CompassModelProps = {
	interactions?: readonly DeckInteraction[];
	/** A workbench stage: no shell, a Deck dealt, and a Deck near the top. */
	embedded?: boolean;
	initialScene?: "empty" | "deck" | "sheet";
	motion?: DeckMotionOverrides;
	showZones?: boolean;
	showReader?: boolean;
};

export function CompassModel(props: CompassModelProps = {}) {
	return (
		<FixtureNotesProvider>
			<CompassStage {...props} />
		</FixtureNotesProvider>
	);
}

function CompassStage({
	interactions = ALL_INTERACTIONS,
	embedded = false,
	initialScene = embedded ? "deck" : "empty",
	motion,
	showZones = false,
	showReader = !embedded,
}: CompassModelProps) {
	const workspace = useCompassWorkspace(() => initialWorkspace(initialScene));
	const { entries, log, clear } = useEventLog();
	/** A fresh Compass after a reset, so no gesture outlives the workspace it was on. */
	const [run, setRun] = useState(0);
	/**
	 * Issue 479, prototyped both ways behind one switch: with it on, a fast
	 * swipe toward inline-start on any Card sweeps the whole Deck; off,
	 * that gesture is gone and only the click, Escape and a new selection
	 * sweep.
	 */
	const [swipeSweeps, setSwipeSweeps] = useState(true);
	const [zonesVisible, setZonesVisible] = useState(showZones);
	const [linksDrag, setLinksDrag] = useState(true);
	/** Hebrew is coming: the whole workspace mirrors in right-to-left text. */
	const [rtl, setRtl] = useState(false);
	const renderer = useMemo(
		() => playgroundRenderer({ showReader }),
		[showReader],
	);
	const live = useMemo(
		() =>
			swipeSweeps
				? interactions
				: interactions.filter((interaction) => interaction !== "sweep"),
		[interactions, swipeSweeps],
	);

	function renderMenuItem(item: string, view: MenuItemView<Subject>) {
		return item === SETTINGS ? (
			<SettingsRung />
		) : (
			<GroundList
				title="Library"
				items={TEXTS.map((text) => ({
					key: text.id,
					label: text.title,
				}))}
				onPick={(key) =>
					view.select({
						kind: "Text",
						text: textById(key),
						focus: null,
					})
				}
			/>
		);
	}

	const compass = (
		<Compass
			key={run}
			workspace={workspace}
			renderer={renderer}
			menu={MENU}
			renderMenuItem={renderMenuItem}
			interactions={live}
			motion={motion}
			linksDrag={linksDrag}
			zonesShown={zonesVisible}
			deckTopRem={embedded ? STAGE_DECK_TOP_REM : undefined}
			onLog={log}
		/>
	);
	if (embedded) return compass;
	const toggle = (
		text: string,
		checked: boolean,
		set: (checked: boolean) => void,
	) => (
		<label className="flex cursor-pointer items-center justify-between gap-3 select-none">
			<span>{text}</span>
			<input
				type="checkbox"
				checked={checked}
				onChange={(event) => set(event.target.checked)}
				className="accent-link"
			/>
		</label>
	);
	const link =
		"self-start text-[0.78rem] text-link underline-offset-2 hover:underline";
	return (
		<ModelShell
			rules={RULES}
			entries={entries}
			onReset={() => {
				workspace.reset(initialWorkspace("empty"));
				setRun((value) => value + 1);
				clear();
			}}
			toolbar={
				<div className="flex flex-col gap-2 text-[0.8rem] text-ink">
					{toggle(
						"Swipe sweeps the Deck",
						swipeSweeps,
						setSwipeSweeps,
					)}
					{toggle("Show drop zones", zonesVisible, setZonesVisible)}
					{toggle("Right-to-left", rtl, setRtl)}
					<fieldset className="flex flex-col gap-1.5 border-t border-line pt-2">
						<legend className="mb-1 font-mono text-[0.62rem] font-bold tracking-[0.12em] text-ink-muted uppercase">
							Cover Heading
						</legend>
						{toggle(
							"Links in the Heading drag",
							linksDrag,
							setLinksDrag,
						)}
						<button
							type="button"
							onClick={() => {
								const subject: Subject = {
									kind: "Note",
									note: noteFor("Reading", "Dämmerung"),
								};
								const paneId = workspace.current().activePaneId;
								log(
									`Open the ported Reading: ${subjectLabel(subject)} covers ${paneId}`,
								);
								workspace.dispatch({
									type: "FollowLink",
									paneId,
									subject,
								});
							}}
							className={link}
						>
							Open the ported Reading (Dämmerung)
						</button>
					</fieldset>
					<button
						type="button"
						onClick={() => {
							workspace.dispatch({
								type: "SpawnRootedPane",
								paneId: ROOT_PANE,
								edge: "inline-end",
							});
							log(
								`New Rooted Pane beside ${ROOT_PANE}, at its Menu`,
							);
						}}
						className={link}
					>
						Spawn an empty Rooted Pane
					</button>
				</div>
			}
		>
			<div dir={rtl ? "rtl" : "ltr"} className="contents">
				{compass}
			</div>
		</ModelShell>
	);
}

/** The Settings Menu Item: the application's one setting so far. */
function SettingsRung() {
	const { preference, setPreference } = useMotionPreference();
	return (
		<GroundList
			title="Settings"
			items={[
				{
					key: "motion",
					label:
						preference === "ignore"
							? "Animations: always play"
							: "Animations: follow the system",
				},
			]}
			onPick={() =>
				setPreference(preference === "ignore" ? "respect" : "ignore")
			}
		/>
	);
}
