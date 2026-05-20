"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings, ArrowLeft, Coffee, Shield, Eye, EyeOff } from "lucide-react";

export default function SalesCrewLoginPage() {
  const [formData, setFormData] = useState({
    email: "",
    password: ""
  });
  const [showPw, setShowPw] = useState(false);
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
    // Default: admin dashboard (we'll refine by role after user_profiles exists)
    router.push('/admin/dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 dark:from-gray-950 dark:via-gray-900 dark:to-emerald-950">
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
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Settings className="h-8 w-8 text-white" />
              </div>
            </div>
            <CardTitle className="text-2xl font-bold text-gray-900 mb-2">
              SalesCrew Login
            </CardTitle>
            <p className="text-gray-600 text-sm">
              Admin-Zugang für interne Mitarbeiter
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
                    placeholder="admin@salescrew.com"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="!border-0 !ring-0 !ring-offset-0 focus-visible:!ring-2 focus-visible:!ring-green-500 bg-gray-50 text-sm"
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
                      className="!border-0 !ring-0 !ring-offset-0 focus-visible:!ring-2 focus-visible:!ring-green-500 bg-gray-50 text-sm pr-9"
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
                className="w-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg"
              >
                Admin Anmeldung
              </Button>

              <button
                type="button"
                onClick={() => router.push('/auth/forgot-password?returnTo=/auth/salescrew/login')}
                className="w-full text-center text-xs text-green-700 hover:text-green-800 underline underline-offset-2"
              >
                Passwort vergessen?
              </button>
            </form>

            <div className="mt-6 text-center">
              <div className="flex items-center justify-center space-x-2 text-xs text-gray-500 mb-2">
                <Shield className="h-3 w-3" />
                <span>Sicherheitsbereich</span>
              </div>
              <p className="text-xs text-gray-500">
                Nur für autorisierte SalesCrew Mitarbeiter.
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
        </div>
      </div>
    </div>
  );
} 