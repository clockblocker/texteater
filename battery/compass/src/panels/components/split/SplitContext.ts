import { createContext } from "react";
import type { SplitContextType } from "./types";

export const SplitContext = createContext<SplitContextType | null>(null);
