import React from 'react'

export default function Panel({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
        {subtitle && <p className="text-sm text-gray-500">{subtitle}</p>}
      </div>
      {children}
    </div>
  )
}