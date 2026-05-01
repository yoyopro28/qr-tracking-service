"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { FlyerGenerationActionState } from "@/app/campaigns/[campaignId]/flyer-actions";

type FlyerGenerationFormProps = {
  action: (
    state: FlyerGenerationActionState,
    formData: FormData,
  ) => Promise<FlyerGenerationActionState>;
  initialState: FlyerGenerationActionState;
  templates: Array<{
    id: string;
    originalFilename: string;
  }>;
};

function SubmitButton({ disabled }: { disabled: boolean }) {
  const { pending } = useFormStatus();

  return (
    <button className="button" type="submit" disabled={disabled || pending}>
      {pending ? "Generating..." : "Generate flyers"}
    </button>
  );
}

function FieldError({ id, errors }: { id: string; errors?: string[] }) {
  if (!errors?.length) {
    return null;
  }

  return (
    <p id={id} className="fieldError">
      {errors[0]}
    </p>
  );
}

export function FlyerGenerationForm({
  action,
  initialState,
  templates,
}: FlyerGenerationFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const hasTemplates = templates.length > 0;

  return (
    <section className="panel">
      <div className="sectionHeader">
        <div>
          <h2>Generate flyers</h2>
          <p className="sectionCopy">
            Pick a template and create one unique shortcode per printed flyer area.
            Multi-up templates fill their QR placeholders in order.
          </p>
        </div>
      </div>

      {hasTemplates ? (
        <form action={formAction} className="stackForm">
          <label className="field">
            <span className="fieldLabel">Template</span>
            <select
              className="input"
              name="templateId"
              required
              defaultValue={state.values.templateId}
              aria-invalid={Boolean(state.fieldErrors?.templateId)}
              aria-describedby={
                state.fieldErrors?.templateId ? "flyer-template-error" : undefined
              }
            >
              <option value="">Select a template</option>
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.originalFilename}
                </option>
              ))}
            </select>
            <FieldError id="flyer-template-error" errors={state.fieldErrors?.templateId} />
          </label>

          <label className="field">
            <span className="fieldLabel">Quantity</span>
            <input
              className="input"
              type="number"
              name="quantity"
              min="1"
              max="250"
              step="1"
              required
              defaultValue={state.values.quantity}
              aria-invalid={Boolean(state.fieldErrors?.quantity)}
              aria-describedby={
                state.fieldErrors?.quantity ? "flyer-quantity-error" : undefined
              }
            />
            <FieldError id="flyer-quantity-error" errors={state.fieldErrors?.quantity} />
          </label>

          {state.formError ? <p className="formError">{state.formError}</p> : null}

          <div className="formActions">
            <SubmitButton disabled={!hasTemplates} />
          </div>
        </form>
      ) : (
        <div className="emptyState">
          <h3>No template available yet</h3>
          <p>Upload a template first so flyer generation has a PDF source to attach to.</p>
        </div>
      )}
    </section>
  );
}
