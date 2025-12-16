import { Outlet } from 'react-router-dom'
import { Sidebar } from './common/Sidebar'
import { Header } from './common/Header'

export default function Layout() {
  return (
    <div
      className="grid h-screen overflow-hidden transition-apple"
      style={{
        backgroundColor: 'var(--bg)',
        gridTemplateColumns: 'auto 1fr', // Cột 1: Sidebar (auto), Cột 2: Main (1fr)
        gridTemplateRows: 'auto 1fr', // Hàng 1: Header, Hàng 2: Main
        // 👇 SỬA LẠI GRID AREA TẠI ĐÂY
        gridTemplateAreas: `
          "header header"  
          "sidebar main"
        `,
        // "header header" nghĩa là header chiếm cả 2 cột
      }}
    >
      {/* Header */}
      <div style={{ gridArea: 'header', zIndex: 50 }}>
        <Header />
      </div>

      {/* Sidebar */}
      <div style={{ gridArea: 'sidebar', zIndex: 40 }}>
        <Sidebar />
      </div>

      {/* Main Content Area */}
      <main
        className="overflow-y-auto custom-scrollbar"
        style={{
          gridArea: 'main',
          paddingBottom: '120px',
        }}
      >
        <Outlet />
      </main>
    </div>
  )
}
