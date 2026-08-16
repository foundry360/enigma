"use client";

import { useActionState, useRef } from "react";
import {
  removeAvatarAction,
  uploadAvatarAction,
} from "@/app/actions/profile";
import { Avatar } from "@/components/ui/avatar";
import { buttonClassName } from "@/components/ui/button";

export function AvatarUpload({
  name,
  imageUrl,
  compact = false,
}: {
  name: string;
  imageUrl?: string | null;
  compact?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, action, pending] = useActionState(uploadAvatarAction, undefined);
  const [removeState, removeAction, removing] = useActionState(
    removeAvatarAction,
    undefined,
  );

  const message = state?.message ?? removeState?.message;

  return (
    <div className={compact ? "" : "space-y-4"}>
      <form action={action} className={compact ? "" : "flex items-center gap-4"}>
        <button
          type="button"
          disabled={pending || removing}
          aria-label="Change profile photo"
          title="Change profile photo"
          onClick={() => inputRef.current?.click()}
          className={`relative rounded-full ${pending || removing ? "opacity-60" : ""}`}
        >
          <Avatar name={name} src={imageUrl} size={compact ? "sm" : "lg"} />
        </button>
        <input
          ref={inputRef}
          type="file"
          name="avatar"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={(event) => {
            if (event.currentTarget.files?.length) {
              event.currentTarget.form?.requestSubmit();
            }
          }}
        />
        {compact ? null : (
          <div>
            <p className="text-sm font-medium">{name}</p>
            <p className="mt-1 text-sm text-muted">
              JPG, PNG, WEBP, or GIF. 8 MB max.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending || removing}
                onClick={() => inputRef.current?.click()}
                className={buttonClassName("secondary", "px-3 py-2 text-sm")}
              >
                {pending ? "Uploading…" : "Upload photo"}
              </button>
              {imageUrl ? (
                <button
                  type="submit"
                  formAction={removeAction}
                  disabled={pending || removing}
                  className={buttonClassName("ghost", "px-3 py-2 text-sm")}
                >
                  {removing ? "Removing…" : "Remove"}
                </button>
              ) : null}
            </div>
          </div>
        )}
      </form>
      {message && !compact ? (
        <p className="text-sm text-accent">{message}</p>
      ) : null}
    </div>
  );
}
