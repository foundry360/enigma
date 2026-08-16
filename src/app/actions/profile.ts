"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth/session";
import {
  ProfileAvatarError,
  removeProfileAvatar,
  updateProfileAvatar,
} from "@/server/services/profile";

export type ProfileFormState = {
  message?: string;
} | undefined;

export async function uploadAvatarAction(
  _state: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const session = await requireSession();
  const file = formData.get("avatar");

  if (!(file instanceof File) || file.size === 0) {
    return { message: "Choose a photo." };
  }

  try {
    await updateProfileAvatar({
      tenantId: session.tenantId,
      userId: session.userId,
      file,
    });
  } catch (error) {
    if (error instanceof ProfileAvatarError) {
      return { message: error.message };
    }

    return { message: "Could not update the profile photo." };
  }

  revalidatePath("/", "layout");
  return undefined;
}

export async function removeAvatarAction(
  _state: ProfileFormState,
  _formData?: FormData,
): Promise<ProfileFormState> {
  const session = await requireSession();

  try {
    await removeProfileAvatar({
      tenantId: session.tenantId,
      userId: session.userId,
    });
  } catch {
    return { message: "Could not remove the profile photo." };
  }

  revalidatePath("/", "layout");
  return undefined;
}
