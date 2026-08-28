"use client"

import { useState, useEffect, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { 
  GraduationCap, 
  Video,
  Check,
  X,
  Loader2,
  FileText,
  HelpCircle,
  Clock,
  Play,
  XIcon,
  Search,
  ThumbsUp,
  ThumbsDown,
  Eye
} from "lucide-react"
import VideoPlayer from "@/components/VideoPlayer"
import PDFReader from "@/components/PDFReader"
import Quiz from "@/components/Quiz"

export default function SchulungenVideosPage() {
  const [activeTab, setActiveTab] = useState("schulungen")
  const [selectedSchulung, setSelectedSchulung] = useState<any>(null)
  const [showVideoPlayer, setShowVideoPlayer] = useState(false)
  const [showPDFReader, setShowPDFReader] = useState(false)
  const [showQuiz, setShowQuiz] = useState(false)
  const [currentTrainingStep, setCurrentTrainingStep] = useState(1)
  const [trainingStartTime, setTrainingStartTime] = useState<number | null>(null)
  
  // Videos section state
  const [searchQuery, setSearchQuery] = useState("")
  const [isAIMode, setIsAIMode] = useState(false)
  
  const fullSubtitle = "Erweitere dein Wissen und werde der beste Promotor!"
  const [animatedSubtitle, setAnimatedSubtitle] = useState(fullSubtitle.split('').map(() => '\u00A0').join(''))
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Load state from localStorage on component mount
  useEffect(() => {
    const savedVideoPlayer = localStorage.getItem('showVideoPlayer')
    const savedPDFReader = localStorage.getItem('showPDFReader')
    const savedQuiz = localStorage.getItem('showQuiz')
    const savedSchulung = localStorage.getItem('selectedSchulung')
    const savedStep = localStorage.getItem('currentTrainingStep')
    const savedStartTime = localStorage.getItem('trainingStartTime')
    
    if (savedVideoPlayer === 'true') {
      setShowVideoPlayer(true)
    }
    if (savedPDFReader === 'true') {
      setShowPDFReader(true)
    }
    if (savedQuiz === 'true') {
      setShowQuiz(true)
    }
    if (savedSchulung) {
      setSelectedSchulung(JSON.parse(savedSchulung))
    }
    if (savedStep) {
      setCurrentTrainingStep(parseInt(savedStep))
    }
    if (savedStartTime) {
      setTrainingStartTime(parseInt(savedStartTime))
    }
  }, [])

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('showVideoPlayer', showVideoPlayer.toString())
  }, [showVideoPlayer])

  useEffect(() => {
    localStorage.setItem('showPDFReader', showPDFReader.toString())
  }, [showPDFReader])

  useEffect(() => {
    localStorage.setItem('showQuiz', showQuiz.toString())
  }, [showQuiz])

  useEffect(() => {
    if (selectedSchulung) {
      localStorage.setItem('selectedSchulung', JSON.stringify(selectedSchulung))
    } else {
      localStorage.removeItem('selectedSchulung')
    }
  }, [selectedSchulung])

  useEffect(() => {
    localStorage.setItem('currentTrainingStep', currentTrainingStep.toString())
  }, [currentTrainingStep])

  useEffect(() => {
    if (trainingStartTime) {
      localStorage.setItem('trainingStartTime', trainingStartTime.toString())
    } else {
      localStorage.removeItem('trainingStartTime')
    }
  }, [trainingStartTime])

  useEffect(() => {
    setAnimatedSubtitle(fullSubtitle.split('').map(() => '\u00A0').join(''))

    let currentTypedIndex = 0
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    intervalRef.current = setInterval(() => {
      if (currentTypedIndex < fullSubtitle.length) {
        setAnimatedSubtitle(
          fullSubtitle.substring(0, currentTypedIndex + 1) +
          Array(fullSubtitle.length - (currentTypedIndex + 1)).fill('\u00A0').join('')
        )
        currentTypedIndex++
      } else {
        if (intervalRef.current) {
          clearInterval(intervalRef.current)
          intervalRef.current = null
        }
      }
    }, 50)

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
    }
  }, [])

  // Mock schulungen data
  const schulungen = [
    {
      id: 1,
      name: "Grundlagen des Verkaufs",
      purpose: "Lerne die wichtigsten Verkaufstechniken und Kundenansätze für erfolgreiche Promotionen",
      duration: "25 Min",
      status: "erledigt",
      components: {
        video: { required: true, completed: true, duration: "8 Min" },
        pdf: { required: true, completed: true, duration: "12 Min" },
        quiz: { required: true, completed: true, duration: "5 Min" }
      }
    },
    {
      id: 2,
      name: "Produktpräsentation",
      purpose: "Wie du Produkte überzeugend präsentierst und vorführst - von der ersten Ansprache bis zum Abschluss",
      duration: "35 Min",
      status: "unterbrochen",
      components: {
        video: { required: true, completed: true, duration: "15 Min" },
        pdf: { required: true, completed: false, duration: "12 Min" },
        quiz: { required: true, completed: false, duration: "8 Min" }
      }
    },
    {
      id: 3,
      name: "Kundeneinwände behandeln",
      purpose: "Professioneller Umgang mit Einwänden und Beschwerden während der Promotion",
      duration: "20 Min",
      status: "nicht erledigt",
      components: {
        video: { required: false, completed: false, duration: "0 Min" },
        pdf: { required: true, completed: false, duration: "10 Min" },
        quiz: { required: true, completed: false, duration: "10 Min" }
      }
    },
    {
      id: 4,
      name: "Teamarbeit & Kommunikation",
      purpose: "Effektive Zusammenarbeit im Promotionsteam und klare Kommunikation mit Kollegen",
      duration: "30 Min",
      status: "erledigt",
      components: {
        video: { required: true, completed: true, duration: "18 Min" },
        pdf: { required: false, completed: false, duration: "0 Min" },
        quiz: { required: true, completed: true, duration: "12 Min" }
      }
    },
    {
      id: 5,
      name: "Digitale Tools & Apps",
      purpose: "Verwendung der SalesCrew App und digitaler Hilfsmittel für optimale Arbeitsabläufe",
      duration: "15 Min",
      status: "nicht erledigt",
      components: {
        video: { required: true, completed: false, duration: "6 Min" },
        pdf: { required: true, completed: false, duration: "4 Min" },
        quiz: { required: true, completed: false, duration: "5 Min" }
      }
    },
    {
      id: 6,
      name: "Sicherheit am Arbeitsplatz",
      purpose: "Wichtige Sicherheitsrichtlinien und Verhaltensregeln für Promotionseinsätze",
      duration: "18 Min",
      status: "unterbrochen",
      components: {
        video: { required: false, completed: false, duration: "0 Min" },
        pdf: { required: true, completed: true, duration: "10 Min" },
        quiz: { required: true, completed: false, duration: "8 Min" }
      }
    }
  ]

  // Mock videos data
  const videos = [
    {
      id: 3,
      title: "Produktpräsentation Masterclass",
      thumbnail: "/api/placeholder/400/225",
      likes: 48,
      dislikes: 3,
      views: 56,
      duration: "15:22",
      uploadDate: "vor 3 Tagen"
    },
    {
      id: 5,
      title: "Digitale Tools für Promotoren",
      thumbnail: "/api/placeholder/400/225",
      likes: 29,
      dislikes: 4,
      views: 41,
      duration: "7:56",
      uploadDate: "vor 4 Tagen"
    },
    {
      id: 4,
      title: "Teamwork und Kommunikation",
      thumbnail: "/api/placeholder/400/225",
      likes: 38,
      dislikes: 1,
      views: 52,
      duration: "10:18",
      uploadDate: "vor 1 Woche"
    },
    {
      id: 1,
      title: "Verkaufstechniken für Anfänger",
      thumbnail: "/api/placeholder/400/225", // 16:9 aspect ratio
      likes: 42,
      dislikes: 2,
      views: 58,
      duration: "12:34",
      uploadDate: "vor 2 Wochen"
    },
    {
      id: 2,
      title: "Kundenbetreuung und Service Excellence",
      thumbnail: "/api/placeholder/400/225",
      likes: 31,
      dislikes: 1,
      views: 45,
      duration: "8:45",
      uploadDate: "vor 1 Monat"
    }
  ]

  // Filter videos based on search query
  const filteredVideos = videos.filter(video =>
    video.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "erledigt":
        return <Check className="h-5 w-5 text-green-500" />
      case "unterbrochen":
        return <Loader2 className="h-5 w-5 text-orange-500 animate-spin" />
      case "nicht erledigt":
        return <X className="h-5 w-5 text-red-500" />
      default:
        return <X className="h-5 w-5 text-red-500" />
    }
  }

  const getStatusColor = (status: string) => {
    return "text-gray-500 opacity-30"
  }

  const getCardShadow = (status: string) => {
    switch (status) {
      case "erledigt":
        return "shadow-md shadow-green-500/20 hover:shadow-lg hover:shadow-green-500/30"
      case "unterbrochen":
        return "shadow-md shadow-orange-500/20 hover:shadow-lg hover:shadow-orange-500/30"
      case "nicht erledigt":
        return "shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30"
      default:
        return "shadow-md shadow-red-500/20 hover:shadow-lg hover:shadow-red-500/30"
    }
  }

  const renderComponentIndicators = (components: any) => {
    const indicators = []
    
    if (components.video.required) {
      indicators.push({
        icon: Video,
        completed: components.video.completed,
        key: 'video'
      })
    }
    
    if (components.pdf.required) {
      indicators.push({
        icon: FileText,
        completed: components.pdf.completed,
        key: 'pdf'
      })
    }
    
    if (components.quiz.required) {
      indicators.push({
        icon: HelpCircle,
        completed: components.quiz.completed,
        key: 'quiz'
      })
    }
    
    return (
      <div className="flex items-center space-x-2 mt-3">
        {indicators.map((indicator) => {
          const IconComponent = indicator.icon
          return (
            <div key={indicator.key} className="relative">
              <IconComponent 
                className={`h-4 w-4 ${
                  indicator.completed 
                    ? 'text-green-500' 
                    : 'text-gray-300 dark:text-gray-600'
                }`} 
              />
              {indicator.completed && (
                <Check className="h-2 w-2 text-green-500 absolute -top-1 -right-1 bg-white dark:bg-gray-900 rounded-full" />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const renderStepIndicators = (schulung: any) => {
    const steps: Array<{
      icon: any;
      label: string;
      description: string;
      completed: boolean;
      duration: string;
      key: string;
    }> = []
    
    if (schulung.components.video.required) {
      steps.push({
        icon: Video,
        label: "Video ansehen",
        description: "Lernvideo durcharbeiten",
        completed: schulung.components.video.completed,
        duration: schulung.components.video.duration,
        key: 'video'
      })
    }
    
    if (schulung.components.pdf.required) {
      steps.push({
        icon: FileText,
        label: "Dokument lesen",
        description: "Schulungsunterlagen studieren",
        completed: schulung.components.pdf.completed,
        duration: schulung.components.pdf.duration,
        key: 'pdf'
      })
    }
    
    if (schulung.components.quiz.required) {
      steps.push({
        icon: HelpCircle,
        label: "Quiz absolvieren",
        description: "Wissen testen und bestätigen",
        completed: schulung.components.quiz.completed,
        duration: schulung.components.quiz.duration,
        key: 'quiz'
      })
    }

    return (
      <div className="space-y-0">
        {steps.map((step, index) => {
          const isCompleted = step.completed
          const isLastStep = index === steps.length - 1
          const nextStepCompleted = !isLastStep ? steps[index + 1].completed : false
          const lineColor = isCompleted && nextStepCompleted ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
          
          return (
            <div key={step.key} className="relative">
              {/* Step Container */}
              <div className="flex items-center space-x-4 py-3">
                {/* Icon Circle */}
                <div className={`relative flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center border-2 z-10 ${
                  isCompleted 
                    ? 'bg-green-500 border-green-500 shadow-lg shadow-green-500/25' 
                    : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
                }`}>
                  <step.icon className={`h-5 w-5 ${
                    isCompleted ? 'text-white' : 'text-gray-400 dark:text-gray-500'
                  }`} />
                  {isCompleted && (
                    <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-600 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-900">
                      <Check className="h-3 w-3 text-white" />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h5 className={`text-base font-semibold ${
                      isCompleted ? 'text-green-600 dark:text-green-400' : 'text-gray-900 dark:text-gray-100'
                    }`}>
                      {step.label}
                    </h5>
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                      {step.duration}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {step.description}
                  </p>
                </div>
              </div>

              {/* Connecting Line */}
              {!isLastStep && (
                <div className={`absolute left-6 top-16 w-0.5 h-8 ${lineColor} transition-colors duration-300`} />
              )}
            </div>
          )
        })}
      </div>
    )
  }

  // Show video player if activated
  if (showVideoPlayer) {
    return (
      <VideoPlayer
        videoTitle="Produktpräsentation"
        videoDescription="In diesem umfassenden Lernvideo lernen Sie die wichtigsten Techniken für eine erfolgreiche Produktpräsentation. Wir zeigen Ihnen, wie Sie Produkte überzeugend präsentieren und vorführen - von der ersten Ansprache bis zum erfolgreichen Abschluss. Sie erfahren, wie Sie die Aufmerksamkeit Ihrer Kunden gewinnen, Produktvorteile effektiv kommunizieren und häufige Einwände professionell behandeln. Das Video enthält praktische Beispiele, bewährte Verkaufstechniken und Tipps von erfahrenen Promotoren. Nach dem Ansehen dieses Videos werden Sie in der Lage sein, Ihre Präsentationsfähigkeiten deutlich zu verbessern und mehr Verkaufserfolg zu erzielen."
        currentStep={1}
        totalSteps={3}
        stepType="Schulungsvideo"
        onBack={() => {
          setShowVideoPlayer(false)
          setCurrentTrainingStep(1)
          // Clear localStorage
          localStorage.removeItem('showVideoPlayer')
          localStorage.removeItem('currentTrainingStep')
        }}
        onPause={(progress, watchedPercentage) => {
          setShowVideoPlayer(false)
          // Keep localStorage for resuming
        }}
        onNextStep={() => {
          setShowVideoPlayer(false)
          setShowPDFReader(true)
          setCurrentTrainingStep(2)
        }}
      />
    )
  }

  // Show PDF reader if activated
  if (showPDFReader) {
    return (
      <PDFReader
        pdfTitle="Produktpräsentation - Schulungsunterlagen"
        pdfDescription="Detaillierte Unterlagen zur Produktpräsentation mit praktischen Tipps und Beispielen"
        currentStep={2}
        totalSteps={3}
        stepType="Dokument"
        onBack={() => {
          setShowPDFReader(false)
          setShowVideoPlayer(true)
          setCurrentTrainingStep(1)
        }}
        onPause={(progress, readPercentage) => {
          setShowPDFReader(false)
          // Keep localStorage for resuming
        }}
        onNextStep={() => {
          setShowPDFReader(false)
          setShowQuiz(true)
          setCurrentTrainingStep(3)
        }}
      />
    )
  }

  // Show quiz if activated
  if (showQuiz) {
    return (
      <Quiz
        quizTitle="Produktpräsentation - Abschlusstest"
        quizDescription="Testen Sie Ihr Wissen über die Produktpräsentation"
        currentStep={3}
        totalSteps={3}
        stepType="Quiz"
        trainingStartTime={trainingStartTime}
        onBack={() => {
          setShowQuiz(false)
          setShowPDFReader(true)
          setCurrentTrainingStep(2)
        }}
        onPause={(progress, completedPercentage) => {
          setShowQuiz(false)
          // Keep localStorage for resuming
        }}
        onComplete={() => {
          // Clear all training state
          setShowQuiz(false)
          setSelectedSchulung(null)
          setCurrentTrainingStep(1)
          setTrainingStartTime(null)
          // Clear localStorage
          localStorage.removeItem('showVideoPlayer')
          localStorage.removeItem('showPDFReader')
          localStorage.removeItem('showQuiz')
          localStorage.removeItem('selectedSchulung')
          localStorage.removeItem('currentTrainingStep')
          localStorage.removeItem('trainingStartTime')
        }}
      />
    )
  }

  return (
    <>
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2 relative">
        {/* Invisible space reservation - renders full content to establish container height */}
        <div className="opacity-0 pointer-events-none">
          <h1 className="text-2xl font-bold tracking-tight">
            Schulungen & Videos
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Erweitere dein Wissen und werde der beste Promotor!
          </p>
        </div>
        
        {/* Actual visible content - positioned absolutely over the invisible content */}
        <div className="absolute top-0 left-0 right-0">
          <div className="space-y-2">
            <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
              Schulungen & Videos
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              {animatedSubtitle}
            </p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="relative">
        <div className="flex space-x-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg relative">
          {/* Sliding indicator */}
          <div 
            className={`absolute top-1 bottom-1 bg-white dark:bg-gray-700 rounded-md shadow-sm transition-all duration-300 ease-in-out ${
              activeTab === "schulungen" 
                ? "left-1 right-1/2 mr-0.5" 
                : "left-1/2 right-1 ml-0.5"
            }`}
          />
          
          <button
            onClick={() => setActiveTab("schulungen")}
            className="relative flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 z-10"
          >
            <div className="flex items-center justify-center space-x-2">
              <GraduationCap className={`h-4 w-4 transition-colors duration-200 ${
                activeTab === "schulungen" 
                  ? "text-blue-500" 
                  : "text-gray-600 dark:text-gray-400"
              }`} />
              <span className={`transition-all duration-200 ${
                activeTab === "schulungen" 
                  ? "text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-blue-600" 
                  : "text-gray-600 dark:text-gray-400"
              }`}>Schulungen</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab("videos")}
            className="relative flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-200 z-10"
          >
            <div className="flex items-center justify-center space-x-2">
              <Video className={`h-4 w-4 transition-colors duration-200 ${
                activeTab === "videos" 
                  ? "text-purple-500" 
                  : "text-gray-600 dark:text-gray-400"
              }`} />
              <span className={`transition-all duration-200 ${
                activeTab === "videos" 
                  ? "text-transparent bg-clip-text bg-gradient-to-r from-purple-500 to-pink-500" 
                  : "text-gray-600 dark:text-gray-400"
              }`}>Videos</span>
            </div>
          </button>
        </div>
      </div>

      {/* Content */}
      {activeTab === "schulungen" && (
        <div className="space-y-4">
          {schulungen.map((schulung) => (
            <Card 
              key={schulung.id} 
              className={`border-none bg-white dark:bg-gray-900 transition-shadow duration-200 cursor-pointer ${getCardShadow(schulung.status)}`}
              onClick={() => setSelectedSchulung(schulung)}
            >
              <CardContent className="p-0 relative">
                {/* Headline */}
                <div className="px-6 pt-6 pb-4">
                  <div className="flex justify-between">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 leading-tight flex-1 pr-4">
                      {schulung.name}
                    </h3>
                    <div className="flex items-center space-x-1 opacity-40 whitespace-nowrap flex-shrink-0 self-center">
                      <Clock className="h-3 w-3 text-gray-500 dark:text-gray-400" />
                      <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {schulung.duration}
                      </span>
                    </div>
                  </div>
                </div>
                
                {/* Enhanced subheadline container - Full Width */}
                <div className="bg-gray-50/60 dark:bg-gray-800/40 p-4 border-t border-b border-gray-200/50 dark:border-gray-700/50">
                  <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                    {schulung.purpose}
                  </p>
                </div>
                
                {/* Component Indicators with Status */}
                <div className="px-6 pb-3 pt-2 flex items-center justify-between">
                  {renderComponentIndicators(schulung.components)}
                  
                  {/* Status Icon & Text - Bottom Right */}
                  <div className="flex flex-col items-center space-y-0.5">
                    <div className="scale-75">
                      {getStatusIcon(schulung.status)}
                    </div>
                    <span className={`text-[10px] font-medium ${getStatusColor(schulung.status)}`}>
                      {schulung.status}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeTab === "videos" && (
        <div className="space-y-6">
          {/* Search Bar */}
          <div className="relative max-w-md mx-auto">
            <div className={`relative p-0.5 rounded-full ${
              isAIMode 
                ? 'bg-gradient-to-r from-purple-500 to-pink-500 shadow-lg shadow-purple-500/25' 
                : 'bg-transparent'
            }`}>
              <div className="relative bg-white dark:bg-gray-900 rounded-full overflow-hidden">
                {isAIMode && (
                  <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-pink-500/20"></div>
                )}
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-20">
                  <Search className="h-4 w-4 text-gray-400" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder={isAIMode ? "Erkläre das gewünschte Video" : "Suche nach Videonamen"}
                  className={`relative w-full pl-10 pr-16 py-3 rounded-full text-sm text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none transition-all duration-200 z-10 border ${
                    isAIMode 
                      ? 'bg-transparent border-transparent' 
                      : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 shadow-md'
                  }`}
                />
                
                {/* Eddie AI Icon */}
                <div className="absolute inset-y-0 right-0 pr-3 flex items-center z-20">
                  <button
                    onClick={() => setIsAIMode(!isAIMode)}
                    className={`p-2 rounded-full transition-colors duration-200 focus:outline-none ${
                      isAIMode 
                        ? 'hover:bg-white/20' 
                        : 'hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    <img
                      src="/icons/robot 1.svg"
                      alt="Eddie KI Assistant"
                      className={`h-5 w-5 transition-opacity duration-200 ${
                        isAIMode 
                          ? 'brightness-0 saturate-100 invert(25%) sepia(15%) saturate(2498%) hue-rotate(316deg) brightness(99%) contrast(97%)' 
                          : 'opacity-60 hover:opacity-80'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Videos List */}
          <div className="space-y-4">
            {filteredVideos.length > 0 ? (
              filteredVideos.map((video) => (
                <div key={video.id} className="bg-white dark:bg-gray-900 rounded-lg shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow duration-200 cursor-pointer">
                  {/* Video Thumbnail */}
                  <div className="relative aspect-video bg-gray-200 dark:bg-gray-700">
                    <img
                      src={video.thumbnail}
                      alt={video.title}
                      className="w-full h-full object-cover"
                    />
                    {/* Duration Badge */}
                    <div className="absolute bottom-2 right-2 bg-black/80 text-white text-xs px-2 py-1 rounded">
                      {video.duration}
                    </div>
                    {/* Play Button Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 hover:opacity-100 transition-opacity duration-200">
                      <svg className="h-12 w-12 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </div>
                  </div>

                  {/* Video Info */}
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 line-clamp-2">
                      {video.title}
                    </h3>
                    
                    {/* Stats Row */}
                    <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-4">
                        {/* Views */}
                        <div className="flex items-center space-x-1">
                          <Eye className="h-4 w-4" />
                          <span>{video.views.toLocaleString()}</span>
                        </div>
                        
                        {/* Likes */}
                        <div className="flex items-center space-x-1">
                          <ThumbsUp className="h-4 w-4" />
                          <span>{video.likes}</span>
                        </div>
                        
                        {/* Dislikes */}
                        <div className="flex items-center space-x-1">
                          <ThumbsDown className="h-4 w-4" />
                          <span>{video.dislikes}</span>
                        </div>
                      </div>
                      
                      {/* Upload Date */}
                      <span className="text-xs">
                        {video.uploadDate}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <Video className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                  Keine Videos gefunden
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Versuchen Sie einen anderen Suchbegriff
                </p>
              </div>
            )}
          </div>
        </div>
      )}

    </div>

    {/* Schulung Details Modal - Rendered outside main container */}
    {selectedSchulung && (
      <div 
        className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4"
        style={{ 
          zIndex: 99999,
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          width: '100vw',
          height: '100vh'
        }}
      >
        <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[85vh] overflow-hidden">
          {/* Modal Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-2 opacity-60">
              <Clock className="h-4 w-4 text-gray-500 dark:text-gray-400" />
              <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                {selectedSchulung.duration}
              </span>
            </div>
            <button
              onClick={() => setSelectedSchulung(null)}
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            >
              <XIcon className="h-4 w-4 text-gray-500 dark:text-gray-400" />
            </button>
          </div>

          {/* Modal Content */}
          <div className="p-6">
            {/* Title */}
            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100 mb-5">
              {selectedSchulung.name}
            </h3>

            {/* Step Indicators */}
            <div className="mb-6">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4 uppercase tracking-wide">
                Fortschritt
              </h4>
              <div className="relative">
                {renderStepIndicators(selectedSchulung)}
              </div>
            </div>

            {/* Description */}
            <div className="mb-5">
              <h4 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-2 uppercase tracking-wide">
                Beschreibung
              </h4>
              <p className="text-gray-700 dark:text-gray-300 leading-relaxed text-sm">
                {selectedSchulung.purpose}
              </p>
            </div>

            {/* Action Button */}
            {selectedSchulung.status !== "erledigt" && (
              <div className="flex justify-center">
                <button 
                  onClick={() => {
                    setShowVideoPlayer(true)
                    setSelectedSchulung(null)
                    setTrainingStartTime(Date.now())
                  }}
                  className="flex items-center space-x-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2.5 rounded-xl font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  <Play className="h-4 w-4" />
                  <span>
                    {selectedSchulung.status === "unterbrochen" ? "Schulung fortführen" : "Schulung starten"}
                  </span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    )}
  </>
  )
} 