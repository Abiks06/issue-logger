"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  onConfirm: () => void | Promise<void>;
  title: string;
  description: React.ReactNode;
  confirmLabel?: string;
  /** If set, the user must type this text to enable the confirm button. */
  confirmText?: string;
  className?: string;
  disabled?: boolean;
  children: React.ReactNode;
};

/** Button that opens a native <dialog> asking for confirmation. */
export default function ConfirmButton({
  onConfirm,
  title,
  description,
  confirmLabel = "Delete",
  confirmText,
  className = "btn-danger",
  disabled,
  children,
}: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const d = dialog.current;
    const onClose = () => setTyped("");
    d?.addEventListener("close", onClose);
    return () => d?.removeEventListener("close", onClose);
  }, []);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      dialog.current?.close();
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <button type="button" className={className} disabled={disabled} onClick={() => dialog.current?.showModal()}>
        {children}
      </button>
      <dialog
        ref={dialog}
        className="m-auto w-[min(420px,calc(100vw-32px))] rounded-xl border border-line bg-surface p-0 text-fg shadow-[var(--shadow-lg)] backdrop:bg-black/40 backdrop:backdrop-blur-[2px]"
        onClick={(e) => {
          if (e.target === dialog.current) dialog.current?.close();
        }}
      >
        <div className="p-5">
          <h2 className="text-[15px] font-semibold">{title}</h2>
          <div className="mt-1.5 text-[13px] leading-relaxed text-muted">{description}</div>
          {confirmText && (
            <input
              className="input mt-4 font-mono"
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              placeholder={confirmText}
              aria-label={`Type ${confirmText} to confirm`}
            />
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-line bg-surface-2/50 px-5 py-3">
          <button type="button" className="btn-secondary" onClick={() => dialog.current?.close()}>
            Cancel
          </button>
          <button
            type="button"
            className="btn-danger"
            disabled={busy || (confirmText !== undefined && typed.trim().toUpperCase() !== confirmText.toUpperCase())}
            onClick={confirm}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </dialog>
    </>
  );
}
