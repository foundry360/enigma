export function slugifyTenantName(name: string) {
  const slug = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48);

  return slug || "workspace";
}

export function uniqueSlug(base: string, existing: Iterable<string>) {
  const taken = new Set(existing);
  if (!taken.has(base)) {
    return base;
  }

  let index = 2;
  while (taken.has(`${base}-${index}`)) {
    index += 1;
  }

  return `${base}-${index}`;
}
