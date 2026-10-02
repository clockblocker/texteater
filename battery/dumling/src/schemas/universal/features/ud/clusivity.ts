import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/Clusivity.html
export const ClusivitySchema = z.enum(["Ex", "In"]);
