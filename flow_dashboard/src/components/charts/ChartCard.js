import React from 'react'

export default function ChartCard({ title, children, color = "blue" }) {
  return (
    <div className="bg-white rounded-xl border shadow-sm p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">{title}</h3>
      <div className="h-48 sm:h-56" style={{ outline: 'none' }}>
        <div style={{ outline: 'none' }} className="w-full h-full [&_*]:outline-none [&_*]:focus:outline-none">
          {children}
        </div>
      </div>
    </div>
  )
}