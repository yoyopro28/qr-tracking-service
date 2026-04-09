import type { FlyerGenerationActionState } from "@/app/campaigns/[campaignId]/flyer-actions";

export const emptyFlyerGenerationActionState: FlyerGenerationActionState = {
  values: {
    templateId: "",
    quantity: "10",
  },
};
