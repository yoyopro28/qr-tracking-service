"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { TemplateActionState } from "@/app/campaigns/[campaignId]/template-actions";

type TemplateUploadFormProps = {
  action: (state: TemplateActionState, formData: FormData) => Promise<TemplateActionState>;
  initialState: TemplateActionState;
};

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button className="button" type="submit" disabled={pending}>
      {pending ? "Uploading..." : "Upload template"}
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

export function TemplateUploadForm({
  action,
  initialState,
}: TemplateUploadFormProps) {
  const [state, formAction] = useActionState(action, initialState);

  return (
    <section className="panel">
      <div className="sectionHeader">
        <div>
          <h2>Upload template</h2>
          <p className="sectionCopy">
            Upload one PDF and store the first MVP QR placement definition with it.
          </p>
        </div>
      </div>

      <form action={formAction} className="stackForm" encType="multipart/form-data">
        <label className="field">
          <span className="fieldLabel">Template PDF</span>
          <input
            className="input fileInput"
            type="file"
            name="templateFile"
            accept="application/pdf,.pdf"
            required
            aria-invalid={Boolean(state.fieldErrors?.templateFile)}
            aria-describedby={state.fieldErrors?.templateFile ? "template-file-error" : undefined}
          />
          <FieldError id="template-file-error" errors={state.fieldErrors?.templateFile} />
        </label>

        <div className="fieldGrid">
          <label className="field">
            <span className="fieldLabel">QR page number</span>
            <input
              className="input"
              type="number"
              name="qrPageNumber"
              min="1"
              step="1"
              required
              defaultValue={state.values.qrPageNumber}
              aria-invalid={Boolean(state.fieldErrors?.qrPageNumber)}
              aria-describedby={
                state.fieldErrors?.qrPageNumber ? "template-qr-page-error" : undefined
              }
            />
            <FieldError id="template-qr-page-error" errors={state.fieldErrors?.qrPageNumber} />
          </label>

          <label className="field">
            <span className="fieldLabel">QR X</span>
            <input
              className="input"
              type="number"
              name="qrX"
              min="0"
              step="0.01"
              required
              defaultValue={state.values.qrX}
              placeholder="32"
              aria-invalid={Boolean(state.fieldErrors?.qrX)}
              aria-describedby={state.fieldErrors?.qrX ? "template-qr-x-error" : undefined}
            />
            <FieldError id="template-qr-x-error" errors={state.fieldErrors?.qrX} />
          </label>

          <label className="field">
            <span className="fieldLabel">QR Y</span>
            <input
              className="input"
              type="number"
              name="qrY"
              min="0"
              step="0.01"
              required
              defaultValue={state.values.qrY}
              placeholder="48"
              aria-invalid={Boolean(state.fieldErrors?.qrY)}
              aria-describedby={state.fieldErrors?.qrY ? "template-qr-y-error" : undefined}
            />
            <FieldError id="template-qr-y-error" errors={state.fieldErrors?.qrY} />
          </label>

          <label className="field">
            <span className="fieldLabel">QR width</span>
            <input
              className="input"
              type="number"
              name="qrWidth"
              min="0"
              step="0.01"
              required
              defaultValue={state.values.qrWidth}
              placeholder="120"
              aria-invalid={Boolean(state.fieldErrors?.qrWidth)}
              aria-describedby={
                state.fieldErrors?.qrWidth ? "template-qr-width-error" : undefined
              }
            />
            <FieldError id="template-qr-width-error" errors={state.fieldErrors?.qrWidth} />
          </label>

          <label className="field">
            <span className="fieldLabel">QR height</span>
            <input
              className="input"
              type="number"
              name="qrHeight"
              min="0"
              step="0.01"
              required
              defaultValue={state.values.qrHeight}
              placeholder="120"
              aria-invalid={Boolean(state.fieldErrors?.qrHeight)}
              aria-describedby={
                state.fieldErrors?.qrHeight ? "template-qr-height-error" : undefined
              }
            />
            <FieldError id="template-qr-height-error" errors={state.fieldErrors?.qrHeight} />
          </label>
        </div>

        <label className="checkboxField">
          <input
            type="checkbox"
            name="shortTextEnabled"
            defaultChecked={state.values.shortTextEnabled}
          />
          <span>Enable short text label under the QR code</span>
        </label>

        <div className="fieldGrid">
          <label className="field">
            <span className="fieldLabel">Short text X offset</span>
            <input
              className="input"
              type="number"
              name="shortTextOffsetX"
              min="0"
              step="0.01"
              defaultValue={state.values.shortTextOffsetX}
              placeholder="0"
              aria-invalid={Boolean(state.fieldErrors?.shortTextOffsetX)}
              aria-describedby={
                state.fieldErrors?.shortTextOffsetX ? "template-text-x-error" : undefined
              }
            />
            <FieldError
              id="template-text-x-error"
              errors={state.fieldErrors?.shortTextOffsetX}
            />
          </label>

          <label className="field">
            <span className="fieldLabel">Short text Y offset</span>
            <input
              className="input"
              type="number"
              name="shortTextOffsetY"
              min="0"
              step="0.01"
              defaultValue={state.values.shortTextOffsetY}
              placeholder="16"
              aria-invalid={Boolean(state.fieldErrors?.shortTextOffsetY)}
              aria-describedby={
                state.fieldErrors?.shortTextOffsetY ? "template-text-y-error" : undefined
              }
            />
            <FieldError
              id="template-text-y-error"
              errors={state.fieldErrors?.shortTextOffsetY}
            />
          </label>
        </div>

        {state.formError ? <p className="formError">{state.formError}</p> : null}

        <div className="formActions">
          <SubmitButton />
        </div>
      </form>
    </section>
  );
}
