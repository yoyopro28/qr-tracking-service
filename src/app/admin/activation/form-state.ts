import type { ActivationActionState } from "@/app/admin/activation/actions";

export const emptyActivationActionState: ActivationActionState = {
  values: {
    locationId: "",
    newLocationName: "",
  },
};
