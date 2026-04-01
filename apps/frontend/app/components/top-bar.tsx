'use client'

import FlagMenu from './flag-menu'

export default function TopBar() {
  return (
    <header className="flex items-center justify-between px-6 py-3 bg-white border-b border-gray-200">
      <span className="font-bold text-lg">Dictee</span>
      <FlagMenu />
    </header>
  )
}