'use client'

import { Provider } from 'jotai'
import { PropsWithChildren } from 'react'

export const Providers = ({ children }: PropsWithChildren) => {
    return (
        <Provider>
            {children}
        </Provider>
    )
}
