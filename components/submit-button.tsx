'use client'

import { confermaInvio } from './conferma'
import type { ComponentProps } from 'react'
import { useFormStatus } from 'react-dom'

// Pulsante di invio che si disabilita mentre la Server Action è in corso.
export function SubmitButton({ children, pendingText, confirm, ...props }: ComponentProps<'button'> & { pendingText?: string; confirm?: string }) {
  const { pending } = useFormStatus()
  return (
    <button
      type="submit"
      disabled={pending || props.disabled}
      onClick={(e) => {
        if (confirm) confermaInvio(e, confirm)
      }}
      {...props}
    >
      {pending ? (pendingText ?? '…') : children}
    </button>
  )
}
