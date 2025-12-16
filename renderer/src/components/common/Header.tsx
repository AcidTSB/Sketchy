import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search,
  Home,
  ChevronLeft,
  ChevronRight,
  Minus,
  Square,
  X,
  AudioWaveform,
} from 'lucide-react'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { useUserStore, getAvatarUrl } from '@/store/userStore'
import { useThemeStore } from '@/store/themeStore'
import { SearchDialog } from './SearchDialog'
import { ThemeSwitcher } from './ThemeSwitcher'

export function Header() {
  const navigate = useNavigate()
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const { currentUser } = useUserStore()
  const theme = useThemeStore((state) => state.theme)

  return (
    <>
      <header
        className="h-16 flex items-center justify-between px-4 select-none transition-all duration-200"
        style={
          {
            backgroundColor:
              theme === 'light' ? 'rgba(255, 255, 255, 0.95)' : 'rgba(0, 0, 0, 0.95)',
            color: theme === 'light' ? '#000' : '#fff',
            borderBottom: `1px solid ${theme === 'light' ? '#e5e5e5' : '#2a2a2a'}`,
            WebkitAppRegion: 'drag',
          } as React.CSSProperties
        }
      >
        <div
          className="flex items-center gap-4"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <div
            className="flex items-center gap-2 pr-4 border-r"
            style={{ borderColor: theme === 'light' ? '#e5e5e5' : '#2a2a2a' }}
          >
            <div className="p-1.5 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-lg">
              <AudioWaveform size={18} className="text-white" />
            </div>
            <span
              className={`font-bold text-sm tracking-wide hidden sm:block ${
                theme === 'light' ? 'text-gray-900' : 'text-white/90'
              }`}
            >
              Sketchy
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate(-1)}
              className="p-1.5 rounded-full transition-colors active:scale-95"
              style={{
                backgroundColor: theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(0, 0, 0, 0.5)',
                color: theme === 'light' ? '#666' : '#b3b3b3',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : '#2a2a2a'
                e.currentTarget.style.color = theme === 'light' ? '#000' : '#fff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(0, 0, 0, 0.5)'
                e.currentTarget.style.color = theme === 'light' ? '#666' : '#b3b3b3'
              }}
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={() => navigate(1)}
              className="p-1.5 rounded-full transition-colors active:scale-95"
              style={{
                backgroundColor: theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(0, 0, 0, 0.5)',
                color: theme === 'light' ? '#666' : '#b3b3b3',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  theme === 'light' ? 'rgba(0, 0, 0, 0.1)' : '#2a2a2a'
                e.currentTarget.style.color = theme === 'light' ? '#000' : '#fff'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor =
                  theme === 'light' ? 'rgba(0, 0, 0, 0.05)' : 'rgba(0, 0, 0, 0.5)'
                e.currentTarget.style.color = theme === 'light' ? '#666' : '#b3b3b3'
              }}
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        <div
          className="flex flex-1 items-center justify-center gap-2 max-w-lg mx-4"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            onClick={() => navigate('/')}
            className="p-2.5 rounded-full transition-all hover:scale-105 active:scale-95"
            style={{
              backgroundColor: theme === 'light' ? '#f5f5f5' : '#1f1f1f',
              color: theme === 'light' ? '#000' : '#fff',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme === 'light' ? '#e5e5e5' : '#2a2a2a'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme === 'light' ? '#f5f5f5' : '#1f1f1f'
            }}
          >
            <Home size={22} />
          </button>
          <button
            onClick={() => setIsSearchOpen(true)}
            className="group flex-1 flex items-center gap-3 h-12 px-4 rounded-full transition-all"
            style={{
              backgroundColor: theme === 'light' ? '#f5f5f5' : '#1f1f1f',
              border: `1px solid ${theme === 'light' ? 'transparent' : 'transparent'}`,
              color: theme === 'light' ? '#666' : '#b3b3b3',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = theme === 'light' ? '#e5e5e5' : '#2a2a2a'
              e.currentTarget.style.borderColor = theme === 'light' ? '#d5d5d5' : '#3a3a3a'
              e.currentTarget.style.color = theme === 'light' ? '#000' : '#fff'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = theme === 'light' ? '#f5f5f5' : '#1f1f1f'
              e.currentTarget.style.borderColor = 'transparent'
              e.currentTarget.style.color = theme === 'light' ? '#666' : '#b3b3b3'
            }}
          >
            <Search size={20} />
            <span className="text-sm font-medium truncate">Search...</span>
          </button>
        </div>

        <div
          className="flex items-center gap-4"
          style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
        >
          <button
            onClick={() => navigate('/profile')}
            className={`rounded-full hover:scale-105 transition-transform ring-2 ring-transparent ${
              theme === 'light' ? 'hover:ring-black/10' : 'hover:ring-white/20'
            }`}
          >
            <Avatar className="h-8 w-8 overflow-hidden">
              {currentUser?.avatar ? (
                <img
                  src={getAvatarUrl(currentUser.avatar)}
                  alt="User"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              ) : null}
              {/* PHẦN ĐÃ SỬA: Chỉnh màu nền và chữ của AvatarFallback */}
              <AvatarFallback
                className="text-xs font-bold"
                style={{
                  backgroundColor: theme === 'light' ? '#e5e5e5' : '#535353',
                  color: theme === 'light' ? '#000' : '#fff',
                  border: theme === 'light' ? '1px solid #d4d4d4' : 'none',
                }}
              >
                {currentUser?.name?.substring(0, 1).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
          </button>

          <div
            className="h-5 w-[1px]"
            style={{ backgroundColor: theme === 'light' ? '#e5e5e5' : '#2a2a2a' }}
          ></div>

          <ThemeSwitcher />

          <div
            className="h-5 w-[1px]"
            style={{ backgroundColor: theme === 'light' ? '#e5e5e5' : '#2a2a2a' }}
          ></div>

          <div className="flex items-center gap-1">
            <button
              onClick={() => window.electronAPI?.minimize()}
              className={`p-2 rounded-md transition-colors ${
                theme === 'light'
                  ? 'text-gray-500 hover:bg-black/5 hover:text-black'
                  : 'text-[#b3b3b3] hover:bg-white/10 hover:text-white'
              }`}
            >
              <Minus size={18} />
            </button>
            <button
              onClick={() => window.electronAPI?.maximize()}
              className={`p-2 rounded-md transition-colors ${
                theme === 'light'
                  ? 'text-gray-500 hover:bg-black/5 hover:text-black'
                  : 'text-[#b3b3b3] hover:bg-white/10 hover:text-white'
              }`}
            >
              <Square size={14} />
            </button>
            <button
              onClick={() => window.electronAPI?.close()}
              className={`p-2 rounded-md transition-colors hover:bg-red-500 hover:text-white ${
                theme === 'light' ? 'text-gray-500' : 'text-[#b3b3b3]'
              }`}
            >
              <X size={18} />
            </button>
          </div>
        </div>
      </header>

      <SearchDialog isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </>
  )
}
