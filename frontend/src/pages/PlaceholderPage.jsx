import { useGlobal } from '../context/GlobalContext'
import React from 'react'
import { Construction } from 'lucide-react'

export default function PlaceholderPage({ title, icon: Icon, description }) {
  const { t } = useGlobal()
  return (
    <div className="flex-1 flex flex-col items-center justify-center py-24 px-6 text-center">
      <div className="w-16 h-16 rounded-2xl bg-oceanBlue/10 flex items-center justify-center mb-4">
        {Icon ? <Icon size={28} className="text-oceanBlue" /> : <Construction size={28} className="text-oceanBlue" />}
      </div>
      <h1 className="text-2xl font-bold text-navy mb-2">{t ? t(title) : title}</h1>
      <p className="text-textSecond text-base max-w-sm leading-relaxed">
        {description ? t(description) : t('This page is being designed. Check back shortly.')}
      </p>
      <div className="mt-6 flex items-center gap-2 px-4 py-2 rounded-xl bg-surface border border-borderLight">
        <span className="w-2 h-2 rounded-full bg-warningAmber pulse-dot" />
        <span className="text-sm text-textMuted font-medium">{t('Phase F1 — coming next')}</span>
      </div>
    </div>
  )
}
