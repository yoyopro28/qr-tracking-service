"use client";

import { useFormStatus } from "react-dom";

type ConfirmActionFormProps = {
  action: (formData: FormData) => Promise<void> | void;
  confirmMessage: string;
  label: string;
  pendingLabel: string;
  danger?: boolean;
};

function ActionButton({
  label,
  pendingLabel,
  danger,
}: {
  label: string;
  pendingLabel: string;
  danger: boolean;
}) {
  const { pending } = useFormStatus();

  return (
    <button className={danger ? "dangerButton" : "textButton"} type="submit" disabled={pending}>
      {pending ? pendingLabel : label}
    </button>
  );
}

export function ConfirmActionForm({
  action,
  confirmMessage,
  label,
  pendingLabel,
  danger = false,
}: ConfirmActionFormProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <ActionButton label={label} pendingLabel={pendingLabel} danger={danger} />
    </form>
  );
}
