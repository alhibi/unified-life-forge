import { z } from "zod";

import { AlBayanAnalysisResultSchema } from "../types/bayan";

export const BayanInputSchema = z.object({
  text: z.string()
    .min(2, { message: "يجب أن يكون النص المدخل حرفين على الأقل للتحليل" })
    .max(1000, { message: "الحد الأقصى للتحليل اللغوي الفوري هو 1000 حرف لتجنب إجهاد خادم التحليل" }),
  analysisType: z.enum(["full", "syntax_only", "arood_only", "morphology_only", "rhetoric_only"])
    .default("full"),
});

export type BayanInput = z.infer<typeof BayanInputSchema>;

export const BayanSaveBookmarkSchema = z.object({
  id: z.string(),
  title: z.string().min(1, { message: "العنوان مطلوب لحفظ التحليل" }),
  result: AlBayanAnalysisResultSchema,
  savedAt: z.string(),
});

export type BayanSaveBookmark = z.infer<typeof BayanSaveBookmarkSchema>;
