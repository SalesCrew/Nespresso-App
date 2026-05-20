"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, KeyRound, Loader2 } from "lucide-react";

type ResetStage = "checking" | "ready" | "saving" | "done" | "invalid";

function sanitizeReturnTo(raw: string | null): string {
  const value = String(raw || "").trim();
  if (!value) return "/auth/promotors/login";
  return value.startsWith("/") ? value : "/auth/promotors/login";
}

function ResetPasswordPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnToRaw = searchParams.get("returnTo");
  const recoveryCode = searchParams.get("code");
  const returnTo = useMemo(() => sanitizeReturnTo(returnToRaw), [returnToRaw]);
  const [stage, setStage] = useState<ResetStage>("checking");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPw, setShowPw] = useState({ next: false, confirm: false });

  useEffect(() => {
    const supabase = createSupabaseBrowserClient();
    let mounted = true;

    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (!mounted) return;
      if (event === "PASSWORD_RECOVERY" || (event === "SIGNED_IN" && session)) {
        setStage("ready");
        setErrorMsg(null);
      }
    });

    const init = async () => {
      try {
        setStage("checking");
        setErrorMsg(null);

        if (recoveryCode) {
          const { error } = await supabase.auth.exchangeCodeForSession(recoveryCode);
          if (error) throw error;
        }

        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (!mounted) return;
        if (data.session) {
          setStage("ready");
        } else {
          const hash = window.location.hash || "";
          const hasRecoveryHash = /access_token=|type=recovery/i.test(hash);
          if (hasRecoveryHash) {
            // Give Supabase client one short tick to process hash-based recovery links.
            await new Promise((resolve) => setTimeout(resolve, 600));
            const retry = await supabase.auth.getSession();
            if (!mounted) return;
            if (retry.data.session) {
              setStage("ready");
              return;
            }
          }
          setStage("invalid");
          setErrorMsg("Der Link ist ungültig oder abgelaufen. Bitte fordere einen neuen Link an.");
        }
      } catch (error: any) {
        if (!mounted) return;
        setStage("invalid");
        setErrorMsg(error?.message || "Recovery-Link konnte nicht verarbeitet werden.");
      }
    };

    init();
    return () => {
      mounted = false;
      listener?.subscription?.unsubscribe();
    };
  }, [recoveryCode]);

  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setErrorMsg(null);
      setStage("saving");

      if (!password || password.length < 8) {
        throw new Error("Bitte mindestens 8 Zeichen verwenden.");
      }
      if (password !== confirmPassword) {
        throw new Error("Passwörter stimmen nicht überein.");
      }

      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;

      setStage("done");
    } catch (error: any) {
      setErrorMsg(error?.message || "Passwort konnte nicht gespeichert werden.");
      setStage("ready");
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
              {stage === "done" ? <CheckCircle2 className="h-7 w-7 text-white" /> : <KeyRound className="h-7 w-7 text-white" />}
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900">Neues Passwort setzen</CardTitle>
          </CardHeader>

          <CardContent>
            {stage === "checking" && (
              <div className="py-6 flex items-center justify-center text-sm text-gray-600 gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Recovery-Link wird geprüft...
              </div>
            )}

            {stage === "invalid" && (
              <div className="space-y-4">
                <p className="text-sm text-red-600">{errorMsg || "Der Link ist ungültig."}</p>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => router.push(`/auth/forgot-password?returnTo=${encodeURIComponent(returnTo)}`)}
                >
                  Neuen Link anfordern
                </Button>
              </div>
            )}

            {(stage === "ready" || stage === "saving") && (
              <form onSubmit={handleSavePassword} className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Neues Passwort</label>
                  <div className="relative">
                    <Input
                      type={showPw.next ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pr-9 bg-gray-50"
                      placeholder="Mindestens 8 Zeichen"
                    />
                    <button
                      type="button"
                      aria-label="Passwort anzeigen/ausblenden"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      onClick={() => setShowPw((s) => ({ ...s, next: !s.next }))}
                    >
                      {showPw.next ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Passwort bestätigen</label>
                  <div className="relative">
                    <Input
                      type={showPw.confirm ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pr-9 bg-gray-50"
                      placeholder="Passwort wiederholen"
                    />
                    <button
                      type="button"
                      aria-label="Bestätigung anzeigen/ausblenden"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      onClick={() => setShowPw((s) => ({ ...s, confirm: !s.confirm }))}
                    >
                      {showPw.confirm ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {errorMsg && <p className="text-xs text-red-600">{errorMsg}</p>}

                <Button
                  type="submit"
                  disabled={stage === "saving"}
                  className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white"
                >
                  {stage === "saving" ? "Speichere..." : "Passwort speichern"}
                </Button>
              </form>
            )}

            {stage === "done" && (
              <div className="space-y-4">
                <p className="text-sm text-green-700">Passwort erfolgreich geändert. Du kannst dich jetzt einloggen.</p>
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  onClick={() => router.push(returnTo)}
                >
                  Zum Login
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
          <div className="container mx-auto px-4 py-12 max-w-md">
            <Card className="border-0 shadow-2xl bg-white/90 backdrop-blur-sm">
              <CardContent className="py-10 text-center text-sm text-gray-600">
                Lade Passwort-Reset...
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <ResetPasswordPageInner />
    </Suspense>
  );
}

