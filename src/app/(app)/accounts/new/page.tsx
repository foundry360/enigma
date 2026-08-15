import { CreateAccountForm } from "@/components/accounts/create-account-form";
import { PageHeader } from "@/components/ui/page-header";

export default function NewAccountPage() {
  return (
    <>
      <PageHeader
        eyebrow="Accounts"
        title="Add a customer account"
        description="This is the company to assess. Connecting its Salesforce org is a later step and stays behind the platform adapter."
      />
      <CreateAccountForm />
    </>
  );
}
