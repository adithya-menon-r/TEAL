import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { MotionConfig } from 'motion/react'
import '@fontsource-variable/manrope'
import '@fontsource-variable/jetbrains-mono'
import './index.css'
import App from './App.tsx'
import { isMock } from '@/lib/env'
import { captureMockFlags } from '@/lib/mock/storage'

if (isMock) captureMockFlags()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Honour prefers-reduced-motion for every motion/react animation. */}
    <MotionConfig reducedMotion="user">
      <App />
    </MotionConfig>
  </StrictMode>,
)
