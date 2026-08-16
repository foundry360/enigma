import {
  AVATAR_SIGNED_URL_SECONDS,
  MAX_AVATAR_BYTES,
  PROFILE_BUCKET,
  avatarExtensionForType,
  profileObjectPath,
} from "@/lib/storage/profiles";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/server/services/audit";
import {
  getUserAvatarPath,
  setUserAvatarPath,
} from "@/server/services/users";

export class ProfileAvatarError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfileAvatarError";
  }
}

export async function getProfileAvatarUrl(avatarPath: string | null | undefined) {
  if (!avatarPath) {
    return null;
  }

  const supabase = createSupabaseAdminClient();
  const { data, error } = await supabase.storage
    .from(PROFILE_BUCKET)
    .createSignedUrl(avatarPath, AVATAR_SIGNED_URL_SECONDS);

  if (error || !data?.signedUrl) {
    return null;
  }

  return data.signedUrl;
}

export async function updateProfileAvatar(input: {
  tenantId: string;
  userId: string;
  file: File;
}) {
  const ext = avatarExtensionForType(input.file.type);

  if (!ext) {
    throw new ProfileAvatarError("Use a JPG, PNG, WEBP, or GIF photo.");
  }

  if (input.file.size === 0 || input.file.size > MAX_AVATAR_BYTES) {
    throw new ProfileAvatarError("Choose a photo under 8 MB.");
  }

  const user = await getUserAvatarPath(input.tenantId, input.userId);

  if (!user) {
    throw new ProfileAvatarError("Profile not found.");
  }

  const path = profileObjectPath(input.tenantId, input.userId, ext);
  const supabase = createSupabaseAdminClient();
  const body = Buffer.from(await input.file.arrayBuffer());

  const { error } = await supabase.storage.from(PROFILE_BUCKET).upload(path, body, {
    contentType: input.file.type,
    upsert: true,
  });

  if (error) {
    throw new ProfileAvatarError(
      "Could not save the photo. Check that the profiles bucket exists.",
    );
  }

  if (user.avatarPath && user.avatarPath !== path) {
    await supabase.storage.from(PROFILE_BUCKET).remove([user.avatarPath]);
  }

  const count = await setUserAvatarPath(input.tenantId, input.userId, path);

  if (count !== 1) {
    throw new ProfileAvatarError("Profile not found.");
  }

  await writeAuditLog({
    tenantId: input.tenantId,
    userId: input.userId,
    action: "user.avatar.update",
    entity: "User",
    entityId: input.userId,
  });

  return path;
}

export async function removeProfileAvatar(input: {
  tenantId: string;
  userId: string;
}) {
  const user = await getUserAvatarPath(input.tenantId, input.userId);

  if (!user?.avatarPath) {
    return;
  }

  const supabase = createSupabaseAdminClient();
  await supabase.storage.from(PROFILE_BUCKET).remove([user.avatarPath]);
  await setUserAvatarPath(input.tenantId, input.userId, null);

  await writeAuditLog({
    tenantId: input.tenantId,
    userId: input.userId,
    action: "user.avatar.remove",
    entity: "User",
    entityId: input.userId,
  });
}
