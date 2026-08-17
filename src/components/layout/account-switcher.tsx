"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { selectAccountAction } from "@/app/actions/accounts";
import { useCreateOrganization } from "@/components/accounts/create-organization-modal";
import {
  HeaderSwitcher,
  HeaderSwitcherAction,
  HeaderSwitcherItem,
} from "@/components/layout/header-switcher";
import { OrganizationIcon } from "@/components/ui/entity-icons";

export function AccountSwitcher({
  accounts,
  selectedId,
}: {
  accounts: { id: string; name: string }[];
  selectedId?: string | null;
}) {
  const router = useRouter();
  const { open: openCreate } = useCreateOrganization();
  const [pending, startTransition] = useTransition();
  const selected = accounts.find((account) => account.id === selectedId);

  function selectAccount(accountId: string) {
    if (accountId === selected?.id || pending) {
      return;
    }

    startTransition(async () => {
      await selectAccountAction(accountId);
      router.push(`/accounts/${accountId}`);
    });
  }

  return (
    <HeaderSwitcher
      ariaLabel="Switch organization"
      icon={<OrganizationIcon />}
      label={selected?.name ?? "Select organization"}
      menuTitle="Organizations"
      empty={
        <p className="px-2.5 py-1.5 text-sm text-muted">No organizations yet</p>
      }
      footer={
        <HeaderSwitcherAction onSelect={openCreate}>
          Add organization
        </HeaderSwitcherAction>
      }
    >
      {accounts.map((account) => (
        <HeaderSwitcherItem
          key={account.id}
          active={account.id === selected?.id}
          onSelect={() => selectAccount(account.id)}
        >
          {account.name}
        </HeaderSwitcherItem>
      ))}
    </HeaderSwitcher>
  );
}
