import { createContext, useContext, type ReactNode } from 'react'
import { useUserProfile } from '../hooks/useUserProfile'

type UserProfileContextValue = ReturnType<typeof useUserProfile>

const UserProfileContext = createContext<UserProfileContextValue | null>(null)

export function UserProfileProvider({
  value,
  children,
}: {
  value: UserProfileContextValue
  children: ReactNode
}) {
  return (
    <UserProfileContext.Provider value={value}>
      {children}
    </UserProfileContext.Provider>
  )
}

export function useUserProfileContext(): UserProfileContextValue {
  const context = useContext(UserProfileContext)
  if (!context) {
    throw new Error('useUserProfileContext must be used within UserProfileProvider')
  }
  return context
}

export function useOptionalUserProfileContext(): UserProfileContextValue | null {
  return useContext(UserProfileContext)
}
