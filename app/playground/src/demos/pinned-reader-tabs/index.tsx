import { cn } from "lego";
import {
	type CSSProperties,
	Fragment,
	type ReactNode,
	type RefObject,
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import {
	DemoInspector,
	InspectorCheck,
	InspectorChoice,
	InspectorSection,
	InspectorTry,
	useDemoParam,
	useFrameSize,
	useInspectorAvoid,
	usePlaygroundEnv,
} from "@/shell";
import { PhoneNavBar, TabSwitcher } from "./phone";
import { PreviewLayer } from "./preview-layer";
import { type ReaderState, ReaderView } from "./reader";
import { obsidian, type PreviewHost } from "./rules";
import { SheetView } from "./sheet";
import { Spine, type TabActions, TabBar } from "./tab-bar";
import {
	activate,
	activeTab,
	close,
	emptyWorkspace,
	focusGroup,
	type Group,
	go,
	hotkey,
	isMac,
	move,
	type OpenHow,
	type OpenSettings,
	openFrom,
	readerTab,
	resize,
	type Tab,
	tabsOf,
	titleOf,
	type Workspace,
} from "./tabs";

/** Narrower than this the frame is a phone: one tab on show, no splits. */
const phoneWidth = 600;
/** A stacked pane's spine, and Obsidian's stacked pane width. */
const spineWidth = 36;
const stackedPaneWidth = 700;

const previewSettings = {
	requireInHosts: true,
	requireInPreviews: false,
	hoverDelayMs: obsidian.hoverDelayMs,
	graceMs: obsidian.graceMs,
};

const mod = isMac ? "⌘" : "Ctrl";
const alt = isMac ? "⌥" : "Alt";
const shift = isMac ? "⇧" : "Shift";

/**
 * Obsidian's tabs with the reader pinned first. A word deals its Deck
 * beside the sentence; a link in a Card opens a Sheet tab, as a link in an
 * Obsidian pinned tab does, so the reader never navigates away and keeps
 * its scroll, its Deck and its sentence. ⌘-click opens a tab (in the
 * background unless "Always focus new tabs"), ⌘⌥-click a split at the
 * inline end, and inside a Sheet a plain click navigates in place. On a
 * phone, one tab shows and the tab switcher holds the rest.
 */
export default function PinnedReaderTabsDemo() {
	const env = usePlaygroundEnv();
	const frameSize = useFrameSize();
	const phone = frameSize.inlineSize > 0 && frameSize.inlineSize < phoneWidth;
	const [focusParam, setFocusParam] = useDemoParam("focus");
	const [modsParam, setModsParam] = useDemoParam("mods");
	const [pinnedParam, setPinnedParam] = useDemoParam("pinned");
	const settings: OpenSettings = {
		alwaysFocusNewTabs: focusParam !== "off",
		modifiers: modsParam !== "off",
		pinnedOpens: pinnedParam === "new" ? "new" : "visible",
		phone,
	};

	const [workspace, setWorkspace] = useState<Workspace>(emptyWorkspace);
	const [stacked, setStacked] = useState<ReadonlySet<string>>(new Set());
	const [switcher, setSwitcher] = useState(false);
	const [reader, setReader] = useState<ReaderState>({
		scrollTop: 0,
		word: null,
		sentence: null,
		front: null,
	});
	const [lastOpen, setLastOpen] = useState<string | null>(null);
	const [switches, setSwitches] = useState(0);

	const latest = useRef({ settings, workspace });
	latest.current = { settings, workspace };

	/** Opens `word` from `sourceId` and says in the inspector what it did. */
	const openWord = useCallback(
		(sourceId: string, word: string, how: OpenHow) => {
			const before = latest.current.workspace;
			const after = openFrom(
				before,
				sourceId,
				word,
				how,
				latest.current.settings,
			);
			setWorkspace(after);
			setLastOpen(describeOpen(before, after, sourceId, word, how));
		},
		[],
	);
	const follow = (
		host: PreviewHost,
		path: readonly string[],
		how: OpenHow,
	) => {
		const word = path.at(-1);
		if (word)
			openWord(
				host.kind === "reader" ? readerTab.id : host.tabId,
				word,
				how,
			);
	};
	const onReaderOpen = useCallback(
		(word: string, how: OpenHow) => openWord(readerTab.id, word, how),
		[openWord],
	);

	const actions: TabActions = {
		onActivate: (tabId) => setWorkspace((now) => activate(now, tabId)),
		onClose: (tabId) => setWorkspace((now) => close(now, tabId)),
		onMove: (tabId, index) =>
			setWorkspace((now) => move(now, tabId, index)),
	};
	const goIn = (tabId: string) => (index: number) =>
		setWorkspace((now) => go(now, tabId, index));

	const focusedGroup =
		workspace.groups.find((group) => group.id === workspace.focused) ??
		workspace.groups[0];
	const shown = activeTab(workspace);
	const readerGroup = workspace.groups[0];
	const readerOnShow = phone
		? shown.id === readerTab.id
		: readerGroup?.active === readerTab.id ||
			stacked.has(readerGroup?.id ?? "");

	// Counts the reader's hide-and-show round trips, for the inspector.
	const wasOnShow = useRef(readerOnShow);
	useEffect(() => {
		if (readerOnShow && !wasOnShow.current) setSwitches((n) => n + 1);
		wasOnShow.current = readerOnShow;
	}, [readerOnShow]);

	// Obsidian's tab hotkeys. ⌘W and ⌘⇧T belong to the browser, so ⌥W
	// and ⌥⇧T stand in for them; the rest are Obsidian's own.
	useEffect(() => {
		const onKey = (event: KeyboardEvent) => {
			const focused = document.activeElement;
			if (
				event.defaultPrevented ||
				(focused &&
					focused !== document.body &&
					!env.frame?.contains(focused))
			)
				return;
			const next = hotkey(latest.current.workspace, event);
			if (!next) return;
			event.preventDefault();
			setWorkspace(next);
		};
		document.addEventListener("keydown", onKey);
		return () => document.removeEventListener("keydown", onKey);
	}, [env.frame]);

	// The split's Sheets sit at the inline end, and so does the Deck.
	useInspectorAvoid(
		phone
			? null
			: workspace.groups.length > 1 || reader.word
				? "inline-end"
				: null,
	);

	const toggleStack = (groupId: string) =>
		setStacked((now) => {
			const next = new Set(now);
			if (!next.delete(groupId)) next.add(groupId);
			return next;
		});
	const allStacked = workspace.groups.every((group) => stacked.has(group.id));

	const rootRef = useRef<HTMLDivElement>(null);
	const tabContent = (tab: Tab, active: boolean): ReactNode =>
		tab.kind === "reader" ? (
			<ReaderView
				active={active}
				onOpen={onReaderOpen}
				onState={setReader}
			/>
		) : (
			<SheetView tab={tab} nav={!phone} onGo={goIn(tab.id)} />
		);

	return (
		<div
			ref={rootRef}
			className="relative flex h-full flex-col bg-canvas text-ink"
		>
			<DemoInspector>
				<Explanation />
				<InspectorSection title="Reader kept">
					<dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
						<Readout label="On show">
							{readerOnShow ? "yes" : "no, hidden behind a tab"}
						</Readout>
						<Readout label="Scroll">{reader.scrollTop} px</Readout>
						<Readout label="Deck">
							{reader.word
								? `${reader.word}, ${reader.front ?? "dealing"} in front`
								: "closed"}
						</Readout>
						<Readout label="Sentence">
							<span lang="de" className="line-clamp-2">
								{reader.sentence ?? "none"}
							</span>
						</Readout>
						<Readout label="Returns">{switches}</Readout>
						<Readout label="Tab on show">
							<span lang="de">{titleOf(shown)}</span>
							{shown.kind === "sheet"
								? ` (${shown.at + 1}/${shown.trail.length})`
								: ""}
						</Readout>
						<Readout label="Last open">
							{lastOpen ?? "none yet"}
						</Readout>
					</dl>
				</InspectorSection>
				<InspectorSection title="Knobs">
					<InspectorCheck
						checked={settings.alwaysFocusNewTabs}
						onChange={(on) => setFocusParam(on ? null : "off")}
						title="Obsidian's Settings → Editor → Always focus new tabs: off, ⌘-click opens the tab in the background"
					>
						Always focus new tabs
					</InspectorCheck>
					<InspectorCheck
						checked={settings.modifiers}
						onChange={(on) => setModsParam(on ? null : "off")}
						title={`Off: ${mod}, ${mod}${alt} and a middle click open as a plain click does`}
					>
						Modifier clicks ({mod}, {mod}
						{alt}, middle)
					</InspectorCheck>
					<InspectorCheck
						checked={allStacked}
						onChange={(on) =>
							setStacked(
								on
									? new Set(
											workspace.groups.map(
												(group) => group.id,
											),
										)
									: new Set(),
							)
						}
						title="Every tab group's ⌄ → Stack tabs"
					>
						Stacked tabs
					</InspectorCheck>
					<InspectorChoice
						label="A plain click in the pinned reader opens"
						options={[
							{
								value: "visible",
								label: "Obsidian 1.3.4+",
								hint: "In a visible unpinned tab (the split's) when there is one, else a new tab",
							},
							{
								value: "new",
								label: "Always a new tab",
								hint: "The decision as first written",
							},
						]}
						value={settings.pinnedOpens}
						onChange={(picked) =>
							setPinnedParam(picked === "new" ? "new" : null)
						}
					/>
				</InspectorSection>
			</DemoInspector>

			<div className="relative flex min-h-0 flex-1">
				{workspace.groups.map((group, index) => {
					const hiddenOnPhone =
						phone && group.id !== focusedGroup?.id;
					const previous = workspace.groups[index - 1];
					return (
						<Fragment key={group.id}>
							{previous && !phone ? (
								<Divider
									root={rootRef}
									before={previous}
									after={group}
									onResize={(share) =>
										setWorkspace((now) =>
											resize(
												now,
												previous.id,
												group.id,
												share,
											),
										)
									}
								/>
							) : null}
							<GroupView
								group={group}
								phone={phone}
								hidden={hiddenOnPhone}
								focused={group.id === workspace.focused}
								stacked={!phone && stacked.has(group.id)}
								actions={actions}
								onFocus={() =>
									setWorkspace((now) =>
										focusGroup(now, group.id),
									)
								}
								onToggleStack={() => toggleStack(group.id)}
								onCloseAll={() =>
									setWorkspace((now) =>
										group.tabs.reduce(
											(acc, tab) => close(acc, tab.id),
											now,
										),
									)
								}
								content={tabContent}
							/>
						</Fragment>
					);
				})}
			</div>

			{phone ? (
				<>
					<PhoneNavBar
						tab={shown}
						count={tabsOf(workspace).length}
						onGo={goIn(shown.id)}
						onSwitcher={() => setSwitcher(true)}
					/>
					<TabSwitcher
						open={switcher}
						tabs={tabsOf(workspace)}
						activeId={shown.id}
						onPick={(tabId) => {
							setWorkspace((now) => activate(now, tabId));
							setSwitcher(false);
						}}
						onClose={(tabId) =>
							setWorkspace((now) => close(now, tabId))
						}
						onDismiss={() => setSwitcher(false)}
					/>
				</>
			) : null}

			<PreviewLayer settings={previewSettings} onFollow={follow} />
		</div>
	);
}

/**
 * One tab group: its tab bar over its panes. Every tab stays mounted;
 * the ones not on show are hidden with `visibility`, which keeps their
 * scroll, and made inert. Stacked, the panes sit side by side at
 * Obsidian's 700 px, each sticking by its spine as the group scrolls.
 */
function GroupView({
	group,
	phone,
	hidden,
	focused,
	stacked,
	actions,
	onFocus,
	onToggleStack,
	onCloseAll,
	content,
}: {
	readonly group: Group;
	readonly phone: boolean;
	/** On a phone, a group whose tab isn't on show. */
	readonly hidden: boolean;
	readonly focused: boolean;
	readonly stacked: boolean;
	readonly actions: TabActions;
	readonly onFocus: () => void;
	readonly onToggleStack: () => void;
	readonly onCloseAll: () => void;
	readonly content: (tab: Tab, active: boolean) => ReactNode;
}) {
	const { dir } = usePlaygroundEnv();
	const panesRef = useRef<HTMLDivElement>(null);
	const count = group.tabs.length;
	const activeIndex = group.tabs.findIndex((tab) => tab.id === group.active);

	// Stacked, the active pane slides into view beside the spines before it.
	useLayoutEffect(() => {
		const panes = panesRef.current;
		const first = panes?.firstElementChild;
		if (!stacked || !panes || !(first instanceof HTMLElement)) return;
		const offset =
			Math.max(0, activeIndex) * (first.offsetWidth - spineWidth);
		panes.scrollTo({
			left: dir === "rtl" ? -offset : offset,
			behavior: "auto",
		});
	}, [stacked, activeIndex, dir]);

	return (
		<section
			data-group-id={group.id}
			aria-label="Tab group"
			onPointerDownCapture={onFocus}
			style={
				hidden || phone
					? undefined
					: { flexGrow: group.size, flexBasis: 0 }
			}
			className={cn(
				"flex min-w-0 flex-col",
				phone && "flex-1",
				hidden && "invisible absolute inset-0",
			)}
			inert={hidden}
		>
			{phone ? null : (
				<TabBar
					group={group}
					focused={focused}
					stacked={stacked}
					onToggleStack={onToggleStack}
					onCloseAll={onCloseAll}
					actions={actions}
				/>
			)}
			<div
				ref={panesRef}
				className={cn(
					"relative min-h-0 flex-1",
					stacked && "flex overflow-x-auto overflow-y-hidden",
				)}
			>
				{group.tabs.map((tab, index) => {
					const active = tab.id === group.active;
					// Each pane sticks by its spine at both ends: at the start
					// it stops beside the spines before it; at the end only its
					// spine shows, before the spines after it.
					const width = `min(${stackedPaneWidth}px, 100% - ${(count - 1) * spineWidth}px)`;
					const style: CSSProperties | undefined = stacked
						? {
								insetInlineStart: index * spineWidth,
								insetInlineEnd: `calc(${(count - index) * spineWidth}px - ${width})`,
								width,
							}
						: undefined;
					return (
						<div
							key={tab.id}
							data-pane={tab.id}
							style={style}
							inert={!stacked && !active}
							className={cn(
								stacked
									? "sticky flex h-full shrink-0 bg-canvas shadow-[-6px_0_12px_-10px_oklch(0%_0_0/0.5)] rtl:shadow-[6px_0_12px_-10px_oklch(0%_0_0/0.5)]"
									: "absolute inset-0",
								!stacked && !active && "invisible",
							)}
						>
							{stacked ? (
								<Spine
									tab={tab}
									active={active}
									actions={actions}
								/>
							) : null}
							<div className="h-full min-w-0 flex-1">
								{content(tab, active && !hidden)}
							</div>
						</div>
					);
				})}
			</div>
		</section>
	);
}

/** The resizable line between two tab groups. */
function Divider({
	root,
	before,
	after,
	onResize,
}: {
	readonly root: RefObject<HTMLDivElement | null>;
	readonly before: Group;
	readonly after: Group;
	readonly onResize: (share: number) => void;
}) {
	const { dir } = usePlaygroundEnv();
	const [dragging, setDragging] = useState(false);
	const share = before.size / (before.size + after.size);
	const shareAt = (clientX: number) => {
		const first = root.current?.querySelector(
			`[data-group-id="${CSS.escape(before.id)}"]`,
		);
		const second = root.current?.querySelector(
			`[data-group-id="${CSS.escape(after.id)}"]`,
		);
		if (!first || !second) return null;
		const a = first.getBoundingClientRect();
		const b = second.getBoundingClientRect();
		const total = a.width + b.width;
		return dir === "rtl"
			? (a.right - clientX) / total
			: (clientX - a.left) / total;
	};
	return (
		// biome-ignore lint/a11y/useSemanticElements: a focusable window splitter is a separator with a value, which <hr> can't be
		<div
			role="separator"
			aria-orientation="vertical"
			aria-label="Resize the split"
			aria-valuemin={15}
			aria-valuemax={85}
			aria-valuenow={Math.round(share * 100)}
			tabIndex={0}
			onPointerDown={(event) => {
				if (event.button !== 0) return;
				event.currentTarget.setPointerCapture(event.pointerId);
				setDragging(true);
			}}
			onPointerMove={(event) => {
				if (!dragging) return;
				const next = shareAt(event.clientX);
				if (next !== null) onResize(next);
			}}
			onPointerUp={() => setDragging(false)}
			onPointerCancel={() => setDragging(false)}
			onKeyDown={(event) => {
				const step = event.shiftKey ? 0.1 : 0.03;
				const toward =
					event.key === "ArrowLeft"
						? -1
						: event.key === "ArrowRight"
							? 1
							: 0;
				if (toward === 0) return;
				event.preventDefault();
				onResize(share + step * toward * (dir === "rtl" ? -1 : 1));
			}}
			className="group/divider relative z-20 w-px shrink-0 cursor-col-resize touch-none bg-line outline-none"
		>
			<span
				className={cn(
					"absolute inset-y-0 -start-1 w-[9px] transition-colors group-hover/divider:bg-link/40 group-focus-visible/divider:bg-link/60",
					dragging && "bg-link/60",
				)}
			/>
		</div>
	);
}

function Readout({
	label,
	children,
}: {
	readonly label: string;
	readonly children: ReactNode;
}) {
	return (
		<>
			<dt className="text-ink-muted">{label}</dt>
			<dd className="min-w-0 font-mono text-ink tabular-nums">
				{children}
			</dd>
		</>
	);
}

/** What an open did, in words, from the workspace before and after it. */
function describeOpen(
	before: Workspace,
	after: Workspace,
	sourceId: string,
	word: string,
	how: OpenHow,
): string {
	const click =
		how === "here"
			? "Click"
			: how === "tab"
				? `${mod}-click`
				: how === "split"
					? `${mod}${alt}-click`
					: `${mod}${alt}${shift}-click`;
	const from = sourceId === readerTab.id ? "in the reader" : "in a Sheet";
	const result =
		after.groups.length > before.groups.length
			? "a new split at the inline end"
			: tabsOf(after).length > tabsOf(before).length
				? activeTab(after).id === activeTab(before).id
					? "a new tab in the background"
					: "a new tab, focused"
				: activeTab(after).id === sourceId
					? "navigated in place"
					: "the split's Sheet, navigated";
	return `${click} ${from} on ${word} → ${result}`;
}

function Explanation() {
	return (
		<>
			<InspectorSection>
				<InspectorTry>
					<p>
						Obsidian's tabs, copied rule for rule, with the reader
						as a tab pinned first. A link in a Card opens a Sheet
						tab, so the reader never navigates: switch back and its
						scroll, Deck and sentence are where you left them.
					</p>
				</InspectorTry>
			</InspectorSection>
			<InspectorSection title="Try">
				<InspectorTry>
					<p>
						Click <i>ging</i>, scroll the text a little, then click{" "}
						<i>gehen</i> in the Card: a Sheet tab opens. Click{" "}
						<i>Reader</i>: nothing moved.
					</p>
					<p>
						<i>{mod}-click</i> a word in the Card: a tab opens
						behind (with "Always focus new tabs" off).{" "}
						<i>
							{mod}
							{alt}-click
						</i>{" "}
						one: a split opens at the inline end; drag the line
						between them.
					</p>
					<p>
						In a Sheet, a click navigates in place; back, forward
						and the trail walk it. Drag tabs to reorder them (the
						reader stays first); × or a middle click closes one.
					</p>
					<p>
						Hold {mod} and rest on a link for a preview, as in the
						hover-preview demo.
					</p>
				</InspectorTry>
			</InspectorSection>
			<InspectorSection title="Keys">
				<InspectorTry>
					<p>
						{alt}W closes the tab and {alt}
						{shift}T reopens it, standing in for Obsidian's {mod}W
						and {mod}
						{shift}T, which the browser keeps. {mod}
						{alt}← and → go back and forward; Ctrl+Tab cycles tabs;{" "}
						{mod}1–8 picks one and {mod}9 the last.
					</p>
				</InspectorTry>
			</InspectorSection>
			<InspectorSection title="Obsidian's rules">
				<InspectorTry>
					<p>
						{mod}-click or middle click: a new tab. {mod}
						{alt}: a new tab group to the right. {mod}
						{alt}
						{shift}: a window (here a tab). [obsidian.d.ts,
						Keymap.isModEvent; help: Tabs]
					</p>
					<p>
						"Always focus new tabs" off: a {mod}-click tab opens in
						the background. [help: Settings] Its default is
						unverified; here it starts on.
					</p>
					<p>
						A link in a pinned tab opens in a visible unpinned tab,
						or a new one, focused even with that setting off.
						[changelog 1.3.4; forum 96359]
					</p>
					<p>
						Closing the active tab shows its right neighbour.
						[1.10.0] Each tab has its own history; a new tab starts
						with none, and a reopened tab comes back without it.
						[1.0.0; forum]
					</p>
					<p>
						Phone: no tab bar and no splits; the tab count opens a
						switcher of bordered previews, swipe one to close it.
						[mobile 1.7.4, 1.13.5; help: Mobile app]
					</p>
				</InspectorTry>
			</InspectorSection>
			<InspectorSection title="Not Obsidian's">
				<InspectorTry>
					<p>
						The reader can't be unpinned, closed or moved from first
						place; Obsidian closes a pinned tab with {mod}W. There
						is no + new tab, and no dragging a tab into another
						group.
					</p>
				</InspectorTry>
			</InspectorSection>
		</>
	);
}
