'use client'

import React from 'react'

export const AdminIcon: React.FC = () => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="32" height="32" rx="6" fill="var(--theme-accent-soft, rgba(0,112,243,0.2))" stroke="var(--theme-accent, var(--color-primary))" strokeWidth="1.5" />
        <path d="M9 16L16 9L23 16L16 23L9 16Z" stroke="var(--color-accent, var(--theme-accent))" strokeWidth="2" strokeLinejoin="round" />
        <circle cx="16" cy="16" r="3" fill="var(--theme-accent, var(--color-primary))" />
      </svg>
    </div>
  )
}

export default AdminIcon
