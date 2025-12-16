import { Minus, Square, X } from 'lucide-react'

export function TitleBar() {
  return (
    <div
      className="fixed top-0 right-0 z-[9999] flex items-center"
      // Chỉ chiếm chiều cao vừa đủ, pointer-events-none để click xuyên qua vùng trống
      style={{
        height: '40px', // Chiều cao chuẩn của thanh title bar
        pointerEvents: 'none',
      }}
    >
      {/* Container chứa 3 nút - Enable click lại (pointer-events-auto) và tắt kéo thả (no-drag) */}
      <div
        className="flex h-full items-center pointer-events-auto"
        style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
      >
        <button
          onClick={() => window.electronAPI.minimize()}
          className="h-full px-4 hover:bg-white/10 text-white/70 hover:text-white transition-colors flex items-center justify-center focus:outline-none"
        >
          <Minus size={16} />
        </button>

        <button
          onClick={() => window.electronAPI.maximize()}
          className="h-full px-4 hover:bg-white/10 text-white/70 hover:text-white transition-colors flex items-center justify-center focus:outline-none"
        >
          <Square size={14} />
        </button>

        <button
          onClick={() => window.electronAPI.close()}
          className="h-full px-4 hover:bg-red-500 text-white/70 hover:text-white transition-colors flex items-center justify-center focus:outline-none"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
