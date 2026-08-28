"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import OnboardingModal from "@/components/OnboardingModal"

export default function OnboardingDemoPage() {
  const [showOnboarding, setShowOnboarding] = useState(false)
  const [onboardingData, setOnboardingData] = useState<any>(null)

  const handleOnboardingComplete = (data: any) => {
    setOnboardingData(data)
    setShowOnboarding(false)
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-md bg-white dark:bg-gray-900">
        <CardHeader>
          <CardTitle>Onboarding Demo</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600 dark:text-gray-400">
            Klicken Sie auf den Button unten, um den Onboarding-Prozess zu starten.
          </p>
          
          <Button 
            onClick={() => setShowOnboarding(true)}
            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
          >
            Onboarding starten
          </Button>

          {onboardingData && (
            <div className="mt-6 p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h3 className="font-semibold text-green-800 dark:text-green-200 mb-2">
                Onboarding abgeschlossen! ✅
              </h3>
              <p className="text-sm text-green-700 dark:text-green-300">
                Die Daten wurden erfolgreich erfasst. Schauen Sie in die Konsole für Details.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <OnboardingModal 
        isOpen={showOnboarding}
        onComplete={handleOnboardingComplete}
      />
    </div>
  )
} 