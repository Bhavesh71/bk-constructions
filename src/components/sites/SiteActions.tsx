'use client'

import { useState } from 'react'
import { MoreVertical, Trash2, Edit, Loader2 } from 'lucide-react'
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
  const [deleting, setDeleting] = useState(false)

  async function handleDelete() {
    if (!confirm(`Are you sure you want to delete "${siteName}"? This will delete all records.`)) return
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
      setOpen(false)
    }
  }

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.preventDefault(); setOpen(!open) }}
        className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-gray-100 rounded-xl shadow-lg z-20 overflow-hidden">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
              Delete Site
            </button>
          </div>
        </>
      )}
    </div>
  )
}
