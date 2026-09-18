import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import type { WorkspaceProps } from "react-resizable-panels/workspace";
import { Harness } from "../../../react-resizable-panels/e2e/harness/harness";
import { Workspace } from "../../src/molecules/workspace";
import "../../src/styles.css";
import "../../../react-resizable-panels/e2e/harness/harness.css";

const root = document.getElementById("root");
if (!root) throw new Error("The #root element is required.");
const params = new URLSearchParams(window.location.search);

function TestWorkspace<S>(props: WorkspaceProps<S>) {
	return (
		<Workspace
			{...props}
			className={params.has("overrides") ? "text-lg" : undefined}
			classNames={
				params.has("overrides")
					? {
							card: "bg-raised text-lg",
							drag: "bg-raised text-lg",
						}
					: undefined
			}
		/>
	);
}

createRoot(root).render(
	<StrictMode>
		{params.has("empty") ? (
			<p>No workspace is mounted on this page.</p>
		) : (
			<Harness WorkspaceComponent={TestWorkspace} />
		)}
	</StrictMode>,
);
