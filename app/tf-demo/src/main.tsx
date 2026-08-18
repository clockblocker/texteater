import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";

import "./index.css";
import { AppProvider } from "@/components/app-provider";
import App from "./App";

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("The #root element is required to mount tf-demo.");
}

createRoot(rootElement).render(
	<StrictMode>
		<BrowserRouter>
			<AppProvider>
				<App />
			</AppProvider>
		</BrowserRouter>
	</StrictMode>,
);
