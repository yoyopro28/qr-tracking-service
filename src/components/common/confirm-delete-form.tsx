"use client";

import { useFormStatus } from "react-dom";

type ConfirmDeleteFormProps = {
  action: (formData: FormData) => Promise<void> | void;
  confirmMessage: string;
  label?: string;
};

function DeleteButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button className="dangerButton" type="submit" disabled={pending}>
      {pending ? "Deleting..." : label}
    </button>
  );
}

export function ConfirmDeleteForm({
  action,
  confirmMessage,
  label = "Delete",
}: ConfirmDeleteFormProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      <DeleteButton label={label} />
    </form>
  );
}
