import { initializeTheme } from "lego";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { initializeMotionPreference } from "@/lib/motion-preference-storage";

import "./index.css";

if (import.meta.env.DEV && import.meta.env.VITE_TF_MOUSE_TRACE === "1") {
	const { startMouseTrace } = await import("./devtools/mouse-trace");
	const stopMouseTrace = startMouseTrace();
	import.meta.hot?.dispose(stopMouseTrace);
}

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("The #root element is required to mount tf-demo.");
}

initializeTheme({ defaultTheme: "dark", storageKey: "tf-demo-theme" });
initializeMotionPreference();

// The path is the workspace's Address (tf-demo ADR 0015), or in development
// a Playground page; the workspace reads it once the app loads, and spells
// its own back into it. Nothing lives in the query or the hash. Scroll
// positions belong to the Sheets, never to an entry.
window.history.scrollRestoration = "manual";
if (window.location.search !== "" || window.location.hash !== "") {
	window.history.replaceState(
		window.history.state,
		"",
		window.location.pathname,
	);
}

const root = createRoot(rootElement);
void Promise.all([import("./App"), import("@/components/app-provider")]).then(
	([{ default: App }, { AppProvider }]) => {
		root.render(
			<StrictMode>
				<AppProvider>
					<App />
				</AppProvider>
			</StrictMode>,
		);
	},
);
