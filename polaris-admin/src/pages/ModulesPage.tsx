import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'

interface ModuleConfig {
  module_id: string
  title: string
  description: string | null
  category: string
  status: 'available' | 'comingSoon' | 'disabled'
  access_type: 'free' | 'paid' | 'admin_only'
  is_visible: boolean
  sort_order: number
  updated_at: string
}

interface Product {
  id: string
  module_id: string | null
  name: string
  price_krw: number
  is_active: boolean
}

const STATUS_OPTIONS = [
  { value: 'available', label: '활성', color: 'bg-green-100 text-green-700' },
  { value: 'comingSoon', label: '준비중', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'disabled', label: '비활성', color: 'bg-gray-100 text-gray-500' },
] as const

const ACCESS_OPTIONS = [
  { value: 'free', label: '무료', color: 'bg-blue-100 text-blue-700' },
  { value: 'paid', label: '유료', color: 'bg-purple-100 text-purple-700' },
  { value: 'admin_only', label: '관리자 전용', color: 'bg-red-100 text-red-700' },
] as const

const DEFAULT_CATEGORIES = ['핵심 생산성', '라이프 관리', '성장 도구']

export function ModulesPage() {
  const [modules, setModules] = useState<ModuleConfig[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  // 제목 인라인 편집
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null)
  const [editingTitleValue, setEditingTitleValue] = useState('')

  // 카테고리 관리
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [customCategories, setCustomCategories] = useState<string[]>([])
  const [newCategoryName, setNewCategoryName] = useState('')
  const [renamingCategory, setRenamingCategory] = useState<string | null>(null)
  const [renameCategoryValue, setRenameCategoryValue] = useState('')

  const allCategories = [...new Set([
    ...DEFAULT_CATEGORIES,
    ...modules.map(m => m.category),
    ...customCategories,
  ])]

  useEffect(() => { loadData() }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 2500)
    return () => clearTimeout(t)
  }, [toast])

  async function loadData() {
    setLoading(true)
    const [modulesRes, productsRes] = await Promise.all([
      supabase.from('module_config').select('*').order('sort_order'),
      supabase.from('products').select('id, module_id, name, price_krw, is_active').eq('type', 'module'),
    ])
    setModules((modulesRes.data ?? []) as ModuleConfig[])
    setProducts((productsRes.data ?? []) as Product[])
    setLoading(false)
  }

  function getLinkedProduct(moduleId: string): Product | undefined {
    return products.find(p => p.module_id === moduleId)
  }

  // --- module config update ---

  async function updateModule(moduleId: string, field: keyof ModuleConfig, value: unknown) {
    setSaving(moduleId)
    const { error } = await supabase
      .from('module_config')
      .update({ [field]: value })
      .eq('module_id', moduleId)

    if (error) {
      setToast({ type: 'error', message: `저장 실패: ${error.message}` })
    } else {
      setModules(prev => prev.map(m =>
        m.module_id === moduleId ? { ...m, [field]: value, updated_at: new Date().toISOString() } : m
      ))
      setToast({ type: 'success', message: '저장됨' })
    }
    setSaving(null)
  }

  // --- title editing ---

  function startEditTitle(mod: ModuleConfig) {
    setEditingTitleId(mod.module_id)
    setEditingTitleValue(mod.title)
  }

  function saveTitle(moduleId: string) {
    const trimmed = editingTitleValue.trim()
    if (trimmed && trimmed !== modules.find(m => m.module_id === moduleId)?.title) {
      updateModule(moduleId, 'title', trimmed)
    }
    setEditingTitleId(null)
  }

  // --- category management ---

  function addCategory() {
    const trimmed = newCategoryName.trim()
    if (!trimmed) return
    if (allCategories.includes(trimmed)) {
      setToast({ type: 'error', message: '이미 존재하는 카테고리입니다.' })
      return
    }
    setCustomCategories(prev => [...prev, trimmed])
    setNewCategoryName('')
    setToast({ type: 'success', message: `카테고리 "${trimmed}" 추가됨` })
  }

  async function renameCategory(oldName: string) {
    const newName = renameCategoryValue.trim()
    if (!newName || newName === oldName) {
      setRenamingCategory(null)
      return
    }
    if (allCategories.includes(newName)) {
      setToast({ type: 'error', message: '이미 존재하는 카테고리명입니다.' })
      return
    }
    const affectedModules = modules.filter(m => m.category === oldName)
    if (affectedModules.length > 0) {
      const { error } = await supabase
        .from('module_config')
        .update({ category: newName })
        .eq('category', oldName)
      if (error) {
        setToast({ type: 'error', message: `이름 변경 실패: ${error.message}` })
        setRenamingCategory(null)
        return
      }
      setModules(prev => prev.map(m =>
        m.category === oldName ? { ...m, category: newName } : m
      ))
    }
    setCustomCategories(prev => prev.map(c => c === oldName ? newName : c))
    setRenamingCategory(null)
    setToast({ type: 'success', message: `"${oldName}" → "${newName}" 변경됨` })
  }

  function deleteCategory(name: string) {
    const usedCount = modules.filter(m => m.category === name).length
    if (usedCount > 0) {
      setToast({ type: 'error', message: `${usedCount}개 모듈이 사용 중이라 삭제할 수 없습니다.` })
      return
    }
    setCustomCategories(prev => prev.filter(c => c !== name))
    setToast({ type: 'success', message: `카테고리 "${name}" 삭제됨` })
  }

  function getCategoryModuleCount(name: string): number {
    return modules.filter(m => m.category === name).length
  }

  function formatDate(iso: string) {
    const d = new Date(iso)
    return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  if (loading) return <div className="text-gray-500">Loading...</div>

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">모듈 관리</h1>

      {/* Toast */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-4 py-2.5 rounded-lg text-sm font-medium shadow-lg transition-all ${
          toast.type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
        }`}>
          {toast.message}
        </div>
      )}

      {/* 카테고리 관리 토글 */}
      <div className="mb-4 flex items-center gap-3">
        <button
          onClick={() => setShowCategoryManager(!showCategoryManager)}
          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
            showCategoryManager ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          카테고리 관리
        </button>
        <span className="text-xs text-gray-400">{allCategories.length}개 카테고리</span>
      </div>

      {/* 카테고리 관리 패널 */}
      {showCategoryManager && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-4">
          <div className="flex items-center gap-2 mb-4">
            <input
              type="text"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCategory()}
              placeholder="새 카테고리 이름..."
              className="flex-1 max-w-xs px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={addCategory}
              disabled={!newCategoryName.trim()}
              className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              추가
            </button>
          </div>
          <div className="space-y-2">
            {allCategories.map(cat => {
              const count = getCategoryModuleCount(cat)
              const isRenaming = renamingCategory === cat
              return (
                <div key={cat} className="flex items-center gap-3 py-1.5 px-3 rounded-lg hover:bg-gray-50 group">
                  {isRenaming ? (
                    <input
                      autoFocus
                      type="text"
                      value={renameCategoryValue}
                      onChange={(e) => setRenameCategoryValue(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') renameCategory(cat)
                        if (e.key === 'Escape') setRenamingCategory(null)
                      }}
                      onBlur={() => renameCategory(cat)}
                      className="flex-1 max-w-xs px-2 py-0.5 border border-blue-400 rounded text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  ) : (
                    <span className="text-sm text-gray-900 font-medium">{cat}</span>
                  )}
                  <span className="text-xs text-gray-400">{count}개 모듈</span>
                  <div className="ml-auto flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!isRenaming && (
                      <button
                        onClick={() => { setRenamingCategory(cat); setRenameCategoryValue(cat) }}
                        className="px-2 py-0.5 text-xs text-blue-600 hover:bg-blue-50 rounded"
                      >
                        이름 변경
                      </button>
                    )}
                    <button
                      onClick={() => deleteCategory(cat)}
                      disabled={count > 0}
                      className="px-2 py-0.5 text-xs text-red-500 hover:bg-red-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                      title={count > 0 ? '사용 중인 모듈이 있어 삭제 불가' : '삭제'}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 bg-gray-50">
              <th className="text-left px-5 py-3 font-medium text-gray-500">모듈</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">카테고리</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">
                <span title="앱에서 모듈이 보이는지">노출</span>
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">
                <span title="모듈 진입 가능 여부">상태</span>
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">
                <span title="접근 권한 (무료/유료/관리자 전용)">접근</span>
              </th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">연결 상품</th>
              <th className="text-right px-5 py-3 font-medium text-gray-500">수정일</th>
            </tr>
          </thead>
          <tbody>
            {modules.map(mod => {
              const isSaving = saving === mod.module_id
              const linkedProduct = getLinkedProduct(mod.module_id)
              return (
                <tr key={mod.module_id} className={`border-b border-gray-100 hover:bg-gray-50 ${isSaving ? 'opacity-60' : ''}`}>
                  {/* 모듈명 */}
                  <td className="px-5 py-3">
                    {editingTitleId === mod.module_id ? (
                      <input
                        autoFocus
                        type="text"
                        value={editingTitleValue}
                        onChange={(e) => setEditingTitleValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') saveTitle(mod.module_id)
                          if (e.key === 'Escape') setEditingTitleId(null)
                        }}
                        onBlur={() => saveTitle(mod.module_id)}
                        className="w-full font-medium text-gray-900 text-sm border border-blue-400 rounded px-2 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    ) : (
                      <div
                        onClick={() => startEditTitle(mod)}
                        className="font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition-colors"
                        title="클릭하여 제목 편집"
                      >
                        {mod.title}
                      </div>
                    )}
                    <div className="text-xs text-gray-400 mt-0.5">{mod.module_id}</div>
                  </td>

                  {/* 카테고리 */}
                  <td className="px-4 py-3">
                    <select
                      value={mod.category}
                      onChange={(e) => updateModule(mod.module_id, 'category', e.target.value)}
                      disabled={isSaving}
                      className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
                    >
                      {allCategories.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </td>

                  {/* 노출 (is_visible) */}
                  <td className="text-center px-4 py-3">
                    <button
                      onClick={() => updateModule(mod.module_id, 'is_visible', !mod.is_visible)}
                      disabled={isSaving}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
                        mod.is_visible ? 'bg-green-500' : 'bg-gray-300'
                      }`}
                    >
                      <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow ${
                        mod.is_visible ? 'translate-x-6' : 'translate-x-1'
                      }`} />
                    </button>
                  </td>

                  {/* 상태 (status) */}
                  <td className="text-center px-4 py-3">
                    <select
                      value={mod.status}
                      onChange={(e) => updateModule(mod.module_id, 'status', e.target.value)}
                      disabled={isSaving}
                      className={`text-xs font-medium border-0 rounded-full px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                        STATUS_OPTIONS.find(s => s.value === mod.status)?.color ?? ''
                      }`}
                    >
                      {STATUS_OPTIONS.map(s => (
                        <option key={s.value} value={s.value}>{s.label}</option>
                      ))}
                    </select>
                  </td>

                  {/* 접근 권한 (access_type) */}
                  <td className="text-center px-4 py-3">
                    <select
                      value={mod.access_type}
                      onChange={(e) => updateModule(mod.module_id, 'access_type', e.target.value)}
                      disabled={isSaving}
                      className={`text-xs font-medium border-0 rounded-full px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer ${
                        ACCESS_OPTIONS.find(a => a.value === mod.access_type)?.color ?? ''
                      }`}
                    >
                      {ACCESS_OPTIONS.map(a => (
                        <option key={a.value} value={a.value}>{a.label}</option>
                      ))}
                    </select>
                  </td>

                  {/* 연결 상품 */}
                  <td className="text-center px-4 py-3">
                    {mod.access_type === 'paid' ? (
                      linkedProduct ? (
                        <Link
                          to="/store/products"
                          className="text-xs text-blue-600 hover:underline"
                        >
                          {linkedProduct.name}
                          <span className="text-gray-400 ml-1">
                            ({linkedProduct.price_krw.toLocaleString()}원)
                          </span>
                        </Link>
                      ) : (
                        <span className="text-xs text-red-400">상품 없음</span>
                      )
                    ) : (
                      <span className="text-gray-300 text-xs">-</span>
                    )}
                  </td>

                  {/* 수정일 */}
                  <td className="text-right px-5 py-3">
                    <span className="text-xs text-gray-400">{formatDate(mod.updated_at)}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {modules.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            <p className="text-sm">module_config 테이블에 데이터가 없습니다.</p>
            <p className="text-xs mt-1">마이그레이션을 실행해 주세요.</p>
          </div>
        )}
      </div>
    </div>
  )
}
