function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);

  if (parts.length === 0) {
    return "U";
  }

  if (parts.length === 1) {
    return parts[0].slice(0, 2).toUpperCase();
  }

  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

const sizes = {
  sm: "size-8 text-[11px]",
  lg: "size-16 text-base",
};

export function Avatar({
  name,
  src,
  size = "sm",
  className = "",
}: {
  name: string;
  src?: string | null;
  size?: keyof typeof sizes;
  className?: string;
}) {
  return (
    <span
      className={`relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent font-semibold tracking-wide text-accent-fg ${sizes[size]} ${className}`}
      title={name}
    >
      {src ? (
        // Signed Supabase URLs are short-lived; skip the image optimizer.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt=""
          className="size-full object-cover"
        />
      ) : (
        <span aria-hidden="true">{initialsFromName(name)}</span>
      )}
    </span>
  );
}
