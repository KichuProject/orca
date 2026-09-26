import React from 'react'
import { Link } from 'react-router-dom'
import { Waves } from 'lucide-react'
import { useGlobal } from '../../context/GlobalContext'

const DATA_CREDITS = [
  'ISRO/NRSC', 'INCOIS', 'IMD', 'Copernicus Marine', 'NOAA', 'NASA',
  'GEBCO', 'WDPA', 'OBIS', 'FAO', 'GFW', 'EMODnet',
]

export default function Footer() {
  const { t } = useGlobal()

  const footerLinks = [
    { label: t('footer.about_isro', 'About ISRO'), href: 'https://www.isro.gov.in', external: true },
    
  ]

  return (
    <footer className="bg-white border-t border-borderLight mt-auto">
      {/* Main footer row */}
      <div className="flex flex-col md:flex-row items-center justify-between px-6 py-3 gap-3">
        {/* Links */}
        <nav className="flex flex-wrap items-center gap-x-4 gap-y-1" aria-label="Footer navigation">
          {footerLinks.map(link => (
            link.external ? (
              <a
                key={link.label}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-textMuted hover:text-oceanBlue transition-colors"
              >
                {link.label}
              </a>
            ) : (
              <Link
                key={link.label}
                to={link.href}
                className="text-xs text-textMuted hover:text-oceanBlue transition-colors"
              >
                {link.label}
              </Link>
            )
          ))}
        </nav>

        {/* ORCA mini brand */}
        <div className="flex items-center gap-1.5">
          <Waves size={14} className="text-oceanBlue" />
          <span className="text-xs font-semibold text-navy">ORCA</span>
          <span className="text-xs text-textMuted">{t('footer.platform_desc', '— Marine Intelligence Platform')}</span>
        </div>

        {/* Copyright */}
        {/* <p className="text-xs text-textMuted">
          {t('footer.rights', '© 2026 ISRO. All Rights Reserved.')} &nbsp;
          <span className="font-medium">{t('Version')} 1.0.0</span>
        </p> */}
      </div>

      {/* Data credits bar */}
      <div className="bg-surface border-t border-borderLight px-6 py-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-[10px] text-textMuted font-semibold uppercase tracking-wide mr-1">
          {t('Data')}:
        </span>
        {DATA_CREDITS.map(credit => (
          <span
            key={credit}
            className="text-[10px] text-textMuted font-medium bg-surfaceMid rounded px-1.5 py-0.5"
          >
            {credit}
          </span>
        ))}
        <span className="ml-auto text-[10px] text-textMuted italic">
          {t('footer.disclaimer', 'For informational purposes only. Not for navigational use.')}
        </span>
      </div>
    </footer>
  )
}

