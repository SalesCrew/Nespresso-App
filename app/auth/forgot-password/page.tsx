import { redirect } from "next/navigation";

type SearchParamsShape = Record<string, string | string[] | undefined>;

export default async function ForgotPasswordLegacyPage({
  searchParams,
}: {
  searchParams: Promise<SearchParamsShape>;
}) {
  const params = await searchParams;
  const query = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      value.forEach((entry) => {
        if (entry != null) query.append(key, String(entry));
      });
      return;
    }
    if (value != null) query.set(key, String(value));
  });

  const qs = query.toString();
  redirect(`/auth/passwort-vergessen${qs ? `?${qs}` : ""}`);
}

