import type { CampaignActionState } from "@/app/campaigns/actions";

export const emptyCampaignActionState: CampaignActionState = {
  values: {
    name: "",
    destinationUrl: "",
  },
};
