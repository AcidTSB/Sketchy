import { useState, useRef } from 'react'
import { Check } from 'lucide-react'
import { useClickOutside } from '../../hooks/useClickOutside'

interface StatusSelectorProps {
  currentStatus?: string | null
  onStatusChange: (status: string) => void
}

const statusOptions = [
  { value: 'draft', label: 'Draft', color: { bg: '#6b728020', text: '#6b7280' } },
  { value: 'review', label: 'Review', color: { bg: '#f59e0b20', text: '#f59e0b' } },
  { value: 'approved', label: 'Approved', color: { bg: '#3b82f620', text: '#3b82f6' } },
  { value: 'final', label: 'Final', color: { bg: '#10b98120', text: '#10b981' } },
]

export function StatusSelector({ currentStatus = 'draft', onStatusChange }: StatusSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const current = statusOptions.find((opt) => opt.value === currentStatus) || statusOptions[0]

  useClickOutside(menuRef, () => setIsOpen(false))

  const handleStatusChange = (status: string) => {
    onStatusChange(status)
    setIsOpen(false)
  }

  return (
    <div className="relative" ref={menuRef}>
      {/* Status Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="h-7 px-2 rounded-apple text-xs font-medium hover:opacity-80 transition-opacity"
        style={{
          backgroundColor: current.color.bg,
          color: current.color.text,
        }}
      >
        {current.label}
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute left-0 bottom-full mb-1 z-50 glass-elevated rounded-apple-lg shadow-apple-lg overflow-hidden"
          style={{ width: '180px' }}
        >
          {statusOptions.map((option, index) => (
            <button
              key={option.value}
              onClick={() => handleStatusChange(option.value)}
              className={`w-full px-4 py-3 flex items-center justify-between hover:opacity-80 transition-opacity ${
                index !== statusOptions.length - 1 ? 'border-b' : ''
              }`}
              style={{
                borderColor: 'var(--border)',
                backgroundColor: currentStatus === option.value ? option.color.bg : 'transparent',
                color: 'var(--text)',
              }}
            >
              <span style={{ color: option.color.text }}>{option.label}</span>
              {currentStatus === option.value && (
                <Check className="h-4 w-4" style={{ color: option.color.text }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
