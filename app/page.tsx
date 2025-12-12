"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import OnboardingModal from "@/components/OnboardingModal";
import {
  Users, 
  Settings, 
  ArrowRight,
  Star, 
  Shield,
  Coffee,
  Briefcase,
  Clock,
  Heart,
  Trophy,
  Target,
  Zap,
  Gift,--
  TrendingUp,
  Medal,
  Gamepad2,
  Rocket,
  Crown,
  Sparkles,
  DollarSign,
  Calendar,
  Bot,
  Brain,
  Navigation,
  Calculator
} from "lucide-react";

export default function LandingPage() {
  const [selectedRole, setSelectedRole] = useState<'promotors' | 'salescrew' | null>(null);
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [hoveredFeature, setHoveredFeature] = useState<string | null>(null);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState(false);
  const router = useRouter();

  const handleRoleSelect = (role: 'promotors' | 'salescrew') => {
    setSelectedRole(role);
    if (role === 'promotors') {
      router.push('/auth/promotors/login');
    } else {
      router.push('/auth/salescrew/login');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50 dark:from-gray-950 dark:via-gray-900 dark:to-gray-800">
              
      <div className="relative z-10 container mx-auto px-4 py-8 max-w-7xl">
                {/* Hero Section */}
        <div className="text-center mb-16">
          <div className="mb-12">
            <h1 className="text-6xl md:text-7xl font-extrabold mb-6">
              <span className="text-gray-900 dark:text-white">Sales</span>
              <span 
                className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent cursor-pointer"
                onClick={() => handleRoleSelect('salescrew')}
              >
                Crew
              </span>
            </h1>
                        <div className="max-w-4xl mx-auto space-y-6">
              <div className="relative">
                <p className="text-2xl md:text-3xl font-medium text-gray-800 dark:text-gray-200 leading-tight text-center">
                  Das modernste Promotion-Team Österreichs
                </p>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"></div>
            </div>
              
              <div className="relative bg-gray-50/40 dark:bg-gray-800/20 rounded-2xl px-6 py-4 border border-gray-100/50 dark:border-gray-700/30 backdrop-blur-sm">
                <p className="text-sm md:text-xl text-gray-600 dark:text-gray-400 leading-relaxed text-center font-light tracking-wide">
                  <span className="inline-flex items-center">
                    <span className="inline-block w-1 h-1 bg-blue-500 rounded-full mr-2"></span>
                    <span className="text-blue-600 dark:text-blue-400 font-medium">Smart Tools</span>
                  </span>
                  <span className="mx-1.5 text-gray-400">•</span> 
                  <span className="text-blue-600 dark:text-blue-400 font-medium">Klare Ziele</span> 
                  <span className="mx-1.5 text-gray-400">•</span> 
                  <span className="text-blue-600 dark:text-blue-400 font-medium">Top Karriere</span>
                  <br className="hidden sm:block" />
                  <span className="block sm:inline mt-1 sm:mt-0 text-gray-500 dark:text-gray-500 text-xs md:text-lg">im Premium-Einzelhandel</span>
                </p>
                    </div>
                    </div>
      </div>
              
          {/* Achievement Preview Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto mb-12">
            <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm shadow-yellow-500/20">
              <CardContent className="p-4 text-center">
                <Trophy className="h-6 w-6 mx-auto mb-2" style={{color: '#EEB34B'}} />
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Leaderboard</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Performance Tracking</p>
                </CardContent>
            </Card>
            
            <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm shadow-green-500/20">
              <CardContent className="p-4 text-center">
                <DollarSign className="h-6 w-6 text-green-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Incentives</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Performance Rewards</p>
              </CardContent>
            </Card>
            
            <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm shadow-red-500/20">
              <CardContent className="p-4 text-center">
                <Target className="h-6 w-6 text-red-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Goals</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Strategic Objectives</p>
              </CardContent>
        </Card>

            <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm shadow-purple-500/20">
              <CardContent className="p-4 text-center">
                <Rocket className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">Development</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">Skill Enhancement</p>
              </CardContent>
            </Card>
                </div>
              </div>

        {/* Login Selection Cards - Single Card */}
        <div className="mb-16">
          {/* Promotors Card */}
          <Card 
            className="border-2 cursor-pointer transition-all duration-200 shadow-xl"
            onClick={() => handleRoleSelect('promotors')}
          >
            
            <CardHeader className="relative z-10 text-center pb-6">
              <div className="mx-auto mb-6 relative">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center shadow-lg">
                  <Users className="h-8 w-8 text-white" />
                      </div>
                    </div>
              <CardTitle className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-3">
                Promotor
              </CardTitle>
              <p className="text-gray-600 dark:text-gray-300 text-base leading-relaxed">
                Professionelle Verkaufsförderung mit intelligenten Tools und klaren Zielen
              </p>
            </CardHeader>
            
            <CardContent className="relative z-10 pb-8">
              <div className="space-y-3 mb-8">
                <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-400">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span className="text-sm">Live Performance Tracking</span>
                </div>
                <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-400">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span className="text-sm">CA KPI Analytics Dashboard</span>
                        </div>
                <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-400">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span className="text-sm">Structured Task Management</span>
                      </div>
                <div className="flex items-center space-x-3 text-gray-600 dark:text-gray-400">
                  <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                  <span className="text-sm">Performance-Based Incentives</span>
                        </div>
                      </div>
            
              <div className="space-y-3">
                <Button 
                  className={`w-full text-base py-3 bg-blue-600 hover:bg-blue-700 text-white shadow-lg transition-all duration-200 ${
                    hoveredCard === 'promotors' ? 'shadow-lg' : ''
                  }`}
              onClick={(e) => {
                e.stopPropagation();
                    handleRoleSelect('promotors');
                  }}
                >
                  <span>Ich bin Promotor</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
                
                <Button 
                  className="w-full text-base py-3 bg-white hover:bg-gray-50 text-blue-600 border-2 border-blue-600 hover:border-blue-700 shadow-lg transition-all duration-200"
              onClick={(e) => {
                e.stopPropagation();
                    setIsOnboardingOpen(true);
              }}
            >
                  <span>Werde Promotor</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
          </div>
              </CardContent>
            </Card>

            </div>

        {/* Small Pastel Feature Cards - 1 per row on mobile */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
          {/* Gamification Card */}
          <Card 
            className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm shadow-yellow-500/20 hover:shadow-md hover:shadow-yellow-500/30 transition-all duration-200"
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center shadow-sm" style={{background: 'linear-gradient(135deg, #EEB34B 0%, #FFED99 25%, #FCD33D 50%, #FAF995 75%, #EFC253 100%)'}}>
                  <Trophy className="h-6 w-6 text-white" />
                          </div>

                    </div>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Performance Tracking
              </CardTitle>
        </CardHeader>
            
            <CardContent className="relative z-10 text-center">
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Trophy className="h-4 w-4" style={{background: 'linear-gradient(135deg, #EEB34B 0%, #FFED99 25%, #FCD33D 50%, #FAF995 75%, #EFC253 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent'}} />
                  <span>Live Performance Rankings</span>
              </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Medal className="h-4 w-4" style={{background: 'linear-gradient(135deg, #EEB34B 0%, #FFED99 25%, #FCD33D 50%, #FAF995 75%, #EFC253 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent'}} />
                  <span>Goal Achievement System</span>
            </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Target className="h-4 w-4" style={{background: 'linear-gradient(135deg, #EEB34B 0%, #FFED99 25%, #FCD33D 50%, #FAF995 75%, #EFC253 100%)', backgroundClip: 'text', WebkitBackgroundClip: 'text', color: 'transparent'}} />
                  <span>Daily Objectives</span>
          </div>
          </div>
            </CardContent>
          </Card>

          {/* Money & Rewards Card */}
          <Card 
            className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm shadow-green-500/20 hover:shadow-md hover:shadow-green-500/30 transition-all duration-200"
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-sm">
                  <DollarSign className="h-6 w-6 text-white" />
                  </div>

                  </div>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Incentive Programs
              </CardTitle>
            </CardHeader>
            
            <CardContent className="relative z-10 text-center">
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Gift className="h-4 w-4 text-green-600" />
                  <span>Performance Bonuses</span>
                  </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span>Revenue-Based Rewards</span>
            </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Crown className="h-4 w-4 text-green-600" />
                  <span>Excellence Recognition</span>
          </div>
            </div>
            </CardContent>
          </Card>

          {/* Modern Team Card */}
          <Card 
            className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm shadow-purple-500/20 hover:shadow-md hover:shadow-purple-500/30 transition-all duration-200"
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4">
                <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center shadow-sm">
                  <Rocket className="h-6 w-6 text-white" />
                    </div>

                    </div>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Smart Tools
              </CardTitle>
            </CardHeader>
            
            <CardContent className="relative z-10 text-center">
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Zap className="h-4 w-4 text-purple-600" />
                  <span>Intelligent Dashboard</span>
                        </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Calendar className="h-4 w-4 text-purple-600" />
                  <span>Advanced Scheduling</span>
                      </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Users className="h-4 w-4 text-purple-600" />
                  <span>Team Collaboration</span>
                        </div>
                      </div>
            </CardContent>
          </Card>

          {/* Eddie Assistant Card */}
          <Card 
            className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm shadow-blue-500/20 hover:shadow-md hover:shadow-blue-500/30 transition-all duration-200"
          >
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-blue-500 rounded-xl flex items-center justify-center shadow-sm">
                  <img
                    src="/icons/robot 1.svg"
                    alt="Eddie"
                    className="h-6 w-6 brightness-0 invert"
                  />
                        </div>
                      </div>
              <CardTitle className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
                Meet Eddie
              </CardTitle>
            </CardHeader>
            
            <CardContent className="relative z-10 text-center">
              <div className="space-y-2 mb-4">
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Brain className="h-4 w-4 text-blue-600" />
                  <span>Kennt Antwort auf jede Frage</span>
                        </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Navigation className="h-4 w-4 text-blue-600" />
                  <span>Hilft bei App-Navigation</span>
                        </div>
                <div className="flex items-center justify-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                  <Calculator className="h-4 w-4 text-blue-600" />
                  <span>POS-Experte & Support</span>
                          </div>
                      </div>
            </CardContent>
          </Card>
                    </div>

        {/* Bottom Trust Indicators */}
        <div className="text-center">
          <div className="bg-gray-50/50 dark:bg-gray-800/20 rounded-2xl p-4 mb-4 border border-gray-100/50 dark:border-gray-700/30">
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-8 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center space-x-2">
                <Shield className="h-4 w-4" />
                <span>Secure Platform</span>
                          </div>
              <div className="hidden sm:block w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="flex items-center space-x-2">
                <Heart className="h-4 w-4" />
                <span>Made in Austria</span>
                        </div>
              <div className="hidden sm:block w-1 h-1 bg-gray-400 rounded-full"></div>
              <div className="flex items-center space-x-2">
                <Coffee className="h-4 w-4" />
                <span>Nespresso Partner</span>
                      </div>
                    </div>
            <div className="mt-3 pt-3 border-t border-gray-200/50 dark:border-gray-600/30">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Trusted by 60+ active professionals across Austria
                </p>
              </div>
          </div>
      </div>
                    </div>

      {/* Onboarding Modal */}
      <OnboardingModal 
        isOpen={isOnboardingOpen}
        onComplete={async (data: any) => {
          try {
            const res = await fetch('/api/applications', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                full_name: `${data?.firstName ?? ''} ${data?.lastName ?? ''}`.trim(),
                email: String(data?.email || '').trim(),
                phone: data?.phone ? String(data.phone) : null,
                notes: `region=${data?.preferredRegion ?? ''}; hours=${data?.hoursPerWeek ?? ''}`,
                // include detailed fields so backend can store them now
                ...data
              })
            });
            const json = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(typeof json?.error === 'string' ? json.error : 'Bewerbung konnte nicht gespeichert werden');
            alert('Bewerbung erfolgreich eingereicht!');
          } catch (e: any) {
            alert(e.message || 'Fehler beim Einreichen der Bewerbung');
          } finally {
            setIsOnboardingOpen(false);
          }
        }}
        onClose={() => setIsOnboardingOpen(false)}
      />
    </div>
  );
} 