"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowserClient, createSupabaseRecoveryBrowserClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, ArrowLeft, Coffee, Eye, EyeOff } from "lucide-react";

export default function PromotorLoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [showPw, setShowPw] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const supabase = createSupabaseBrowserClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: formData.email,
      password: formData.password,
    });
    if (error) {
      alert(error.message);
      return;
    }
    // Default: promotor dashboard
    router.push('/promotors/dashboard');
  };

  const handleForgotPassword = async () => {
    try {
      setResetError(null);
      const email = String(formData.email || "").trim();
      const returnTo = "/auth/promotors/login";
      if (!email) {
        router.push(`/auth/passwort-vergessen?returnTo=${encodeURIComponent(returnTo)}`);
        return;
      }

      setResetBusy(true);
      const supabase = createSupabaseRecoveryBrowserClient();
      const origin = window.location.origin;
      const redirectTo = `${origin}/auth/reset-password?returnTo=${encodeURIComponent(returnTo)}`;
      const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
      if (error) throw error;

      router.push(
        `/auth/passwort-vergessen?returnTo=${encodeURIComponent(returnTo)}&sent=1&email=${encodeURIComponent(email)}`
      );
    } catch (error: any) {
      setResetError(error?.message || "Wiederherstellungslink konnte nicht gesendet werden.");
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-950 dark:via-gray-900 dark:to-blue-950">
      <div className="container mx-auto px-4 py-12 max-w-md">
        {/* Back Button */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/')}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Zurück zur Startseite
          </Button>
        </div>

        {/* Login Card */}
        <Card className="border-0 shadow-2xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="text-center pb-4">
            <div className="mx-auto mb-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Users className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
              Promotor Login
            </CardTitle>
            <p className="text-gray-600 text-sm">
              Melden Sie sich mit Ihren Zugangsdaten an
            </p>
          </CardHeader>

          <CardContent className="pt-0">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    E-Mail Adresse
                  </label>
                  <Input
                    type="email"
                    placeholder="ihre.email@example.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="!border-0 !ring-0 !ring-offset-0 focus-visible:!ring-2 focus-visible:!ring-blue-500 bg-gray-50 text-sm"
                    // TEMP: removed required for testing - add back later
                    // required
                  />
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">
                    Passwort
                  </label>
                  <div className="relative">
                    <Input
                      type={showPw ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="!border-0 !ring-0 !ring-offset-0 focus-visible:!ring-2 focus-visible:!ring-blue-500 bg-gray-50 text-sm pr-9"
                    />
                    <button
                      type="button"
                      aria-label="Passwort anzeigen/ausblenden"
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                      onClick={() => setShowPw(v => !v)}
                    >
                      {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg"
              >
                Anmelden
              </Button>

              <button
                type="button"
                onClick={handleForgotPassword}
                disabled={resetBusy}
                className="w-full text-center text-xs text-blue-600 hover:text-blue-700 underline underline-offset-2"
              >
                {resetBusy ? "Sende Link..." : "Passwort vergessen?"}
              </button>
              {resetError && <p className="text-xs text-red-600 text-center">{resetError}</p>}
            </form>

            <div className="mt-6 text-center">
              <p className="text-xs text-gray-500">
                Probleme beim Anmelden? Kontaktieren Sie Ihren Teamleiter.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Brand Footer */}
        <div className="text-center mt-12 opacity-60">
          <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
            <Coffee className="h-4 w-4" />
            <span>SalesCrew × Nespresso</span>
          </div>
          <Link href="/datenschutz" className="mt-3 inline-block text-xs text-gray-600 underline underline-offset-2">
            Datenschutz
          </Link>
        </div>
      </div>
    </div>
  );
}
