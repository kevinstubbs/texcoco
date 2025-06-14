// app/components/ExtensionErrorFilter.tsx
'use client'

import { useEffect } from 'react'

export default function ExtensionErrorFilter() {
    useEffect(() => {
        const onError = (event: ErrorEvent) => {
            // if the script URL is from an extension, swallow it
            if (event.filename?.startsWith('chrome-extension://')) {
                event.stopImmediatePropagation()
                event.preventDefault()
            }
        }

        const onRejection = (event: PromiseRejectionEvent) => {
            const reason = event.reason
            const stack = (reason && reason.stack) || ''
            // if the stack trace mentions a chrome-extension URL, swallow it
            if (stack.includes('chrome-extension://')) {
                event.stopImmediatePropagation()
                event.preventDefault()
            }
        }

        window.addEventListener('error', onError, true)
        window.addEventListener('unhandledrejection', onRejection, true)

        return () => {
            window.removeEventListener('error', onError, true)
            window.removeEventListener('unhandledrejection', onRejection, true)
        }
    }, [])

    return null
}
