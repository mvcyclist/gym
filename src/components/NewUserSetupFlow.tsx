import { useState } from 'react'
import type { UserProfile } from '../types/userProfile'
import { isEditingRoutine } from '../services/onboardingService'
import { EducationWelcomeScreen } from './EducationWelcomeScreen'
import { OnboardingFlow } from './OnboardingFlow'

interface NewUserSetupFlowProps {
  profile: UserProfile
  onComplete: () => void
  onCancel?: () => void
}

export function NewUserSetupFlow({ profile, onComplete, onCancel }: NewUserSetupFlowProps) {
  const skipEducation = isEditingRoutine(profile)
  const [phase, setPhase] = useState<'education' | 'onboarding'>(() =>
    skipEducation ? 'onboarding' : 'education',
  )

  if (!skipEducation && phase === 'education') {
    return <EducationWelcomeScreen onContinue={() => setPhase('onboarding')} />
  }

  return (
    <OnboardingFlow
      initialProfile={profile}
      onComplete={onComplete}
      onCancel={onCancel}
    />
  )
}
