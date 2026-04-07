"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { 
  User, 
  MapPin, 
  Phone, 
  FileText, 
  Car, 
  Ruler, 
  GraduationCap, 
  Clock, 
  Target,
  Calendar,
  Timer,
  X,
  CheckCircle2,
  ArrowLeft,
  Check
} from "lucide-react"

interface OnboardingModalProps {
  isOpen: boolean
  onComplete: (data: any) => void
  onClose?: () => void
}

export default function OnboardingModal({ isOpen, onComplete, onClose }: OnboardingModalProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isCompleted, setIsCompleted] = useState(false)
  const [showBirthDatePicker, setShowBirthDatePicker] = useState(false)
  // Start the birthdate picker on day to ask for Tag → Monat → Jahr
  const [calendarStep, setCalendarStep] = useState<'year' | 'month' | 'day'>('day')
  const [selectedDay, setSelectedDay] = useState<number | null>(null)
  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)
  const [selectedYear, setSelectedYear] = useState<number | null>(null)
  const [reviewPage, setReviewPage] = useState(1) // For review step pagination
  const [editingSection, setEditingSection] = useState<string | null>(null) // Track which section is being edited
  const [formData, setFormData] = useState({
    // Step 1: Personal Info
    firstName: "",
    lastName: "",
    title: "",
    
    // Step 2: Gender
    gender: "",
    pronouns: "",
    
    // Step 3: Address
    address: "",
    postalCode: "",
    city: "",
    
    // Step 4: Contact
    phone: "",
    email: "",
    
    // Step 5: Registration Data
    socialSecurityNumber: "",
    birthDate: "",
    citizenship: "",
    workPermit: null as boolean | null,
    
    // Step 6: Car
    drivingLicense: null as boolean | null,
    carAvailable: null as boolean | null,
    willingToDrive: null as boolean | null,
    
    // Step 7: Body & Clothing
    clothingSize: "",
    height: "",
    
    // Step 8: Education
    education: "",
    qualifications: "",
    currentJob: "",
    
    // Step 9: Spontaneity
    spontaneity: "",
    
    // Step 10: Region
    preferredRegion: "",
    
    // Step 11: Working Days
    workingDays: [] as string[],
    
    // Step 12: Hours
    hoursPerWeek: ""
  })

  // Standardized list of countries (German names), prioritized for AT job market
  const COUNTRIES: string[] = [
    // DACH & neighbors
    "Österreich","Deutschland","Schweiz","Italien","Frankreich","Spanien","Portugal","Niederlande","Belgien","Luxemburg","Dänemark","Schweden","Norwegen","Finnland","Island",
    // Central & Eastern Europe / Balkans
    "Polen","Tschechien","Slowakei","Ungarn","Slowenien","Kroatien","Bosnien und Herzegowina","Serbien","Montenegro","Kosovo","Nordmazedonien","Albanien","Griechenland","Bulgarien","Rumänien","Moldau","Ukraine","Belarus","Litauen","Lettland","Estland","Malta","Zypern","Türkei",
    // Western Europe & microstates
    "Vereinigtes Königreich","Irland","Andorra","Monaco","San Marino","Liechtenstein","Vatikanstadt",
    // Caucasus
    "Georgien","Armenien","Aserbaidschan",
    // Middle East
    "Israel","Palästina","Jordanien","Libanon","Syrien","Irak","Iran","Saudi-Arabien","Vereinigte Arabische Emirate","Katar","Bahrain","Kuwait","Oman","Jemen",
    // North Africa
    "Ägypten","Libyen","Tunesien","Algerien","Marokko",
    // West Africa
    "Mauretanien","Senegal","Gambia","Guinea","Guinea-Bissau","Sierra Leone","Liberia","Elfenbeinküste","Ghana","Togo","Benin","Burkina Faso","Kap Verde","Nigeria",
    // Central Africa
    "Kamerun","Äquatorialguinea","Gabun","Sao Tomé und Príncipe","Tschad","Zentralafrikanische Republik","Kongo (Republik)","Demokratische Republik Kongo","Angola",
    // East Africa & Horn
    "Sudan","Südsudan","Äthiopien","Eritrea","Dschibuti","Somalia","Kenia","Uganda","Ruanda","Burundi","Tansania","Madagaskar","Mauritius","Seychellen","Komoren",
    // Southern Africa
    "Südafrika","Namibia","Botswana","Simbabwe","Sambia","Malawi","Mosambik","Lesotho","Eswatini",
    // Central Asia
    "Kasachstan","Usbekistan","Kirgistan","Tadschikistan","Turkmenistan",
    // South Asia
    "Indien","Pakistan","Bangladesch","Sri Lanka","Nepal","Bhutan","Malediven","Afghanistan",
    // East Asia
    "China","Hongkong","Macau","Taiwan","Japan","Südkorea","Nordkorea","Mongolei",
    // Southeast Asia
    "Myanmar","Thailand","Laos","Kambodscha","Vietnam","Malaysia","Singapur","Indonesien","Brunei","Philippinen","Timor-Leste",
    // Oceania
    "Australien","Neuseeland","Papua-Neuguinea","Fidschi","Samoa","Tonga","Vanuatu","Salomonen","Kiribati","Tuvalu","Nauru","Mikronesien","Marshallinseln","Palau",
    // North America
    "Kanada","USA","Mexiko",
    // Central America
    "Guatemala","Belize","Honduras","El Salvador","Nicaragua","Costa Rica","Panama",
    // Caribbean
    "Bahamas","Kuba","Jamaika","Haiti","Dominikanische Republik","Barbados","Trinidad und Tobago","Grenada","Antigua und Barbuda","St. Kitts und Nevis","St. Lucia","St. Vincent und die Grenadinen",
    // South America
    "Kolumbien","Venezuela","Ecuador","Peru","Bolivien","Chile","Argentinien","Uruguay","Paraguay","Brasilien","Guyana","Suriname"
  ]

  // Citizenship input supports free typing but requires selection from list to validate
  const [citizenshipInput, setCitizenshipInput] = useState("")
  const [citizenshipConfirmed, setCitizenshipConfirmed] = useState(false)
  const [countryOpen, setCountryOpen] = useState(false)

  const totalSteps = 13
  const progress = (currentStep / totalSteps) * 100

  // SessionStorage persistence
  const STORAGE_KEY = 'werde.promotor.onboarding.session.v1'
  const STORAGE_VERSION = 1
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const [hasLoadedFromStorage, setHasLoadedFromStorage] = useState(false)

  // Load from sessionStorage on mount
  useEffect(() => {
    if (hasLoadedFromStorage) return

    try {
      const saved = sessionStorage.getItem(STORAGE_KEY)
      if (saved) {
        const parsed = JSON.parse(saved)
        
        // Version check
        if (parsed.version !== STORAGE_VERSION) {
          sessionStorage.removeItem(STORAGE_KEY)
          setHasLoadedFromStorage(true)
          return
        }

        // Silently restore saved state
        resumeFromStorage(parsed)
      }
    } catch (e) {
      console.error('Failed to load onboarding session:', e)
    }
    
    setHasLoadedFromStorage(true)
  }, [hasLoadedFromStorage])

  // Save to sessionStorage (debounced)
  const saveToStorage = () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current)
    }

    saveTimeoutRef.current = setTimeout(() => {
      try {
        const data = {
          version: STORAGE_VERSION,
          updatedAt: new Date().toISOString(),
          currentStep,
          reviewPage,
          formData,
        }
        sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      } catch (e) {
        console.error('Failed to save onboarding session:', e)
      }
    }, 400)
  }

  // Resume from saved state
  const resumeFromStorage = (parsed: any) => {
    if (parsed.formData) setFormData(parsed.formData)
    if (parsed.currentStep) setCurrentStep(parsed.currentStep)
    if (parsed.reviewPage) setReviewPage(parsed.reviewPage)
    
    // Restore citizenship input state if present
    if (parsed.formData?.citizenship) {
      setCitizenshipInput(parsed.formData.citizenship)
      setCitizenshipConfirmed(true)
    }
  }

  // Clear storage
  const clearStorage = () => {
    try {
      sessionStorage.removeItem(STORAGE_KEY)
    } catch (e) {
      console.error('Failed to clear onboarding session:', e)
    }
  }

  // Start fresh
  const startFresh = () => {
    clearStorage()
    setCurrentStep(1)
    setReviewPage(1)
    setFormData({
      firstName: "",
      lastName: "",
      title: "",
      gender: "",
      pronouns: "",
      address: "",
      postalCode: "",
      city: "",
      phone: "",
      email: "",
      socialSecurityNumber: "",
      birthDate: "",
      citizenship: "",
      workPermit: null as boolean | null,
      drivingLicense: null as boolean | null,
      carAvailable: null as boolean | null,
      willingToDrive: null as boolean | null,
      clothingSize: "",
      height: "",
      education: "",
      qualifications: "",
      currentJob: "",
      spontaneity: "",
      preferredRegion: "",
      workingDays: [] as string[],
      hoursPerWeek: ""
    })
    setCitizenshipInput("")
    setCitizenshipConfirmed(false)
  }

  // Auto-save on formData, currentStep, or reviewPage changes
  useEffect(() => {
    if (hasLoadedFromStorage) {
      saveToStorage()
    }
  }, [formData, currentStep, reviewPage, hasLoadedFromStorage])

  // Save on visibility change (mobile background)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && hasLoadedFromStorage) {
        // Immediate save when going to background
        try {
          const data = {
            version: STORAGE_VERSION,
            updatedAt: new Date().toISOString(),
            currentStep,
            reviewPage,
            formData,
          }
          sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data))
        } catch (e) {
          console.error('Failed to save on visibility change:', e)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange)
  }, [currentStep, reviewPage, formData, hasLoadedFromStorage])

  const isNonSchengenCountry = (citizenship: string) => {
    const schengenCountries = [
      "österreich", "deutschland", "schweiz", "italien", "frankreich", 
      "spanien", "portugal", "niederlande", "belgien", "luxemburg",
      "dänemark", "schweden", "norwegen", "finnland", "island",
      "polen", "tschechien", "slowakei", "ungarn", "slowenien",
      "estland", "lettland", "litauen", "malta", "griechenland"
    ]
    return !schengenCountries.some(country => 
      citizenship.toLowerCase().includes(country)
    )
  }

  const shouldShowWorkPermit = () => {
    return formData.citizenship && isNonSchengenCountry(formData.citizenship)
  }

  const handleNext = () => {
    if (currentStep === 5 && shouldShowWorkPermit() && formData.workPermit === null) {
      // Stay on step 5 until work permit is answered
      return
    }
    
    // If editing a section from review page, return to review page (step 13)
    if (editingSection && currentStep < 13) {
      setEditingSection(null);
      setCurrentStep(13);
      return;
    }
    
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      // Reset review page to 1 when entering step 13
      if (currentStep === 12) {
        setReviewPage(1);
      }
    } else {
      // Submit the form data (only from step 13)
      clearStorage(); // Clear session storage on successful submit
      onComplete(formData);
      setIsCompleted(true);
    }
  }

  const handleBack = () => {
    // If editing a section from review page, return to review page without saving
    if (editingSection && currentStep < 13) {
      setEditingSection(null);
      setCurrentStep(13);
      return;
    }
    
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const updateFormData = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const isValidEmail = (email: string): boolean => {
    if (!email) return false
    // Basic but robust email pattern
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return pattern.test(email.trim())
  }

  const toggleWorkingDay = (day: string) => {
    setFormData(prev => ({
      ...prev,
      workingDays: prev.workingDays.includes(day)
        ? prev.workingDays.filter(d => d !== day)
        : [...prev.workingDays, day]
    }))
  }

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.firstName && formData.lastName
      case 2:
        if (formData.gender === "divers") {
          return formData.gender && formData.pronouns
        }
        return formData.gender
      case 3:
        return formData.address && formData.postalCode && formData.city
      case 4:
        return formData.phone && isValidEmail(formData.email)
      case 5:
        const basicData = formData.socialSecurityNumber && formData.birthDate && formData.citizenship && citizenshipConfirmed
        if (shouldShowWorkPermit()) {
          return basicData && formData.workPermit !== null
        }
        return basicData
      case 6:
        return formData.drivingLicense !== null && formData.carAvailable !== null && formData.willingToDrive !== null
      case 7:
        return formData.clothingSize && formData.height
      case 8:
        return formData.education
      case 9:
        return formData.spontaneity
      case 10:
        return formData.preferredRegion
      case 11:
        return formData.workingDays.length > 0
      case 12:
        return formData.hoursPerWeek
      case 13:
        return true // Review step is always valid (all data already validated)
      default:
        return true
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="flex items-center mb-6">
              <User className="h-6 w-6 text-blue-500 mr-3" />
              <h2 className="text-xl font-semibold">Wer bist du?</h2>
            </div>
            <div className="space-y-4">
              <Input
                placeholder="Vorname"
                value={formData.firstName}
                onChange={(e) => updateFormData("firstName", e.target.value)}
                className="!border-0 !ring-0 !ring-offset-0 focus-visible:!ring-2 focus-visible:!ring-blue-500 bg-gray-50 dark:bg-gray-800 text-sm"
              />
              <Input
                placeholder="Nachname"
                value={formData.lastName}
                onChange={(e) => updateFormData("lastName", e.target.value)}
                className="!border-0 !ring-0 !ring-offset-0 focus-visible:!ring-2 focus-visible:!ring-blue-500 bg-gray-50 dark:bg-gray-800 text-sm"
              />
              <Input
                placeholder="Titel (optional)"
                value={formData.title}
                onChange={(e) => updateFormData("title", e.target.value)}
                className="!border-0 !ring-0 !ring-offset-0 focus-visible:!ring-2 focus-visible:!ring-blue-500 bg-gray-50 dark:bg-gray-800 text-sm"
              />
            </div>
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <div className="flex items-center mb-6">
              <User className="h-6 w-6 text-blue-500 mr-3" />
              <h2 className="text-xl font-semibold">Geschlecht</h2>
            </div>
            <div className="space-y-4">
              <p className="text-sm font-medium mb-3">Wie möchtest du angesprochen werden?</p>
              <div className="grid grid-cols-1 gap-3">
                <Button
                  variant="outline"
                  onClick={() => updateFormData("gender", "männlich")}
                  className={`w-full ${
                    formData.gender === "männlich" 
                      ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-500" 
                      : "hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-900/20"
                  }`}
                >
                  Männlich
                </Button>
                <Button
                  variant="outline"
                  onClick={() => updateFormData("gender", "weiblich")}
                  className={`w-full ${
                    formData.gender === "weiblich" 
                      ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-500" 
                      : "hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-900/20"
                  }`}
                >
                  Weiblich
                </Button>
                <Button
                  variant="outline"
                  onClick={() => updateFormData("gender", "divers")}
                  className={`w-full ${
                    formData.gender === "divers" 
                      ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-500" 
                      : "hover:bg-blue-50 hover:border-blue-200 dark:hover:bg-blue-900/20"
                  }`}
                >
                  Divers
                </Button>
              </div>
              
              {formData.gender === "divers" && (
                <div className="mt-4">
                  <Input
                    placeholder="Pronomen (z.B. sie/ihr, er/ihn, they/them)"
                    value={formData.pronouns}
                    onChange={(e) => updateFormData("pronouns", e.target.value)}
                    className="!border-0 !ring-0 !ring-offset-0 focus-visible:!ring-2 focus-visible:!ring-blue-500 bg-gray-50 dark:bg-gray-800 text-sm"
                  />
                </div>
              )}
            </div>
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <div className="flex items-center mb-6">
              <MapPin className="h-6 w-6 text-blue-500 mr-3" />
              <h2 className="text-xl font-semibold">Adresse</h2>
            </div>
            <div className="space-y-4">
              <Input
                placeholder="Adresse"
                value={formData.address}
                onChange={(e) => updateFormData("address", e.target.value)}
                className="!border-0 !ring-0 !ring-offset-0 focus-visible:!ring-2 focus-visible:!ring-blue-500 bg-gray-50 dark:bg-gray-800 text-sm"
              />
              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="PLZ"
                  value={formData.postalCode}
                  onChange={(e) => updateFormData("postalCode", e.target.value)}
                  className="!border-0 !ring-0 !ring-offset-0 focus-visible:!ring-2 focus-visible:!ring-blue-500 bg-gray-50 dark:bg-gray-800 text-sm"
                />
                <Input
                  placeholder="Ort"
                  value={formData.city}
                  onChange={(e) => updateFormData("city", e.target.value)}
                  className="!border-0 !ring-0 !ring-offset-0 focus-visible:!ring-2 focus-visible:!ring-blue-500 bg-gray-50 dark:bg-gray-800 text-sm"
                />
              </div>
            </div>
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <div className="flex items-center mb-6">
              <Phone className="h-6 w-6 text-blue-500 mr-3" />
              <h2 className="text-xl font-semibold">Kontaktdaten</h2>
            </div>
            <div className="space-y-4">
              <Input
                placeholder="Telefonnummer"
                type="tel"
                value={formData.phone}
                onChange={(e) => updateFormData("phone", e.target.value)}
                className="!border-0 !ring-0 !ring-offset-0 focus-visible:!ring-2 focus-visible:!ring-blue-500 bg-gray-50 dark:bg-gray-800 text-sm"
              />
              <div>
                <Input
                  placeholder="E-Mail (gültiges Format erforderlich)"
                  type="email"
                  value={formData.email}
                  onChange={(e) => updateFormData("email", e.target.value)}
                  className={`!border-0 !ring-0 !ring-offset-0 focus-visible:!ring-2 ${formData.email && !isValidEmail(formData.email) ? 'focus-visible:!ring-red-500' : 'focus-visible:!ring-blue-500'} bg-gray-50 dark:bg-gray-800 text-sm`}
                />
                {formData.email && !isValidEmail(formData.email) && (
                  <p className="mt-1 text-xs text-red-600">Bitte eine gültige E-Mail-Adresse eingeben (z.B. name@example.com).</p>
                )}
              </div>
            </div>
          </div>
        )

      case 5:
        return (
          <div className="space-y-4">
            <div className="flex items-center mb-6">
              <FileText className="h-6 w-6 text-blue-500 mr-3" />
              <h2 className="text-xl font-semibold">Anmeldungsdaten</h2>
            </div>
            <div className="space-y-4">
              {/* Geburtsdatum - now first */}
              <div className="relative">
                <label className="block text-sm text-gray-600 mb-1">Geburtsdatum</label>
                <button
                  type="button"
                  onClick={() => setShowBirthDatePicker(!showBirthDatePicker)}
                  className="w-full px-3 py-2 text-left bg-gray-50 dark:bg-gray-800 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 transition-all"
                >
                  {formData.birthDate || 'Geburtsdatum (TT.MM.JJJJ)'}
                </button>
                
                {showBirthDatePicker && (
                  <div className="absolute z-50 bottom-full mb-2 bg-white rounded-lg shadow-xl border border-gray-100 p-4 w-full max-w-sm">
                    {/* Step indicator */}
                    <div className="text-center mb-3 text-xs text-gray-500">
                      {calendarStep === 'day' && 'Schritt 1: Tag wählen'}
                      {calendarStep === 'month' && 'Schritt 2: Monat wählen'}
                      {calendarStep === 'year' && 'Schritt 3: Jahr wählen'}
                    </div>
                    
                    {/* Year selector (now last) */}
                    {calendarStep === 'year' && (
                      <div>
                        <button
                          type="button"
                          onClick={() => setCalendarStep('month')}
                          className="mb-3 text-xs text-gray-500 hover:text-gray-700"
                        >
                          ← Zurück zu Monat
                        </button>
                        <div className="grid grid-cols-4 gap-2 max-h-[180px] overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                          {Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - 16 - i).map(year => (
                            <button
                              key={year}
                              type="button"
                              onClick={() => {
                                setSelectedYear(year);
                                // If day & month already chosen, finalize; else go back to day selection
                                if (selectedDay && selectedMonth) {
                                  const formatted = `${selectedDay.toString().padStart(2, '0')}.${selectedMonth.toString().padStart(2, '0')}.${year}`;
                                  updateFormData("birthDate", formatted);
                                  setShowBirthDatePicker(false);
                                } else {
                                  setCalendarStep('day');
                                }
                              }}
                              className="px-3 py-2 rounded-lg text-sm bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 transition-all"
                            >
                              {year}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Month selector (second) */}
                    {calendarStep === 'month' && (
                      <div>
                        <button
                          type="button"
                          onClick={() => setCalendarStep('day')}
                          className="mb-3 text-xs text-gray-500 hover:text-gray-700"
                        >
                          ← Zurück zu Tag
                        </button>
                        <div className="grid grid-cols-4 gap-2">
                          {['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'].map((month, idx) => (
                            <button
                              key={idx}
                              type="button"
                              onClick={() => {
                                setSelectedMonth(idx + 1);
                                // After month choose year next
                                setCalendarStep('year');
                              }}
                              className="px-3 py-2 rounded-lg text-sm bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 transition-all"
                            >
                              {month}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Day selector (first) */}
                    {calendarStep === 'day' && (
                      <div>
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedMonth(null);
                            setCalendarStep('month');
                          }}
                          className="mb-3 text-xs text-gray-500 hover:text-gray-700"
                        >
                          ← Zurück zu Monat
                        </button>
                        <div className="grid grid-cols-7 gap-1">
                          {Array.from({ length: (selectedYear && selectedMonth) ? new Date(selectedYear, selectedMonth, 0).getDate() : 31 }, (_, i) => i + 1).map(day => (
                            <button
                              key={day}
                              type="button"
                              onClick={() => {
                                setSelectedDay(day);
                                // If month and year already selected finalize, otherwise go to month next
                                if (selectedMonth && selectedYear) {
                                const formatted = `${day.toString().padStart(2, '0')}.${selectedMonth.toString().padStart(2, '0')}.${selectedYear}`;
                                updateFormData("birthDate", formatted);
                                setShowBirthDatePicker(false);
                                } else {
                                  setCalendarStep('month');
                                }
                              }}
                              className="px-2 py-2 rounded-lg text-xs bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 transition-all"
                            >
                              {day}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              {/* SV-Nummer - now second with auto-filled birthdate prefix */}
              <div>
                <label className="block text-sm text-gray-600 mb-1">SV-Nummer</label>
                <div className="flex items-center gap-2">
                  {/* Auto-filled prefix from birthdate (DDMMYY) */}
                  {formData.birthDate && (() => {
                    const parts = formData.birthDate.split('.');
                    if (parts.length === 3) {
                      const prefix = parts[0] + parts[1] + parts[2].slice(-2);
                      return (
                        <div className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg text-sm text-gray-700 font-mono">
                          {prefix}
                        </div>
                      );
                    }
                    return null;
                  })()}
                  
                  {/* Editable suffix */}
                  <input
                    type="text"
                    placeholder={formData.birthDate ? "Restliche Ziffern" : "SV-Nummer"}
                    value={(() => {
                      if (!formData.birthDate) return formData.socialSecurityNumber;
                      const parts = formData.birthDate.split('.');
                      if (parts.length === 3) {
                        const prefix = parts[0] + parts[1] + parts[2].slice(-2);
                        return formData.socialSecurityNumber.startsWith(prefix) 
                          ? formData.socialSecurityNumber.slice(6) 
                          : formData.socialSecurityNumber;
                      }
                      return formData.socialSecurityNumber;
                    })()}
                    onChange={(e) => {
                      if (!formData.birthDate) {
                        updateFormData("socialSecurityNumber", e.target.value);
                      } else {
                        const parts = formData.birthDate.split('.');
                        if (parts.length === 3) {
                          const prefix = parts[0] + parts[1] + parts[2].slice(-2);
                          updateFormData("socialSecurityNumber", prefix + e.target.value);
                        }
                      }
                    }}
                    className="flex-1 px-3 py-2 bg-gray-50 dark:bg-gray-800 border-0 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              {/* Citizenship with typeahead + enforced selection */}
              <div className="relative">
                <Input
                  placeholder="Staatsbürgerschaft (Land eingeben, dann aus Liste auswählen)"
                  value={citizenshipInput}
                  onChange={(e) => {
                    setCitizenshipInput(e.target.value)
                    setCitizenshipConfirmed(false)
                    updateFormData("citizenship", e.target.value)
                    setCountryOpen(Boolean(e.target.value.trim()))
                  }}
                  onFocus={() => setCountryOpen(Boolean(citizenshipInput.trim()))}
                  className={`!border-0 !ring-0 !ring-offset-0 focus-visible:!ring-2 ${citizenshipConfirmed ? '!ring-green-500' : '!ring-blue-500'} bg-gray-50 dark:bg-gray-800 text-sm pr-9`}
                />
                {/* Dropdown */}
                {countryOpen && (
                  <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg max-h-56 overflow-auto">
                    {COUNTRIES.filter(c => c.toLowerCase().includes(citizenshipInput.toLowerCase())).slice(0, 100).map((c) => (
                      <button
                        type="button"
                        key={c}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                        onClick={() => {
                          updateFormData("citizenship", c)
                          setCitizenshipInput(c)
                          setCitizenshipConfirmed(true)
                          setCountryOpen(false)
                        }}
                      >
                        {c}
                      </button>
                    ))}
                    {COUNTRIES.filter(c => c.toLowerCase().includes(citizenshipInput.toLowerCase())).length === 0 && (
                      <div className="px-3 py-2 text-sm text-gray-500">Kein Treffer – bitte anders eingeben</div>
                    )}
                  </div>
                )}
                {/* Hint badge */}
                {!citizenshipConfirmed && citizenshipInput.trim().length > 0 && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2">
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-yellow-100 text-yellow-800 border border-yellow-200">Aus Liste wählen</span>
                  </div>
                )}
              </div>
              
              {shouldShowWorkPermit() && (
                <div className="mt-6">
                  <p className="text-sm font-medium mb-3">Arbeitsbewilligung vorhanden?</p>
                  <div className="flex gap-3">
                    <Button
                      variant={formData.workPermit === true ? "default" : "outline"}
                      onClick={() => updateFormData("workPermit", true)}
                      className="flex-1"
                    >
                      Ja
                    </Button>
                    <Button
                      variant={formData.workPermit === false ? "default" : "outline"}
                      onClick={() => updateFormData("workPermit", false)}
                      className="flex-1"
                    >
                      Nein
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )

      case 6:
        return (
          <div className="space-y-6">
            <div className="flex items-center mb-6">
              <Car className="h-6 w-6 text-blue-500 mr-3" />
              <h2 className="text-xl font-semibold">Auto</h2>
            </div>
            
            <div className="space-y-6">
              <div>
                <p className="text-sm font-medium mb-3">Führerschein vorhanden?</p>
                <div className="flex gap-3">
                  <Button
                    variant={formData.drivingLicense === true ? "default" : "outline"}
                    onClick={() => updateFormData("drivingLicense", true)}
                    className="flex-1"
                  >
                    Ja
                  </Button>
                  <Button
                    variant={formData.drivingLicense === false ? "default" : "outline"}
                    onClick={() => updateFormData("drivingLicense", false)}
                    className="flex-1"
                  >
                    Nein
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-3">Auto vorhanden?</p>
                <div className="flex gap-3">
                  <Button
                    variant={formData.carAvailable === true ? "default" : "outline"}
                    onClick={() => updateFormData("carAvailable", true)}
                    className="flex-1"
                  >
                    Ja
                  </Button>
                  <Button
                    variant={formData.carAvailable === false ? "default" : "outline"}
                    onClick={() => updateFormData("carAvailable", false)}
                    className="flex-1"
                  >
                    Nein
                  </Button>
                </div>
              </div>

              <div>
                <p className="text-sm font-medium mb-3">Bereitschaft zu fahren?</p>
                <div className="flex gap-3">
                  <Button
                    variant={formData.willingToDrive === true ? "default" : "outline"}
                    onClick={() => updateFormData("willingToDrive", true)}
                    className="flex-1"
                  >
                    Ja
                  </Button>
                  <Button
                    variant={formData.willingToDrive === false ? "default" : "outline"}
                    onClick={() => updateFormData("willingToDrive", false)}
                    className="flex-1"
                  >
                    Nein
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )

      case 7:
        return (
          <div className="space-y-4">
            <div className="flex items-center mb-6">
              <Ruler className="h-6 w-6 text-blue-500 mr-3" />
              <h2 className="text-xl font-semibold">Körper und Kleidungsgröße</h2>
            </div>
            <div className="space-y-4">
              <Input
                placeholder="Kleidergröße (z.B. S, M, L, XL oder 38, 40, 42...)"
                value={formData.clothingSize}
                onChange={(e) => updateFormData("clothingSize", e.target.value)}
                className="!border-0 !ring-0 !ring-offset-0 focus-visible:!ring-2 focus-visible:!ring-blue-500 bg-gray-50 dark:bg-gray-800 text-sm"
              />
              <Input
                placeholder="Körpergröße (in cm)"
                type="number"
                value={formData.height}
                onChange={(e) => updateFormData("height", e.target.value)}
                className="!border-0 !ring-0 !ring-offset-0 focus-visible:!ring-2 focus-visible:!ring-blue-500 bg-gray-50 dark:bg-gray-800 text-sm"
              />
            </div>
          </div>
        )

      case 8:
        return (
          <div className="space-y-4">
            <div className="flex items-center mb-6">
              <GraduationCap className="h-6 w-6 text-blue-500 mr-3" />
              <h2 className="text-xl font-semibold">Schulische Ausbildung</h2>
            </div>
            <div className="space-y-4">
              <Input
                placeholder="Höchste abgeschlossene Schulausbildung"
                value={formData.education}
                onChange={(e) => updateFormData("education", e.target.value)}
                className="!border-0 !ring-0 !ring-offset-0 focus-visible:!ring-2 focus-visible:!ring-blue-500 bg-gray-50 dark:bg-gray-800 text-sm"
              />
              <Input
                placeholder="Zusatzqualifikationen (optional)"
                value={formData.qualifications}
                onChange={(e) => updateFormData("qualifications", e.target.value)}
                className="!border-0 !ring-0 !ring-offset-0 focus-visible:!ring-2 focus-visible:!ring-blue-500 bg-gray-50 dark:bg-gray-800 text-sm"
              />
              <Input
                placeholder="Derzeitige Beschäftigung (optional)"
                value={formData.currentJob}
                onChange={(e) => updateFormData("currentJob", e.target.value)}
                className="!border-0 !ring-0 !ring-offset-0 focus-visible:!ring-2 focus-visible:!ring-blue-500 bg-gray-50 dark:bg-gray-800 text-sm"
              />
            </div>
          </div>
        )

      case 9:
        return (
          <div className="space-y-4">
            <div className="flex items-center mb-6">
              <Clock className="h-6 w-6 text-blue-500 mr-3" />
              <h2 className="text-xl font-semibold">Spontanität</h2>
            </div>
            <div className="space-y-4">
              <p className="text-sm font-medium mb-3">Wie oft kannst du spontan für Einsätze einspringen?</p>
              <div className="flex flex-col gap-3">
                <Button
                  variant={formData.spontaneity === "oft" ? "default" : "outline"}
                  onClick={() => updateFormData("spontaneity", "oft")}
                  className={`w-full ${
                    formData.spontaneity === "oft" 
                      ? "bg-green-500 hover:bg-green-600 text-white border-green-500" 
                      : "hover:bg-green-50 hover:border-green-200 dark:hover:bg-green-900/20"
                  }`}
                >
                  Oft
                </Button>
                <Button
                  variant={formData.spontaneity === "selten" ? "default" : "outline"}
                  onClick={() => updateFormData("spontaneity", "selten")}
                  className={`w-full ${
                    formData.spontaneity === "selten" 
                      ? "bg-orange-500 hover:bg-orange-600 text-white border-orange-500" 
                      : "hover:bg-orange-50 hover:border-orange-200 dark:hover:bg-orange-900/20"
                  }`}
                >
                  Selten
                </Button>
                <Button
                  variant={formData.spontaneity === "nie" ? "default" : "outline"}
                  onClick={() => updateFormData("spontaneity", "nie")}
                  className={`w-full ${
                    formData.spontaneity === "nie" 
                      ? "bg-red-500 hover:bg-red-600 text-white border-red-500" 
                      : "hover:bg-red-50 hover:border-red-200 dark:hover:bg-red-900/20"
                  }`}
                >
                  Nie
                </Button>
              </div>
            </div>
          </div>
        )

      case 10:
        return (
          <div className="space-y-4">
            <div className="flex items-center mb-6">
              <Target className="h-6 w-6 text-blue-500 mr-3" />
              <h2 className="text-xl font-semibold">Einsatzregion</h2>
            </div>
            <div className="space-y-4">
              <p className="text-sm font-medium mb-3">Bevorzugte Einsatz Region (z.B. Wien, Graz, Linz...)</p>
              <div className="grid grid-cols-1 gap-2">
                {[
                  { key: "wien-noe-bgl", name: "Wien/NÖ/Bgl" },
                  { key: "steiermark", name: "Steiermark" },
                  { key: "salzburg", name: "Salzburg" },
                  { key: "oberoesterreich", name: "Oberösterreich" },
                  { key: "tirol", name: "Tirol" },
                  { key: "vorarlberg", name: "Vorarlberg" },
                  { key: "kaernten", name: "Kärnten" }
                ].map((region) => (
                  <Button
                    key={region.key}
                    variant="outline"
                    onClick={() => updateFormData("preferredRegion", region.key)}
                    className={`w-full ${
                      formData.preferredRegion === region.key
                        ? "bg-blue-500 hover:bg-blue-600 text-white border-blue-500"
                        : "bg-white hover:bg-blue-50 hover:border-blue-200 text-gray-700 border-gray-200"
                    }`}
                  >
                    {region.name}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )

      case 11:
        return (
          <div className="space-y-4">
            <div className="flex items-center mb-6">
              <Calendar className="h-6 w-6 text-blue-500 mr-3" />
              <h2 className="text-xl font-semibold">Einsatzort</h2>
            </div>
            <div className="space-y-4">
              <p className="text-sm font-medium mb-3">An welchen Tagen kannst du arbeiten?</p>
              <div className="grid grid-cols-4 gap-2">
                {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((day) => (
                  <Badge
                    key={day}
                    variant={formData.workingDays.includes(day) ? "default" : "outline"}
                    className="cursor-pointer py-2 px-4 text-center justify-center hover:bg-blue-100 dark:hover:bg-blue-900"
                    onClick={() => toggleWorkingDay(day)}
                  >
                    {day}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        )

      case 12:
        return (
          <div className="space-y-4">
            <div className="flex items-center mb-6">
              <Timer className="h-6 w-6 text-blue-500 mr-3" />
              <h2 className="text-xl font-semibold">Stundenwunsch</h2>
            </div>
            <div className="space-y-4">
              <Input
                placeholder="Gewünschte Stunden pro Woche"
                type="number"
                value={formData.hoursPerWeek}
                onChange={(e) => updateFormData("hoursPerWeek", e.target.value)}
                className="!border-0 !ring-0 !ring-offset-0 focus-visible:!ring-2 focus-visible:!ring-blue-500 bg-gray-50 dark:bg-gray-800 text-sm"
              />
            </div>
          </div>
        )

      case 13:
        return (
          <div className="space-y-4">
            <div className="flex items-center mb-6">
              <FileText className="h-6 w-6 text-blue-500 mr-3" />
              <h2 className="text-xl font-semibold">Daten überprüfen</h2>
            </div>
            
            {/* Page 1 Content */}
            {reviewPage === 1 ? (
              <div className="space-y-3 h-[400px] overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {/* Personal Info */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg p-4 border border-blue-100 dark:border-blue-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm text-blue-900 dark:text-blue-100">Persönliche Daten</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingSection('personal');
                        setCurrentStep(1);
                      }}
                      className="h-7 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-100"
                    >
                      Bearbeiten
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Name:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formData.title ? `${formData.title} ` : ''}{formData.firstName} {formData.lastName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Geschlecht:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">{formData.gender}{formData.pronouns ? ` (${formData.pronouns})` : ''}</span>
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-4 border border-green-100 dark:border-green-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm text-green-900 dark:text-green-100">Adresse</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingSection('address');
                        setCurrentStep(3);
                      }}
                      className="h-7 px-2 text-xs text-green-600 hover:text-green-700 hover:bg-green-100"
                    >
                      Bearbeiten
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Straße:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formData.address}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">PLZ/Ort:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formData.postalCode} {formData.city}</span>
                    </div>
                  </div>
                </div>

                {/* Contact */}
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-900/20 dark:to-pink-900/20 rounded-lg p-4 border border-purple-100 dark:border-purple-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm text-purple-900 dark:text-purple-100">Kontakt</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingSection('contact');
                        setCurrentStep(4);
                      }}
                      className="h-7 px-2 text-xs text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                    >
                      Bearbeiten
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Telefon:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formData.phone}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">E-Mail:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100 text-xs">{formData.email}</span>
                    </div>
                  </div>
                </div>

                {/* Registration Data */}
                <div className="bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 rounded-lg p-4 border border-orange-100 dark:border-orange-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm text-orange-900 dark:text-orange-100">Registrierungsdaten</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingSection('registration');
                        setCurrentStep(5);
                      }}
                      className="h-7 px-2 text-xs text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                    >
                      Bearbeiten
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Sozialversicherung:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formData.socialSecurityNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Geburtsdatum:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formData.birthDate}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Staatsbürgerschaft:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formData.citizenship}</span>
                    </div>
                    {formData.workPermit !== null && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Arbeitserlaubnis:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100">{formData.workPermit ? 'Ja' : 'Nein'}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Page Indicator */}
                <div className="flex justify-center gap-2 pt-4">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <div className="w-2 h-2 rounded-full bg-gray-300 cursor-pointer hover:bg-gray-400" onClick={() => setReviewPage(2)}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-300 cursor-pointer hover:bg-gray-400" onClick={() => setReviewPage(3)}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-300 cursor-pointer hover:bg-gray-400" onClick={() => setReviewPage(4)}></div>
                </div>
              </div>
            ) : reviewPage === 2 ? (
              <div className="space-y-3 h-[400px] overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {/* Car Info */}
                <div className="bg-gradient-to-r from-cyan-50 to-sky-50 dark:from-cyan-900/20 dark:to-sky-900/20 rounded-lg p-4 border border-cyan-100 dark:border-cyan-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm text-cyan-900 dark:text-cyan-100">Auto & Führerschein</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingSection('car');
                        setCurrentStep(6);
                      }}
                      className="h-7 px-2 text-xs text-cyan-600 hover:text-cyan-700 hover:bg-cyan-100"
                    >
                      Bearbeiten
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Führerschein:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formData.drivingLicense ? 'Ja' : 'Nein'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Auto verfügbar:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formData.carAvailable ? 'Ja' : 'Nein'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Bereit zu fahren:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formData.willingToDrive ? 'Ja' : 'Nein'}</span>
                    </div>
                  </div>
                </div>

                {/* Body & Clothing */}
                <div className="bg-gradient-to-r from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 rounded-lg p-4 border border-rose-100 dark:border-rose-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm text-rose-900 dark:text-rose-100">Körper & Kleidung</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingSection('body');
                        setCurrentStep(7);
                      }}
                      className="h-7 px-2 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-100"
                    >
                      Bearbeiten
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Kleidergröße:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formData.clothingSize}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Größe:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formData.height} cm</span>
                    </div>
                  </div>
                </div>

                {/* Education */}
                <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 rounded-lg p-4 border border-yellow-100 dark:border-yellow-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm text-yellow-900 dark:text-yellow-100">Bildung & Beruf</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingSection('education');
                        setCurrentStep(8);
                      }}
                      className="h-7 px-2 text-xs text-yellow-600 hover:text-yellow-700 hover:bg-yellow-100"
                    >
                      Bearbeiten
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Ausbildung:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formData.education}</span>
                    </div>
                    {formData.qualifications && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Qualifikationen:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100 text-xs">{formData.qualifications}</span>
                      </div>
                    )}
                    {formData.currentJob && (
                      <div className="flex justify-between">
                        <span className="text-gray-600 dark:text-gray-400">Aktueller Job:</span>
                        <span className="font-medium text-gray-900 dark:text-gray-100 text-xs">{formData.currentJob}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Page Indicator */}
                <div className="flex justify-center gap-2 pt-4">
                  <div className="w-2 h-2 rounded-full bg-gray-300 cursor-pointer hover:bg-gray-400" onClick={() => setReviewPage(1)}></div>
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <div className="w-2 h-2 rounded-full bg-gray-300 cursor-pointer hover:bg-gray-400" onClick={() => setReviewPage(3)}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-300 cursor-pointer hover:bg-gray-400" onClick={() => setReviewPage(4)}></div>
                </div>
              </div>
            ) : reviewPage === 3 ? (
              <div className="space-y-3 h-[400px] overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {/* Spontaneity */}
                <div className="bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 rounded-lg p-4 border border-teal-100 dark:border-teal-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm text-teal-900 dark:text-teal-100">Spontanität</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingSection('spontaneity');
                        setCurrentStep(9);
                      }}
                      className="h-7 px-2 text-xs text-teal-600 hover:text-teal-700 hover:bg-teal-100"
                    >
                      Bearbeiten
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Spontanität:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100 capitalize">{formData.spontaneity}</span>
                    </div>
                  </div>
                </div>

                {/* Region */}
                <div className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 rounded-lg p-4 border border-indigo-100 dark:border-indigo-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm text-indigo-900 dark:text-indigo-100">Region</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingSection('region');
                        setCurrentStep(10);
                      }}
                      className="h-7 px-2 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-100"
                    >
                      Bearbeiten
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Bevorzugte Region:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">
                        {formData.preferredRegion === 'wien-noe-bgl' ? 'Wien, NÖ & BGL' :
                         formData.preferredRegion === 'st' ? 'Steiermark' :
                         formData.preferredRegion === 's' ? 'Salzburg' :
                         formData.preferredRegion === 'ooe' ? 'Oberösterreich' :
                         formData.preferredRegion === 't' ? 'Tirol' :
                         formData.preferredRegion === 'v' ? 'Vorarlberg' :
                         formData.preferredRegion === 'k' ? 'Kärnten' :
                         formData.preferredRegion}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Working Days */}
                <div className="bg-gradient-to-r from-lime-50 to-green-50 dark:from-lime-900/20 dark:to-green-900/20 rounded-lg p-4 border border-lime-100 dark:border-lime-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm text-lime-900 dark:text-lime-100">Arbeitstage</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingSection('workingDays');
                        setCurrentStep(11);
                      }}
                      className="h-7 px-2 text-xs text-lime-600 hover:text-lime-700 hover:bg-lime-100"
                    >
                      Bearbeiten
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex flex-wrap gap-1">
                      {formData.workingDays.map((day) => (
                        <Badge key={day} variant="secondary" className="text-xs bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-100">
                          {day}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Hours */}
                <div className="bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 rounded-lg p-4 border border-violet-100 dark:border-violet-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-sm text-violet-900 dark:text-violet-100">Stundenwunsch</h3>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        setEditingSection('hours');
                        setCurrentStep(12);
                      }}
                      className="h-7 px-2 text-xs text-violet-600 hover:text-violet-700 hover:bg-violet-100"
                    >
                      Bearbeiten
                    </Button>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Stunden/Woche:</span>
                      <span className="font-medium text-gray-900 dark:text-gray-100">{formData.hoursPerWeek}</span>
                    </div>
                  </div>
                </div>

                {/* Page Indicator */}
                <div className="flex justify-center gap-2 pt-4">
                  <div className="w-2 h-2 rounded-full bg-gray-300 cursor-pointer hover:bg-gray-400" onClick={() => setReviewPage(1)}></div>
                  <div className="w-2 h-2 rounded-full bg-gray-300 cursor-pointer hover:bg-gray-400" onClick={() => setReviewPage(2)}></div>
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <div className="w-2 h-2 rounded-full bg-gray-300 cursor-pointer hover:bg-gray-400" onClick={() => setReviewPage(4)}></div>
                </div>
              </div>
            ) : (
              <div className="space-y-4 h-[400px] overflow-y-auto [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 rounded-lg p-6 border border-green-100 dark:border-green-800 text-center">
                  <CheckCircle2 className="h-12 w-12 text-green-600 mx-auto mb-3" />
                  <h3 className="font-semibold text-lg text-green-900 dark:text-green-100 mb-2">Bereit zum Absenden?</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                    Bitte überprüfe deine Angaben noch einmal. Du kannst jeden Bereich durch Klicken auf "Bearbeiten" anpassen.
                  </p>
                  <div className="flex flex-col gap-2 text-xs text-gray-500 dark:text-gray-400">
                    <p>✓ Alle Pflichtfelder ausgefüllt</p>
                    <p>✓ Daten werden verschlüsselt übertragen</p>
                    <p>✓ Das Team meldet sich zeitnah bei dir</p>
                  </div>
                </div>

                {/* Page Indicator with inline navigation */}
                <div className="flex justify-center items-center gap-3 pt-4">
                  <button
                    onClick={() => setReviewPage(3)}
                    className="w-8 h-8 rounded-full border border-gray-200 dark:border-gray-700 flex items-center justify-center text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors flex-shrink-0"
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </button>
                  <div className="flex gap-2 items-center">
                    <div className="w-2 h-2 rounded-full bg-gray-300 cursor-pointer hover:bg-gray-400" onClick={() => setReviewPage(1)}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-300 cursor-pointer hover:bg-gray-400" onClick={() => setReviewPage(2)}></div>
                    <div className="w-2 h-2 rounded-full bg-gray-300 cursor-pointer hover:bg-gray-400" onClick={() => setReviewPage(3)}></div>
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  </div>
                  <button
                    onClick={handleNext}
                    className="w-8 h-8 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 flex items-center justify-center text-white shadow-sm transition-all flex-shrink-0"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        )

      default:
        return null
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Dark overlay */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-pointer" 
        onClick={onClose}
      />
      
      {/* Modal */}
              <Card 
          className="relative w-full max-w-md mx-4 border-none shadow-2xl bg-white dark:bg-gray-900"
          onClick={(e) => e.stopPropagation()}
        >

        {isCompleted ? (
          /* Completion Animation */
          <div className="p-8 text-center">
            <div className="mb-6">
              {/* Animated checkmark */}
              <div className="mx-auto w-20 h-20 bg-gradient-to-r from-green-400 to-green-600 rounded-full flex items-center justify-center animate-bounce">
                <svg 
                  className="w-10 h-10 text-white animate-pulse" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={3} 
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 animate-fade-in">
                Du bist einen Schritt näher dem Team beizutreten! 🎉
              </h2>
                             <p className="text-gray-600 dark:text-gray-400 animate-fade-in-delay">
                Das Team meldet sich bei dir, sobald alle Daten ausgewertet wurden.
               </p>
              
              {/* Loading dots */}
              <div className="flex justify-center space-x-2 mt-6">
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
              </div>
              
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-4">
                Vielen Dank für dein Interesse!
              </p>
            </div>
          </div>
        ) : (
          /* Normal onboarding flow */
          <>
            <CardHeader className="pb-4">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Willkommen bei SalesCrew</CardTitle>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    {currentStep}/{totalSteps}
                  </span>
                </div>
                <Progress value={progress} className="h-2" />
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {renderStep()}
              
              {/* Normal navigation (for steps 1-12) */}
              {currentStep !== 13 && (
              <div className="flex gap-3 pt-4">
                {currentStep > 1 && (
                  <Button
                    variant="outline"
                    onClick={handleBack}
                    className="flex-1"
                  >
                    Zurück
                  </Button>
                )}
                <Button
                  onClick={handleNext}
                  disabled={!canProceed()}
                  className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                >
                    {currentStep === 12 ? "Zur Überprüfung" : "Weiter"}
                </Button>
              </div>
              )}

              {/* Review step navigation - Pages 1-3 */}
              {currentStep === 13 && reviewPage < 4 && (
                <div className="flex gap-3 pt-4">
                  {reviewPage > 1 && (
                    <Button
                      variant="outline"
                      onClick={() => setReviewPage(reviewPage - 1)}
                      className="flex-1"
                    >
                      Zurück
                    </Button>
                  )}
                  {reviewPage === 1 && (
                    <Button
                      variant="outline"
                      onClick={() => setCurrentStep(12)}
                      className="flex-1"
                    >
                      Zurück zu Schritt 12
                    </Button>
                  )}
                  <Button
                    onClick={() => setReviewPage(reviewPage + 1)}
                    className="flex-1 bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700"
                  >
                    Weiter
                  </Button>
                </div>
              )}


              {/* Neu beginnen link - subtle footer */}
              {currentStep > 1 && currentStep < 13 && (
                <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
                  <button
                    onClick={startFresh}
                    className="text-xs text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors underline"
                  >
                    Neu beginnen
                  </button>
                </div>
              )}
            </CardContent>
          </>
        )}
      </Card>
      
      {/* Custom CSS for animations */}
      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        
        .animate-fade-in {
          animation: fade-in 0.6s ease-out;
        }
        
        .animate-fade-in-delay {
          animation: fade-in 0.6s ease-out 0.3s both;
        }
      `}</style>
    </div>
  )
} 