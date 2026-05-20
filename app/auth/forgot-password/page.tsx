"use client";

import { Suspense, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, KeyRound, Mail } from "lucide-react";

function sanitizeReturnTo(raw: string | null): string {
  const value = String(raw || "").trim();
  if (!value) return "/auth/promotors/login";
  return value.startsWith("/") ? value : "/auth/promotors/login";
}

function ForgotPasswordPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnTo = useMemo(() => sanitizeReturnTo(searchParams.get("returnTo")), [searchParams]);
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleSendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setBusy(true);
      setErrorMsg(null);
      setSuccessMsg(null);

      const normalizedEmail = String(email || "").trim();
      if (!normalizedEmail) throw new Error("Bitte E-Mail eingeben.");

      const supabase = createSupabaseBrowserClient();
      const origin = window.location.origin;
      const redirectTo = `${origin}/auth/reset-password?returnTo=${encodeURIComponent(returnTo)}`;
      const { error } = await supabase.auth.resetPasswordForEmail(normalizedEmail, { redirectTo });
      if (error) throw error;

      setSuccessMsg("Wenn die E-Mail existiert, wurde ein Wiederherstellungslink gesendet.");
    } catch (error: any) {
      setErrorMsg(error?.message || "Link konnte nicht gesendet werden.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="container mx-auto px-4 py-12 max-w-md">
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push(returnTo)}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück zum Login
          </Button>
        </div>

        <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-5 w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg">
              <KeyRound className="h-7 w-7 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Passwort zurücksetzen</CardTitle>
            <p className="text-gray-600 text-sm mt-1">
              Wir senden dir einen Link zum Zurücksetzen per E-Mail.
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSendReset} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">E-Mail Adresse</label>
                <div className="relative">
                  <Mail className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@beispiel.com"
                    className="pl-9 bg-gray-50"
                  />
                </div>
              </div>

              {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}
              {successMsg && <p className="text-xs text-green-700">{successMsg}</p>}

              <Button
                type="submit"
                disabled={busy}
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
              >
                {busy ? "Sende..." : "Wiederherstellungslink senden"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
          <div className="container mx-auto px-4 py-12 max-w-md">
            <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
              <CardContent className="py-10 text-center text-sm text-gray-600">
                Lade Passwort-Wiederherstellung...
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <ForgotPasswordPageInner />
    </Suspense>
  );
}

