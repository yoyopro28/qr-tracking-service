import type { TemplateActionState } from "@/app/campaigns/[campaignId]/template-actions";

export const emptyTemplateActionState: TemplateActionState = {
  values: {
    qrPageNumber: "1",
    qrX: "",
    qrY: "",
    qrWidth: "",
    qrHeight: "",
    shortTextEnabled: false,
    shortTextOffsetX: "",
    shortTextOffsetY: "",
  },
};
