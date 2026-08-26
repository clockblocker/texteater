import { RotateCcwIcon } from "lucide-react";
import { useEffect, useState } from "react";

import { CardSheetWorkspace } from "@/workspace/card-sheet-workspace";
import {
	createSheetWorkspaceFixture,
	renderFixtureCardTail,
	renderFixtureSubject,
} from "./sheet-workspace-fixtures";
import "./sheet-workspace.css";

export function SheetWorkspaceRoute() {
	const [fixtureRevision, setFixtureRevision] = useState(0);
	useEffect(() => {
		const root = document.documentElement;
		const alreadyDark = root.classList.contains("dark");
		root.classList.add("dark");
		return () => {
			if (!alreadyDark) root.classList.remove("dark");
		};
	}, []);

	return (
		<section
			aria-label="Card and Sheet workspace playground"
			className="sheet-workspace-page dark"
		>
			<header className="sheet-workspace-controls">
				<div>
					<p>Reusable workspace</p>
					<h1>Card Layers and Sheets</h1>
				</div>
				<button
					onClick={() =>
						setFixtureRevision((revision) => revision + 1)
					}
					type="button"
				>
					<RotateCcwIcon />
					Reset fixture
				</button>
			</header>
			<div className="sheet-workspace-host">
				<CardSheetWorkspace
					initialWorkspace={createSheetWorkspaceFixture()}
					key={fixtureRevision}
					renderCardTail={renderFixtureCardTail}
					renderSubject={renderFixtureSubject}
				/>
			</div>
		</section>
	);
}
