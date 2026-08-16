import { requireTenantId } from "@/lib/tenants/scope";

export const PROFILE_BUCKET = "profiles";
export const MAX_AVATAR_BYTES = 8 * 1024 * 1024;
export const AVATAR_SIGNED_URL_SECONDS = 60 * 60 * 24;

export const AVATAR_MIME_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
} as const;

export type AvatarMimeType = keyof typeof AVATAR_MIME_TYPES;

export function isAvatarMimeType(type: string): type is AvatarMimeType {
  return type in AVATAR_MIME_TYPES;
}

export function avatarExtensionForType(type: string) {
  if (!isAvatarMimeType(type)) {
    return null;
  }

  return AVATAR_MIME_TYPES[type];
}

export function profileObjectPath(
  tenantId: string,
  userId: string,
  ext: string,
) {
  return `${requireTenantId(tenantId)}/${userId}/avatar.${ext}`;
}
