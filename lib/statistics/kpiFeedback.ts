import { z } from "zod";

export type KpiDeliveryMode = "feedback" | "kpis-only";

const metric = (maximum: number) => z.preprocess((value) => {
  if (typeof value !== "string") return value;
  const text = value.trim().replace(/%$/, "").trim().replace(",", ".");
  return text !== "" && /^\d+(?:\.\d+)?$/.test(text) ? Number(text) : NaN;
}, z.number().finite().min(0).max(maximum));

export const kpiDeliverySchema = z.object({
  deliveryMode: z.enum(["feedback", "kpis-only"]).default("feedback"),
  feedbackItems: z.array(z.object({
    user_id: z.string().uuid(),
    mc_et: metric(999.9),
    vl_value: metric(100),
    tma: metric(100),
    feedback_text: z.string().max(20_000).optional(),
    magic_touch: z.string().max(100).nullable().optional(),
  })).min(1).max(500),
}).superRefine((delivery, context) => {
  if (delivery.deliveryMode === "feedback") {
    delivery.feedbackItems.forEach((item, index) => {
      if (!item.feedback_text?.trim()) {
        context.addIssue({ code: z.ZodIssueCode.custom, path: ["feedbackItems", index, "feedback_text"], message: "Nachricht fehlt. Nutze Senden ohne Nachricht für reine KPIs." });
      }
    });
  }
});

export function toKpiFeedbackRecords(delivery: z.infer<typeof kpiDeliverySchema>) {
  return delivery.feedbackItems.map((item) => ({
    user_id: item.user_id,
    mc_et: item.mc_et,
    vl_value: item.vl_value,
    tma: item.tma,
    feedback_text: delivery.deliveryMode === "kpis-only" ? "" : item.feedback_text!.trim(),
    magic_touch: delivery.deliveryMode === "kpis-only" ? null : item.magic_touch || null,
    read: false,
  }));
}

export interface KpiFeedbackRecord {
  id: string;
  user_id: string;
  mc_et: number;
  vl_value: number;
  tma: number;
  feedback_text: string;
  magic_touch: string | null;
  read: boolean;
  created_at: string;
  wave_month?: string | null;
  premium_amount?: number | null;
}
