"use client";

import type { ChangeEvent } from "react";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import type { TemplateActionState } from "@/app/campaigns/[campaignId]/template-actions";
import { TemplatePlacementPanel } from "./template-placement-panel";
import {
  DEFAULT_PAGE_HEIGHT,
  DEFAULT_PAGE_WIDTH,
  parsePdfMetadata,
  type PreviewMetadata,
} from "./template-preview-metadata";

type TemplateUploadFormProps = {
  action: (state: TemplateActionState, formData: FormData) => Promise<TemplateActionState>;
  initialState: TemplateActionState;
};

type PlacementValues = TemplateActionState["values"];

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

function rewritePlacementPageNumbers(rawPlacements: string, pageNumber: string) {
  if (!rawPlacements.trim()) {
    return rawPlacements;
  }

  try {
    const placements = JSON.parse(rawPlacements) as unknown;

    if (!Array.isArray(placements)) {
      return rawPlacements;
    }

    return JSON.stringify(
      placements.map((placement) =>
        placement && typeof placement === "object"
          ? {
              ...(placement as Record<string, unknown>),
              pageNumber,
            }
          : placement,
      ),
    );
  } catch {
    return rawPlacements;
  }
}

export function TemplateUploadForm({
  action,
  initialState,
}: TemplateUploadFormProps) {
  const [state, formAction] = useActionState(action, initialState);
  const [values, setValues] = useState<PlacementValues>(initialState.values);
  const [documentSrc, setDocumentSrc] = useState<string | null>(null);
  const [previewMetadata, setPreviewMetadata] = useState<PreviewMetadata>({
    pageCount: 1,
    width: null,
    height: null,
  });

  const previousDocumentSrcRef = useRef<string | null>(null);

  useEffect(() => {
    setValues(state.values);
  }, [state.values]);

  useEffect(() => {
    return () => {
      if (previousDocumentSrcRef.current) {
        URL.revokeObjectURL(previousDocumentSrcRef.current);
      }
    };
  }, []);

  const pageWidth = previewMetadata.width ?? DEFAULT_PAGE_WIDTH;
  const pageHeight = previewMetadata.height ?? DEFAULT_PAGE_HEIGHT;
  const pageCount = previewMetadata.pageCount;

  const previewPageNumber = useMemo(() => {
    const parsed = Number.parseInt(values.qrPageNumber, 10);

    if (!Number.isInteger(parsed) || parsed <= 0) {
      return 1;
    }

    return pageCount ? Math.min(parsed, pageCount) : parsed;
  }, [pageCount, values.qrPageNumber]);

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file) {
      if (previousDocumentSrcRef.current) {
        URL.revokeObjectURL(previousDocumentSrcRef.current);
        previousDocumentSrcRef.current = null;
      }

      setDocumentSrc(null);
      setPreviewMetadata({
        pageCount: 1,
        width: null,
        height: null,
      });
      return;
    }

    const nextDocumentSrc = URL.createObjectURL(file);

    if (previousDocumentSrcRef.current) {
      URL.revokeObjectURL(previousDocumentSrcRef.current);
    }

    previousDocumentSrcRef.current = nextDocumentSrc;
    setDocumentSrc(nextDocumentSrc);
    setPreviewMetadata(parsePdfMetadata(await file.arrayBuffer()));
  }

  function handleValueChange(
    event: ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) {
    const { name } = event.target;
    const nextValue =
      event.target instanceof HTMLInputElement && event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;

    setValues((currentValues) => {
      const nextValues = {
        ...currentValues,
        [name]: nextValue,
      };

      if (name === "qrPageNumber" && typeof nextValue === "string") {
        nextValues.qrPlacements = rewritePlacementPageNumbers(
          currentValues.qrPlacements,
          nextValue,
        );
      }

      return nextValues;
    });
  }

  function handlePlacementChange(nextValues: Partial<PlacementValues>) {
    setValues((currentValues) => ({
      ...currentValues,
      ...nextValues,
    }));
  }

  return (
    <section className="panel">
      <div className="sectionHeader">
        <div>
          <h2>Upload template</h2>
          <p className="sectionCopy">
            Upload one PDF, preview it, and mark the QR placement area before saving.
          </p>
        </div>
      </div>

      <form action={formAction} className="stackForm">
        <label className="field">
          <span className="fieldLabel">Template PDF</span>
          <input
            className="input fileInput"
            type="file"
            name="templateFile"
            accept="application/pdf,.pdf"
            required
            onChange={handleFileChange}
            aria-invalid={Boolean(state.fieldErrors?.templateFile)}
            aria-describedby={state.fieldErrors?.templateFile ? "template-file-error" : undefined}
          />
          <FieldError id="template-file-error" errors={state.fieldErrors?.templateFile} />
        </label>

        <TemplatePlacementPanel
          documentSrc={documentSrc}
          pageNumber={previewPageNumber}
          pageCount={pageCount}
          pageWidth={pageWidth}
          pageHeight={pageHeight}
          values={values}
          onPlacementChange={handlePlacementChange}
        />
        <input type="hidden" name="qrPlacements" value={values.qrPlacements} />
        <input type="hidden" name="qrX" value={values.qrX} />
        <input type="hidden" name="qrY" value={values.qrY} />
        <input type="hidden" name="qrWidth" value={values.qrWidth} />
        <input type="hidden" name="qrHeight" value={values.qrHeight} />
        <FieldError
          id="template-qr-placements-error"
          errors={
            state.fieldErrors?.qrPlacements ??
            state.fieldErrors?.qrX ??
            state.fieldErrors?.qrY ??
            state.fieldErrors?.qrWidth ??
            state.fieldErrors?.qrHeight
          }
        />

        <div className="fieldGrid">
          <label className="field">
            <span className="fieldLabel">QR page number</span>
            <input
              className="input"
              type="number"
              name="qrPageNumber"
              min="1"
              max={pageCount}
              step="1"
              required
              value={values.qrPageNumber}
              onChange={handleValueChange}
              aria-invalid={Boolean(state.fieldErrors?.qrPageNumber)}
              aria-describedby={
                state.fieldErrors?.qrPageNumber ? "template-qr-page-error" : undefined
              }
            />
            <FieldError id="template-qr-page-error" errors={state.fieldErrors?.qrPageNumber} />
          </label>

          <div className="placementHintCard">
            <strong>Placement workflow</strong>
            <p>
              Add one placeholder per printed flyer area. Each placeholder receives its
              own unique QR code when flyers are generated.
            </p>
          </div>
        </div>

        <label className="checkboxField">
          <input
            type="checkbox"
            name="shortTextEnabled"
            checked={values.shortTextEnabled}
            onChange={handleValueChange}
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
              value={values.shortTextOffsetX}
              onChange={handleValueChange}
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
              value={values.shortTextOffsetY}
              onChange={handleValueChange}
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
