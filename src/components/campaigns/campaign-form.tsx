"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { CampaignActionState } from "@/app/campaigns/actions";

type CampaignFormProps = {
  action: (state: CampaignActionState, formData: FormData) => Promise<CampaignActionState>;
  initialState: CampaignActionState;
  submitLabel: string;
  title: string;
  description: string;
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button className="button" type="submit" disabled={pending}>
      {pending ? "Saving..." : label}
    </button>
  );
}

function FieldError({ errors, id }: { errors?: string[]; id: string }) {
  if (!errors?.length) {
    return null;
  }

  return (
    <p id={id} className="fieldError">
      {errors[0]}
    </p>
  );
}

export function CampaignForm({
  action,
  initialState,
  submitLabel,
  title,
  description,
}: CampaignFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <section className="panel">
      <div className="sectionHeader">
        <div>
          <h2>{title}</h2>
          <p className="sectionCopy">{description}</p>
        </div>
      </div>

      <form action={formAction} className="stackForm">
        <label className="field">
          <span className="fieldLabel">Campaign name</span>
          <input
            className="input"
            type="text"
            name="name"
            required
            maxLength={120}
            defaultValue={state.values.name}
            placeholder="Spring flyer push"
            aria-invalid={Boolean(state.fieldErrors?.name)}
            aria-describedby={state.fieldErrors?.name ? "campaign-name-error" : undefined}
          />
          <FieldError id="campaign-name-error" errors={state.fieldErrors?.name} />
        </label>

        <label className="field">
          <span className="fieldLabel">Target URL</span>
          <input
            className="input"
            type="url"
            name="destinationUrl"
            required
            inputMode="url"
            defaultValue={state.values.destinationUrl}
            placeholder="https://example.com/offer"
            aria-invalid={Boolean(state.fieldErrors?.destinationUrl)}
            aria-describedby={
              state.fieldErrors?.destinationUrl ? "campaign-url-error" : undefined
            }
          />
          <FieldError
            id="campaign-url-error"
            errors={state.fieldErrors?.destinationUrl}
          />
        </label>

        {state.formError ? <p className="formError">{state.formError}</p> : null}

        <div className="formActions">
          <SubmitButton label={submitLabel} />
        </div>
      </form>
    </section>
  );
}
