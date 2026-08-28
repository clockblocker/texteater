import { CardSheetWorkspace } from "@/workspace/card-sheet-workspace";
import { WorkspaceProvider } from "@/workspace/workspace-controller";
import {
	createSheetWorkspaceFixture,
	renderFixtureCardTail,
	renderFixtureSubject,
} from "./sheet-workspace-fixtures";

export function SheetWorkspacePlayground() {
	return (
		<WorkspaceProvider
			initialWorkspace={createSheetWorkspaceFixture()}
			storage={null}
		>
			<div className="playground-specimen__workspace">
				<CardSheetWorkspace
					navigationAnchor={<FixtureNavigationAnchor />}
					renderCardTail={renderFixtureCardTail}
					renderSubject={renderFixtureSubject}
				/>
			</div>
		</WorkspaceProvider>
	);
}

function FixtureNavigationAnchor() {
	return (
		<div className="playground-fixture-anchor">
			<span className="playground-fixture-anchor__label">Empty pane</span>
			<strong className="playground-fixture-anchor__title">
				Drop a card or sheet here
			</strong>
		</div>
	);
}
