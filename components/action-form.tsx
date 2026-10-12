'use client'

import { useActionState, type ComponentProps } from 'react'
import type { FormState } from '@/app/actions'

// Form collegato a una Server Action che può restituire un messaggio d'errore.
export function ActionForm({
  action,
  children,
  ...props
}: Omit<ComponentProps<'form'>, 'action'> & { action: (prev: FormState, fd: FormData) => Promise<FormState> }) {
  const [state, formAction] = useActionState(action, undefined)
  return (
    <form action={formAction} {...props}>
      {children}
      {state?.error && (
        <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}
    </form>
  )
}
