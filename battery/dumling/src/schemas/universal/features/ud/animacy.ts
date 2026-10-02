import { z } from "zod";

// Source: https://universaldependencies.org/u/feat/Animacy.html
export const AnimacySchema = z.enum(["Anim", "Hum", "Inan", "Nhum"]);
