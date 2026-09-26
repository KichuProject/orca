import { useGlobal } from '../../context/GlobalContext'
import React from 'react'
import { useQuery } from '@tanstack/react-query'
import client from '../../api/client'

export default function SystemStatus({ compact = false }) {
  const { t } = useGlobal()
  const { data, isError, isLoading } = useQuery({
    queryKey: ['system-health'],
    queryFn: () => client.get('/api/system-health').then(r => r.data),
    refetchInterval: 60_000,
    retry: 1,
  })

  const isOk = !isError && !isLoading && data

  if (compact) {
    return (
      <span
        className="flex items-center gap-1.5 text-xs font-medium cursor-pointer select-none"
        title={isOk ? t('ORCA systems operational') : t('System status unknown')}
      >
        <span
          className={`w-2 h-2 rounded-full ${
            isLoading ? 'bg-warningAmber pulse-dot' :
            isError   ? 'bg-dangerRed' :
                        'bg-safeGreen pulse-dot'
          }`}
        />
        <span className={isError ? 'text-dangerRed' : 'text-safeGreen'}>
          {isLoading ? t('Checking…') : isError ? t('Offline') : t('Operational')}
        </span>
      </span>
    )
  }

  return (
    <div className="flex items-center gap-2">
      <span
        className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
          isLoading ? 'bg-warningAmber pulse-dot' :
          isError   ? 'bg-dangerRed' :
                      'bg-safeGreen pulse-dot'
        }`}
      />
      <span className="text-sm font-semibold text-navy">ORCA</span>
      <span className={`text-sm font-medium ${
        isError ? 'text-dangerRed' : 'text-safeGreen'
      }`}>
        ● {isLoading ? t('Checking…') : isError ? t('Offline') : t('Operational')}
      </span>
    </div>
  )
}

export { SystemStatus as SystemStatusIndicator }
