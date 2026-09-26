import React from 'react'
import { NavLink, useLocation } from 'react-router-dom'
import { useGlobal } from '../../context/GlobalContext'
import {
  Home, MessageSquare, Globe2, ShieldAlert, Navigation2,
  Fish, Leaf, Shield, Bell, FileText, Database, Info,
  Sparkles, ChevronRight, Building2 
} from 'lucide-react'

const NAV_ITEMS = [
  { path: '/',           icon: Home,          key: 'home',        defaultLabel: 'Home',              defaultSub: 'Mission Dashboard',        id: 'nav-home' },
  { path: '/ask',        icon: MessageSquare, key: 'ask',         defaultLabel: 'Ask ORCA',          defaultSub: 'AI Assistant',             id: 'nav-ask' },
  { path: '/ocean',      icon: Globe2,        key: 'ocean',       defaultLabel: 'Ocean Explorer',    defaultSub: 'Live Ocean Data',          id: 'nav-ocean' },
  { path: '/safety',     icon: ShieldAlert,   key: 'safety',      defaultLabel: 'Safety & Hazards',  defaultSub: 'Warnings & Forecast',      id: 'nav-safety',  alertDot: true },
  { path: '/navigation', icon: Navigation2,   key: 'navigation',  defaultLabel: 'Navigation',        defaultSub: 'Route Planner',            id: 'nav-navigation' },
  { path: '/fisheries',  icon: Fish,          key: 'fisheries',   defaultLabel: 'Fisheries',         defaultSub: 'PFZ & Productivity',       id: 'nav-fisheries' },
  { path: '/ecology',    icon: Leaf,          key: 'ecology',     defaultLabel: 'Ecology',           defaultSub: 'Biodiversity & MPAs',      id: 'nav-ecology' },
  { path: '/geofencing', icon: Shield,        key: 'geofencing',  defaultLabel: 'Geofencing',        defaultSub: 'Maritime Zones & EEZ',     id: 'nav-geofencing' },
  { path: '/alerts',     icon: Bell,          key: 'alerts',      defaultLabel: 'Alerts',            defaultSub: 'My Alerts & Warnings',     id: 'nav-alerts',  badge: true },
  { path: '/reports',    icon: FileText,      key: 'reports',     defaultLabel: 'Reports',           defaultSub: 'Generate Reports',         id: 'nav-reports' },
  { path: '/data',       icon: Database,      key: 'data',        defaultLabel: 'Data Sources',      defaultSub: 'Our Data & Status',        id: 'nav-data' },
  { path: '/about',      icon: Info,          key: 'about',       defaultLabel: 'About ORCA',        defaultSub: 'Know More',                id: 'nav-about' },
]

function NavItem({ item, alertCount, t }) {
  const location = useLocation()
  const isActive = item.path === '/'
    ? location.pathname === '/'
    : location.pathname.startsWith(item.path)
  const Icon = item.icon
  const label = t ? (t(item.defaultLabel) || t(`nav.${item.key}`, item.defaultLabel)) : item.defaultLabel
  const sub = t ? (t(item.defaultSub) || t(`nav.${item.key}_sub`, item.defaultSub)) : item.defaultSub

  return (
    <NavLink
      to={item.path}
      id={item.id}
      aria-current={isActive ? 'page' : undefined}
      className={[
        'flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-xs font-semibold',
        'transition-all duration-150 cursor-pointer select-none group',
        isActive
          ? 'bg-blue-50/90 text-oceanBlue shadow-sm'
          : 'text-textSecond hover:bg-surface hover:text-navy',
      ].join(' ')}
    >
      <Icon
        size={18}
        className={[
          'flex-shrink-0 transition-colors',
          isActive ? 'text-oceanBlue' : 'text-textMuted group-hover:text-oceanBlue',
        ].join(' ')}
      />
      <div className="flex-1 min-w-0 leading-tight">
        <div className={`truncate ${isActive ? 'text-oceanBlue font-bold' : 'text-navy'}`}>
          {label}
        </div>
        <div className="text-[10px] text-textMuted truncate font-normal mt-0.5">{sub}</div>
      </div>
      {item.badge && alertCount > 0 && (
        <span className="flex-shrink-0 min-w-[18px] h-[18px] rounded-full bg-dangerRed text-white text-[10px] font-bold flex items-center justify-center px-1 leading-none shadow-sm">
          {alertCount}
        </span>
      )}
      {item.alertDot && (
        <span className="flex-shrink-0 w-2 h-2 rounded-full bg-dangerRed pulse-dot" />
      )}
    </NavLink>
  )
}

export default function Sidebar({ open }) {
  const { alertCount, t } = useGlobal()

  return (
    <aside
      aria-label="Main navigation"
      style={{ width: open ? '230px' : '0px' }}
      className={[
        'sticky top-16 h-[calc(100vh-4rem)] flex-shrink-0 overflow-hidden',
        'bg-white border-r border-borderLight',
        'transition-all duration-200 ease-in-out z-30',
        open ? 'shadow-sm' : '',
      ].join(' ')}
    >
      <div className="w-[230px] h-full flex flex-col justify-between">
        {/* Nav Links */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-1">
          {NAV_ITEMS.map(item => (
            <NavItem key={item.path} item={item} alertCount={alertCount} t={t} />
          ))}
        </div>

        {/* Promo Card (light blue rounded box like reference image) */}
        {/* <div className="p-3">
          <div className="rounded-2xl bg-blue-50/80 border border-blue-100 p-3.5 text-navy">
            <div className="flex items-center gap-2 mb-1.5">
              <div className="w-6 h-6 rounded-full bg-oceanBlue/15 flex items-center justify-center text-oceanBlue">
                <Sparkles size={13} />
              </div>
              <span className="text-xs font-bold text-navy">{t('sidebar.new_to_orca')}</span>
            </div>
            <p className="text-[11px] text-textSecond leading-relaxed mb-2.5 font-normal">
              {t('sidebar.promo_desc')}
            </p>
            <button className="w-full flex items-center justify-center gap-1 py-1.5 px-3 rounded-xl bg-oceanBlue hover:bg-blue-700 text-[11px] font-bold text-white transition-colors cursor-pointer shadow-sm">
              {t('sidebar.quick_tour')} <ChevronRight size={13} />
            </button>
          </div>
        </div> */}

        {/* ISRO Footer */}
        {/* <div className="px-4 py-3 border-t border-borderLight bg-surface/50">
          <div className="flex items-center gap-2">
            <Building2 size={15} className="text-textMuted flex-shrink-0" />
            <div className="leading-tight">
              <div className="text-[10px] text-navy font-bold">{t('Government of India')}</div>
              <div className="text-[9px] text-textMuted font-medium">{t('Department of Space, ISRO')}</div>
            </div>
          </div>
        </div> */}
      </div>
    </aside>
  )
}
