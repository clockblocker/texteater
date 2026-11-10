import { make as makeScopedAtom } from "@effect/atom-react";
import { QueryClientProvider } from "@tanstack/react-query";
import { createWorkspace, workspaceReducer } from "compass";
import { ConvexProvider } from "convex/react";
import * as Atom from "effect/reactivity/Atom";
import { useMemo } from "react";
import { LIBRARY, MENU } from "@/workspace/application-menu";
import { applicationRenderer } from "@/workspace/application-renderer";
import { Compass } from "@/workspace/compass/compass";
import { GroundList } from "@/workspace/compass/pane-chrome";
import type { MenuItemView } from "@/workspace/compass/subject";
import { useCompassWorkspace } from "@/workspace/compass/use-compass-workspace";
import {
	type WorkspaceSubject,
	workspaceSubjectFor,
} from "@/workspace/workspace-subject";
import type { FakeConvex } from "./fake-convex";
import { STORY_SCROLL_ID, STORY_SCROLL_TITLE } from "./story-notes";

/**
 * Today: the flow as the app plays it now. The Compass, the Scroll, the
 * click's selection, the step Notes and the stored Notes are the app's own
 * code, on a Convex backend that lives in the page (`fake-convex.ts`), so
 * every Card is dealt at the moment the app deals it.
 */

const STORY_SCROLL = workspaceSubjectFor({
	kind: "Scroll",
	scrollId: STORY_SCROLL_ID,
	title: STORY_SCROLL_TITLE,
});

/** One Rooted Pane whose Ground is the stories' Scroll. */
function todayWorkspace() {
	const fresh = createWorkspace<WorkspaceSubject>();
	const paneId = fresh.activePaneId;
	return [
		{ kind: "MenuItem" as const, item: LIBRARY },
		{ kind: "Sheet" as const, subject: STORY_SCROLL },
	].reduce(
		(state, to) => workspaceReducer(state, { type: "StepUp", paneId, to }),
		fresh,
	);
}

/** A stage's own workspace; nothing persists it. */
const todayWorkspaceAtom = makeScopedAtom((_: null) =>
	Atom.make(todayWorkspace()),
);

export function TodayStage({
	backend,
	durationScale,
}: {
	readonly backend: FakeConvex;
	/** Slow-mo: how many times longer every move of the renderer takes. */
	readonly durationScale: number;
}) {
	return (
		<ConvexProvider client={backend.convex}>
			<QueryClientProvider client={backend.queryClient}>
				<todayWorkspaceAtom.Provider value={null}>
					<TodayCompass durationScale={durationScale} />
				</todayWorkspaceAtom.Provider>
			</QueryClientProvider>
		</ConvexProvider>
	);
}

function TodayCompass({ durationScale }: { readonly durationScale: number }) {
	const workspace = useCompassWorkspace(todayWorkspaceAtom.use());
	const motion = useMemo(() => ({ durationScale }), [durationScale]);
	return (
		<Compass
			workspace={workspace}
			renderer={applicationRenderer}
			menu={MENU}
			renderMenuItem={renderMenuItem}
			motion={motion}
		/>
	);
}

function renderMenuItem(item: string, view: MenuItemView<WorkspaceSubject>) {
	return item === LIBRARY ? (
		<GroundList
			title="Library"
			items={[{ key: STORY_SCROLL_ID, label: STORY_SCROLL_TITLE }]}
			onPick={() => view.select(STORY_SCROLL)}
		/>
	) : null;
}
