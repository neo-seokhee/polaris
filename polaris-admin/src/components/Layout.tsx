import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

interface NavItem {
  to: string
  label: string
  icon: string
  group?: string
}

const navItems: NavItem[] = [
  { to: '/', label: '대시보드', icon: '📊' },
  { to: '/users', label: '사용자', icon: '👥' },
  { to: '/modules', label: '모듈 관리', icon: '📦' },
  { to: '/store/products', label: '상품 관리', icon: '🏷️', group: '스토어' },
  { to: '/store/bundles', label: '번들 관리', icon: '🎁' },
  { to: '/payments', label: '결제 이벤트', icon: '💳', group: '기타' },
]

export function Layout() {
  const { user, signOut } = useAuth()

  let lastGroup: string | undefined

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col">
        <div className="p-6 border-b border-gray-700">
          <h1 className="text-xl font-bold">Polaris Admin</h1>
        </div>

        <nav className="flex-1 py-4">
          {navItems.map((item) => {
            const showGroup = item.group && item.group !== lastGroup
            if (item.group) lastGroup = item.group

            return (
              <div key={item.to}>
                {showGroup && (
                  <div className="px-6 pt-5 pb-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    {item.group}
                  </div>
                )}
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-6 py-3 text-sm transition-colors ${
                      isActive
                        ? 'bg-gray-800 text-white border-r-2 border-blue-400'
                        : 'text-gray-400 hover:text-white hover:bg-gray-800'
                    }`
                  }
                >
                  <span>{item.icon}</span>
                  <span>{item.label}</span>
                </NavLink>
              </div>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-700">
          <div className="text-sm text-gray-400 mb-2">{user?.email}</div>
          <button
            onClick={() => void signOut()}
            className="text-sm text-gray-500 hover:text-white transition-colors"
          >
            로그아웃
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
