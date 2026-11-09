"use client"

import { cn } from "@/lib/utils"

interface OnboardingLayoutProps {
  children: React.ReactNode
  currentStep: number
  totalSteps: number
}

export function OnboardingLayout({ children, currentStep, totalSteps }: OnboardingLayoutProps) {
  const progress = (currentStep / totalSteps) * 100

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/30">
      {/* Progress bar at top */}
      <div className="fixed top-0 left-0 right-0 z-50 h-1 bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      <main className="relative flex min-h-screen flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-3xl">
          {/* Header */}
          <header className="mb-8 text-center">
            <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10">
              <svg className="h-7 w-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Setup Usaha Pertama</h1>
            <p className="mt-2 text-muted-foreground">
              Ikuti langkah-langkah di bawah untuk menyiapkan usaha Anda
            </p>
          </header>

          {/* Step indicator */}
          <nav className="mb-8" aria-label="Onboarding progress">
            <ol className="flex items-center justify-center gap-1" role="list">
              {Array.from({ length: totalSteps }, (_, i) => {
                const step = i + 1
                const isActive = step === currentStep
                const isComplete = step < currentStep
                return (
                  <li key={step} className="flex items-center">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-full text-sm font-semibold transition-all duration-300",
                        isComplete
                          ? "bg-green-500 text-white"
                          : isActive
                          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {isComplete ? (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        step
                      )}
                    </div>
                    {step < totalSteps && (
                      <div
                        className={cn(
                          "h-1 w-16 transition-all duration-300",
                          step < currentStep ? "bg-green-500" : "bg-muted"
                        )}
                      />
                    )}
                  </li>
                )
              })}
            </ol>
          </nav>

          {/* Content */}
          <div className="rounded-2xl border bg-card shadow-sm">
            <div className="p-6 sm:p-8">{children}</div>
          </div>

          {/* Footer */}
          <footer className="mt-6 text-center text-sm text-muted-foreground">
            <p>Butuh bantuan? <a href="/help" className="underline hover:text-primary">Hubungi support</a></p>
          </footer>
        </div>
      </main>
    </div>
  )
}