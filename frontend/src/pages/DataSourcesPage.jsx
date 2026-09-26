import React from 'react'
import { Database, ShieldCheck, Layers, FileCheck } from 'lucide-react'
import DataFreshnessDashboard from '../components/data/DataFreshnessDashboard'
import DataPipelineDiagram from '../components/data/DataPipelineDiagram'
import DatasetRegistryTable from '../components/data/DatasetRegistryTable'

import { useGlobal } from '../context/GlobalContext'

export default function DataSourcesPage() {
  const { t } = useGlobal()
  return (
    <div className="flex-1 flex flex-col min-h-0 space-y-6 pb-12">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-2xl bg-oceanBlue/10 text-oceanBlue flex items-center justify-center shadow-xs flex-shrink-0">
            <Database size={19} />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-black text-navy leading-tight tracking-tight">
              {t ? t('pages.data_title', 'Satellite Pipeline & Ingestion Architecture') : 'Satellite Pipeline & Ingestion Architecture'}
            </h1>
            <p className="text-[11px] text-textMuted mt-0.5">
              {t('14+ Unified Marine Earth Observation & Statutory Feeds • Full Lineage & Cadence')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 rounded-2xl bg-white border border-borderLight text-textMuted font-mono flex items-center gap-1.5">
            <ShieldCheck size={13} className="text-emerald-500" />
            <span>{t('Open Geospatial Consortium (OGC) Aligned')}</span>
          </span>
        </div>
      </div>

      {/* 1. Live Ingestion & Freshness Engine */}
      <DataFreshnessDashboard />

      {/* 2. End-to-End Pipeline Architecture */}
      <DataPipelineDiagram />

      {/* 3. Searchable Dataset Registry Table & Machine Contract Inspector */}
      <DatasetRegistryTable />
    </div>
  )
}
