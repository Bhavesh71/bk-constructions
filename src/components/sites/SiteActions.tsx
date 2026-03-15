'use client'

import { useState } from 'react'
import { MoreVertical, Trash2, Loader2, AlertTriangle, X } from 'lucide-react'
import { deleteSite } from '@/actions/sites'
import toast from 'react-hot-toast'
import { useRouter } from 'next/navigation'

interface SiteActionsProps {
  siteId: string
  siteName: string
}

export function SiteActions({ siteId, siteName }: SiteActionsProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    setDeleting(true)
    try {
      const result = await deleteSite(siteId)
      if (result.success) {
        toast.success('Site deleted')
        router.refresh()
      } else {
        toast.error(result.error || 'Failed to delete site')
      }
    } finally {
      setDeleting(false)
      setConfirmOpen(false)
      setOpen(false)
    }
  }

  return (
    <>
      <div className="relative">
        <button
          onClick={(e) => { e.preventDefault(); setOpen(!open) }}
          className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700 text-gray-400 hover:text-gray-600 dark:hover:text-slate-300 transition-colors"
        >
          <MoreVertical className="w-4 h-4" />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-1 w-40 bg-white dark:bg-slate-800 border border-gray-100 dark:border-slate-700 rounded-xl shadow-lg z-20 overflow-hidden">
              <button
                onClick={() => { setOpen(false); setConfirmOpen(true) }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete Site
              </button>
            </div>
          </>
        )}
      </div>

      {/* Confirm Delete Modal */}
      {confirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setConfirmOpen(false)} />
          <div className="relative bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-slate-700 w-full max-w-sm p-6">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              </div>
              <div>
                <h3 className="font-bold text-gray-900 dark:text-white text-sm">Delete Site?</h3>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-1">
                  <span className="font-semibold text-gray-700 dark:text-slate-200">"{siteName}"</span> and all its daily records, budget entries, and labour data will be permanently deleted.
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setConfirmOpen(false)} disabled={deleting}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-600 transition-colors">
                Cancel
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 px-4 py-2 rounded-xl text-sm font-semibold bg-red-500 text-white hover:bg-red-600 disabled:opacity-60 transition-colors flex items-center justify-center gap-2">
                {deleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
