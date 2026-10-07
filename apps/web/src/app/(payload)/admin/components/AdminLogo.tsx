'use client'

import React from 'react'

export const AdminLogo: React.FC = () => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none', padding: '6px 0' }}>
      <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="6" fill="var(--theme-accent-soft, rgba(0,112,243,0.15))" stroke="var(--theme-accent, var(--color-primary))" strokeWidth="1.5" />
        <path d="M9 16L16 9L23 16L16 23L9 16Z" stroke="var(--color-accent, var(--theme-accent))" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="16" cy="16" r="3" fill="var(--theme-accent, var(--color-primary))" />
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <span style={{ fontSize: '15px', fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--theme-text, var(--color-text))' }}>
          BUILD<span style={{ color: 'var(--theme-accent, var(--color-primary))' }}>MYRIG</span>
        </span>
        <span style={{ fontSize: '9px', fontWeight: 700, letterSpacing: '0.12em', color: 'var(--theme-text-muted, var(--color-text-muted))', textTransform: 'uppercase' }}>
          RIG STUDIO ADMIN
        </span>
      </div>
    </div>
  )
}

export default AdminLogo
