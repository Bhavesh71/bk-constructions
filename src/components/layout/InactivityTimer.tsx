'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { signOut } from 'next-auth/react'
import { LogOut, Clock, ShieldAlert } from 'lucide-react'

// How long of inactivity before showing the warning (14 minutes)
const INACTIVITY_LIMIT_MS = 14 * 60 * 1000
// How long the warning countdown lasts before auto-logout (60 seconds)
const WARNING_DURATION_S = 60

// Events that count as "user activity"
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'mousemove', 'mousedown', 'keydown', 'touchstart', 'touchmove', 'scroll', 'wheel', 'click',
]

export function InactivityTimer() {
  const [showWarning, setShowWarning] = useState(false)
  const [countdown, setCountdown] = useState(WARNING_DURATION_S)

  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null)
  const warningShownAt = useRef<number | null>(null)

  // ── Clear countdown interval ───────────────────────────────────
  function clearCountdown() {
    if (countdownInterval.current) {
      clearInterval(countdownInterval.current)
      countdownInterval.current = null
    }
  }

  // ── Start the warning countdown ────────────────────────────────
  function startCountdown() {
    warningShownAt.current = Date.now()
    setCountdown(WARNING_DURATION_S)
    setShowWarning(true)

    countdownInterval.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - (warningShownAt.current ?? Date.now())) / 1000)
      const remaining = WARNING_DURATION_S - elapsed
      if (remaining <= 0) {
        clearCountdown()
        signOut({ callbackUrl: '/login' })
      } else {
        setCountdown(remaining)
      }
    }, 1000)
  }

  // ── Reset inactivity timer on any user activity ────────────────
  const resetTimer = useCallback(() => {
    // If warning is already showing, dismiss it and restart
    if (showWarning) {
      setShowWarning(false)
      clearCountdown()
    }

    if (inactivityTimer.current) clearTimeout(inactivityTimer.current)

    inactivityTimer.current = setTimeout(() => {
      startCountdown()
    }, INACTIVITY_LIMIT_MS)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showWarning])

  // ── Attach / detach event listeners ───────────────────────────
  useEffect(() => {
    // Start the timer immediately on mount
    inactivityTimer.current = setTimeout(startCountdown, INACTIVITY_LIMIT_MS)

    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, resetTimer, { passive: true })
    )

    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
      clearCountdown()
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, resetTimer)
      )
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Re-attach listeners whenever resetTimer reference changes
  // (i.e. when showWarning changes so the callback can dismiss the modal)
  useEffect(() => {
    ACTIVITY_EVENTS.forEach((event) =>
      window.removeEventListener(event, resetTimer)
    )
    ACTIVITY_EVENTS.forEach((event) =>
      window.addEventListener(event, resetTimer, { passive: true })
    )
    return () => {
      ACTIVITY_EVENTS.forEach((event) =>
        window.removeEventListener(event, resetTimer)
      )
    }
  }, [resetTimer])

  // ── "Stay logged in" handler ───────────────────────────────────
  function handleStayLoggedIn() {
    setShowWarning(false)
    clearCountdown()
    if (inactivityTimer.current) clearTimeout(inactivityTimer.current)
    inactivityTimer.current = setTimeout(startCountdown, INACTIVITY_LIMIT_MS)
  }

  // ── "Log out now" handler ──────────────────────────────────────
  function handleLogoutNow() {
    clearCountdown()
    signOut({ callbackUrl: '/login' })
  }

  if (!showWarning) return null

  // ── Warning modal ──────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 overflow-hidden animate-slide-up">

        {/* Header */}
        <div className="px-6 pt-6 pb-4 flex flex-col items-center text-center gap-3">
          {/* Animated icon */}
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center">
              <ShieldAlert className="w-8 h-8 text-amber-500 dark:text-amber-400" />
            </div>
            {/* Countdown ring */}
            <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-500 dark:bg-amber-400 flex items-center justify-center">
              <span className="text-white text-[10px] font-bold leading-none">{countdown}</span>
            </div>
          </div>

          <div>
            <h2 className="font-display font-bold text-gray-900 dark:text-white text-lg mb-1">
              Session Expiring Soon
            </h2>
            <p className="text-sm text-gray-500 dark:text-slate-400 leading-relaxed">
              You've been inactive for a while. For security, you'll be automatically signed out in
            </p>
          </div>

          {/* Big countdown */}
          <div className="flex items-center gap-2 px-5 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 w-full justify-center">
            <Clock className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0" />
            <span className="font-display font-bold text-2xl text-amber-600 dark:text-amber-400 tabular-nums">
              {String(Math.floor(countdown / 60)).padStart(2, '0')}:{String(countdown % 60).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Progress bar — depletes as countdown goes down */}
        <div className="px-6 pb-1">
          <div className="h-1.5 bg-gray-100 dark:bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full bg-amber-400 dark:bg-amber-500 transition-all duration-1000 ease-linear"
              style={{ width: `${(countdown / WARNING_DURATION_S) * 100}%` }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 py-5 flex gap-3">
          <button
            onClick={handleLogoutNow}
            className="btn-secondary flex-1 justify-center text-sm"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
          <button
            onClick={handleStayLoggedIn}
            className="btn-primary flex-1 justify-center text-sm"
          >
            Stay Logged In
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 dark:text-slate-500 pb-4">
          Move your mouse or press any key to dismiss
        </p>
      </div>
    </div>
  )
}
