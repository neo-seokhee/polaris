import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ProtectedRoute } from './components/ProtectedRoute'
import { Layout } from './components/Layout'
import { LoginPage } from './pages/LoginPage'
import { DashboardPage } from './pages/DashboardPage'
import { UsersPage } from './pages/UsersPage'
import { UserDetailPage } from './pages/UserDetailPage'
import { ModulesPage } from './pages/ModulesPage'
import { ProductsPage } from './pages/ProductsPage'
import { BundlesPage } from './pages/BundlesPage'
import { PaymentEventsPage } from './pages/PaymentEventsPage'

export default function App() {
  return (
    <BrowserRouter basename="/admin">
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/users" element={<UsersPage />} />
              <Route path="/users/:id" element={<UserDetailPage />} />
              <Route path="/modules" element={<ModulesPage />} />
              <Route path="/store/products" element={<ProductsPage />} />
              <Route path="/store/bundles" element={<BundlesPage />} />
              <Route path="/payments" element={<PaymentEventsPage />} />
              {/* Legacy redirect */}
              <Route path="/entitlements" element={<Navigate to="/modules" replace />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
