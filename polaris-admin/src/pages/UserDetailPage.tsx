import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../contexts/AuthContext'

interface ModuleConfig {
  module_id: string
  title: string
  access_type: 'free' | 'paid' | 'admin_only'
  status: string
}

interface UserProfile {
  id: string
  email: string | null
  name: string | null
  phone: string | null
  role: string
  created_at: string
}

interface Override {
  id: string
  feature_key: string
  feature_value: unknown
  reason: string | null
  expires_at: string | null
  created_at: string
}

interface Purchase {
  id: string
  product_id: string | null
  bundle_id: string | null
  price_paid: number
  provider: string
  status: string
  purchased_at: string
  expires_at: string | null
  memo: string | null
  product_name?: string
  bundle_name?: string
}

export function UserDetailPage() {
  const { id } = useParams<{ id: string }>()
  const { user: adminUser } = useAuth()
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [modules, setModules] = useState<ModuleConfig[]>([])
  const [overrides, setOverrides] = useState<Override[]>([])
  const [purchases, setPurchases] = useState<Purchase[]>([])
  const [entitlements, setEntitlements] = useState<Record<string, unknown> | null>(null)
  const [loading, setLoading] = useState(true)

  // Override form
  const [overrideKey, setOverrideKey] = useState('')
  const [overrideValue, setOverrideValue] = useState('true')
  const [overrideReason, setOverrideReason] = useState('')
  const [overrideExpires, setOverrideExpires] = useState('')

  // Grant purchase form
  const [showGrantForm, setShowGrantForm] = useState(false)
  const [grantProductId, setGrantProductId] = useState('')
  const [availableProducts, setAvailableProducts] = useState<Array<{ id: string; name: string; type: string }>>([])

  useEffect(() => {
    if (id) loadAll()
  }, [id])

  async function loadAll() {
    setLoading(true)
    const [profileRes, modulesRes, overridesRes, entitlementsRes, purchasesRes, productsRes] = await Promise.all([
      supabase.from('users').select('*').eq('id', id!).single(),
      supabase.from('module_config').select('module_id, title, access_type, status').order('sort_order'),
      supabase.from('user_entitlement_overrides').select('*').eq('user_id', id!).order('created_at', { ascending: false }),
      supabase.rpc('get_user_entitlements', { p_user_id: id! }),
      supabase.from('user_purchases').select('*').eq('user_id', id!).order('purchased_at', { ascending: false }),
      supabase.from('products').select('id, name, type').eq('is_active', true),
    ])

    setProfile(profileRes.data as UserProfile | null)
    setModules((modulesRes.data ?? []) as ModuleConfig[])
    setOverrides((overridesRes.data ?? []) as Override[])
    setEntitlements(entitlementsRes.data as Record<string, unknown> | null)
    setAvailableProducts((productsRes.data ?? []) as Array<{ id: string; name: string; type: string }>)

    // Enrich purchases with product/bundle names
    const rawPurchases = (purchasesRes.data ?? []) as Purchase[]
    if (rawPurchases.length > 0) {
      const productIds = rawPurchases.map(p => p.product_id).filter(Boolean) as string[]
      const bundleIds = rawPurchases.map(p => p.bundle_id).filter(Boolean) as string[]

      const [prodRes, bundleRes] = await Promise.all([
        productIds.length > 0 ? supabase.from('products').select('id, name').in('id', productIds) : { data: [] },
        bundleIds.length > 0 ? supabase.from('bundles').select('id, name').in('id', bundleIds) : { data: [] },
      ])

      const prodMap = new Map((prodRes.data ?? []).map((p: { id: string; name: string }) => [p.id, p.name]))
      const bundleMap = new Map((bundleRes.data ?? []).map((b: { id: string; name: string }) => [b.id, b.name]))

      for (const p of rawPurchases) {
        if (p.product_id) p.product_name = prodMap.get(p.product_id) ?? p.product_id
        if (p.bundle_id) p.bundle_name = bundleMap.get(p.bundle_id) ?? p.bundle_id
      }
    }
    setPurchases(rawPurchases)
    setLoading(false)
  }

  // --- helpers ---

  function getModuleAccessSource(moduleId: string): { label: string; color: string } {
    // Check override deny first
    const denyOv = overrides.find(o => o.feature_key === `module:${moduleId}`)
    if (denyOv) {
      const valid = !denyOv.expires_at || new Date(denyOv.expires_at) > new Date()
      if (valid && denyOv.feature_value === false) return { label: '차단됨', color: 'border-red-200 bg-red-50' }
    }

    // Check override grant
    const grantOv = overrides.find(o => o.feature_key === `module:${moduleId}`)
    if (grantOv) {
      const valid = !grantOv.expires_at || new Date(grantOv.expires_at) > new Date()
      if (valid && grantOv.feature_value === true) return { label: '관리자 부여', color: 'border-blue-200 bg-blue-50' }
    }

    const mod = modules.find(m => m.module_id === moduleId)
    if (!mod) return { label: '알 수 없음', color: 'border-gray-200 bg-gray-50' }

    if (mod.access_type === 'free') return { label: '무료', color: 'border-green-200 bg-green-50' }

    // Check purchases
    const hasPurchase = purchases.some(p =>
      p.status === 'active' && p.product_id === `module:${moduleId}`
    )
    if (hasPurchase) return { label: '구매함', color: 'border-green-200 bg-green-50' }

    return { label: '미구매', color: 'border-yellow-200 bg-yellow-50' }
  }

  function getModuleVisibility(moduleId: string): boolean {
    const ov = overrides.find(o => o.feature_key === `visibility:${moduleId}`)
    if (ov) {
      const valid = !ov.expires_at || new Date(ov.expires_at) > new Date()
      if (valid) return ov.feature_value !== false
    }
    return true
  }

  function getModuleDenied(moduleId: string): boolean {
    const ov = overrides.find(o => o.feature_key === `module:${moduleId}`)
    if (ov) {
      const valid = !ov.expires_at || new Date(ov.expires_at) > new Date()
      if (valid && ov.feature_value === false) return true
    }
    return false
  }

  // --- actions ---

  async function toggleVisibility(moduleId: string, visible: boolean) {
    if (visible) {
      await supabase.from('user_entitlement_overrides').delete()
        .eq('user_id', id!)
        .eq('feature_key', `visibility:${moduleId}`)
    } else {
      await supabase.from('user_entitlement_overrides').upsert({
        user_id: id!,
        feature_key: `visibility:${moduleId}`,
        feature_value: false,
        reason: 'admin_hide',
        granted_by: adminUser?.authUser.id,
      }, { onConflict: 'user_id,feature_key' })
    }
    loadAll()
  }

  async function toggleModuleDeny(moduleId: string, deny: boolean) {
    if (deny) {
      await supabase.from('user_entitlement_overrides').upsert({
        user_id: id!,
        feature_key: `module:${moduleId}`,
        feature_value: false,
        reason: 'admin_deny',
        granted_by: adminUser?.authUser.id,
      }, { onConflict: 'user_id,feature_key' })
    } else {
      await supabase.from('user_entitlement_overrides').delete()
        .eq('user_id', id!)
        .eq('feature_key', `module:${moduleId}`)
    }
    loadAll()
  }

  async function changeRole(newRole: string) {
    await supabase.from('users').update({ role: newRole }).eq('id', id!)
    loadAll()
  }

  async function grantPurchase() {
    if (!grantProductId) return
    await supabase.from('user_purchases').insert({
      user_id: id!,
      product_id: grantProductId,
      price_paid: 0,
      provider: 'admin',
      status: 'active',
      memo: '관리자 부여',
    })
    setGrantProductId('')
    setShowGrantForm(false)
    loadAll()
  }

  async function refundPurchase(purchaseId: string) {
    await supabase.from('user_purchases').update({ status: 'refunded' }).eq('id', purchaseId)
    loadAll()
  }

  async function addOverride() {
    let parsedValue: unknown = true
    try { parsedValue = JSON.parse(overrideValue) } catch { parsedValue = overrideValue }
    await supabase.from('user_entitlement_overrides').upsert({
      user_id: id!,
      feature_key: overrideKey,
      feature_value: parsedValue,
      reason: overrideReason || null,
      granted_by: adminUser?.authUser.id,
      expires_at: overrideExpires || null,
    }, { onConflict: 'user_id,feature_key' })
    setOverrideKey('')
    setOverrideValue('true')
    setOverrideReason('')
    setOverrideExpires('')
    loadAll()
  }

  async function deleteOverride(overrideId: string) {
    await supabase.from('user_entitlement_overrides').delete().eq('id', overrideId)
    loadAll()
  }

  if (loading) return <div className="text-gray-500">Loading...</div>
  if (!profile) return <div className="text-gray-500">사용자를 찾을 수 없습니다.</div>

  const entModules = entitlements && Array.isArray(entitlements.modules)
    ? (entitlements.modules as string[])
    : []

  return (
    <div>
      <Link to="/users" className="text-sm text-gray-500 hover:text-gray-700 mb-4 inline-block">&larr; 사용자 목록</Link>

      {/* Profile Header */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold">{profile.name || '이름 없음'}</h1>
            <p className="text-gray-500">{profile.email}</p>
            {profile.phone && <p className="text-gray-400 text-sm">{profile.phone}</p>}
            <p className="text-gray-400 text-xs mt-1">ID: {profile.id}</p>
            <p className="text-gray-400 text-xs">가입일: {new Date(profile.created_at).toLocaleDateString('ko')}</p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              profile.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-500'
            }`}>
              {profile.role}
            </span>
            <button
              onClick={() => changeRole(profile.role === 'admin' ? 'user' : 'admin')}
              className="px-3 py-1 text-sm border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              {profile.role === 'admin' ? 'user로 변경' : 'admin으로 변경'}
            </button>
          </div>
        </div>
      </div>

      {/* ===== Module Access Grid ===== */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold mb-1">모듈별 접근 권한</h2>
        <p className="text-xs text-gray-400 mb-4">각 모듈의 접근 상태와 출처를 확인하고 개별 제어할 수 있습니다.</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {modules.filter(m => m.status === 'available').map(mod => {
            const visible = getModuleVisibility(mod.module_id)
            const denied = getModuleDenied(mod.module_id)
            const hasAccess = entModules.includes(mod.module_id) && !denied
            const source = getModuleAccessSource(mod.module_id)
            return (
              <div key={mod.module_id} className={`rounded-lg border p-4 ${source.color}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-sm">{mod.title}</span>
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    hasAccess ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-700'
                  }`}>
                    {hasAccess ? 'O' : 'X'}
                  </span>
                </div>
                <div className="text-xs mb-1">
                  <span className={`font-medium ${
                    source.label === '차단됨' ? 'text-red-500'
                    : source.label === '미구매' ? 'text-yellow-600'
                    : source.label === '구매함' ? 'text-green-600'
                    : source.label === '관리자 부여' ? 'text-blue-600'
                    : 'text-green-600'
                  }`}>
                    {source.label}
                  </span>
                  {mod.access_type !== 'free' && (
                    <span className="text-gray-400 ml-1">({mod.access_type})</span>
                  )}
                </div>
                <div className="flex items-center gap-1.5 mb-3">
                  <span className="text-xs text-gray-400">노출:</span>
                  <button
                    onClick={() => toggleVisibility(mod.module_id, !visible)}
                    className={`px-2 py-0.5 rounded-full text-xs font-bold transition-colors ${
                      visible ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' : 'bg-orange-100 text-orange-500 hover:bg-orange-200'
                    }`}
                  >
                    {visible ? 'Y' : 'N'}
                  </button>
                  {!visible && <span className="text-xs text-orange-500">숨김</span>}
                </div>
                <div className="flex gap-1.5">
                  {denied ? (
                    <button
                      onClick={() => toggleModuleDeny(mod.module_id, false)}
                      className="flex-1 px-2 py-1.5 text-xs font-medium bg-green-100 text-green-700 rounded-md hover:bg-green-200"
                    >
                      차단 해제
                    </button>
                  ) : (
                    <button
                      onClick={() => toggleModuleDeny(mod.module_id, true)}
                      className="flex-1 px-2 py-1.5 text-xs font-medium bg-red-100 text-red-600 rounded-md hover:bg-red-200"
                    >
                      차단
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ===== Purchase History ===== */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">구매 내역</h2>
          <button
            onClick={() => setShowGrantForm(!showGrantForm)}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            + 구매 추가
          </button>
        </div>

        {showGrantForm && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 flex items-end gap-3">
            <div className="flex-1">
              <label className="block text-xs font-medium text-gray-600 mb-1">상품</label>
              <select
                value={grantProductId}
                onChange={(e) => setGrantProductId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              >
                <option value="">선택...</option>
                {availableProducts.map(p => (
                  <option key={p.id} value={p.id}>{p.name} ({p.type})</option>
                ))}
              </select>
            </div>
            <button
              onClick={grantPurchase}
              disabled={!grantProductId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50"
            >
              무료 부여
            </button>
            <button
              onClick={() => { setShowGrantForm(false); setGrantProductId('') }}
              className="px-4 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm hover:bg-gray-200"
            >
              취소
            </button>
          </div>
        )}

        {purchases.length === 0 ? (
          <p className="text-sm text-gray-400">구매 내역 없음</p>
        ) : (
          <div className="space-y-2">
            {purchases.map(p => (
              <div key={p.id} className={`flex items-center justify-between rounded-lg p-3 ${
                p.status === 'active' ? 'bg-green-50' : p.status === 'refunded' ? 'bg-gray-50' : 'bg-yellow-50'
              }`}>
                <div>
                  <span className="text-sm font-medium">
                    {p.product_name || p.bundle_name || p.product_id || p.bundle_id}
                  </span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-gray-400">{p.provider}</span>
                    <span className="text-xs text-gray-400">
                      {p.price_paid === 0 ? '무료' : `${p.price_paid.toLocaleString()}원`}
                    </span>
                    <span className="text-xs text-gray-400">
                      {new Date(p.purchased_at).toLocaleDateString('ko')}
                    </span>
                    {p.expires_at && (
                      <span className="text-xs text-orange-500">
                        만료: {new Date(p.expires_at).toLocaleDateString('ko')}
                      </span>
                    )}
                    {p.memo && <span className="text-xs text-gray-400">({p.memo})</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    p.status === 'active' ? 'bg-green-100 text-green-700'
                    : p.status === 'refunded' ? 'bg-gray-200 text-gray-500'
                    : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {p.status}
                  </span>
                  {p.status === 'active' && (
                    <button
                      onClick={() => refundPurchase(p.id)}
                      className="text-xs text-red-500 hover:text-red-700"
                    >
                      환불
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ===== Entitlements JSON (collapsed) ===== */}
      <details className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <summary className="text-sm font-semibold text-gray-500 cursor-pointer hover:text-gray-700">
          전체 권한 JSON (병합 결과)
        </summary>
        <pre className="bg-gray-50 rounded-lg p-4 text-sm overflow-auto max-h-48 mt-3">
          {JSON.stringify(entitlements, null, 2)}
        </pre>
      </details>

      {/* ===== Raw Overrides ===== */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold mb-4">개별 권한 오버라이드</h2>

        <div className="space-y-2 mb-4">
          {overrides.length === 0 ? (
            <p className="text-sm text-gray-400">오버라이드 없음</p>
          ) : overrides.map((o) => (
            <div key={o.id} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
              <div>
                <span className="font-mono text-sm font-medium">{o.feature_key}</span>
                <span className="text-sm text-gray-500 ml-2">= {JSON.stringify(o.feature_value)}</span>
                {o.reason && <span className="text-xs text-gray-400 ml-2">({o.reason})</span>}
                {o.expires_at && (
                  <span className="text-xs text-orange-500 ml-2">
                    만료: {new Date(o.expires_at).toLocaleDateString('ko')}
                  </span>
                )}
              </div>
              <button onClick={() => deleteOverride(o.id)}
                className="text-red-400 hover:text-red-600 text-sm">삭제</button>
            </div>
          ))}
        </div>

        <div className="border-t border-gray-200 pt-4">
          <h3 className="text-sm font-semibold mb-3">오버라이드 추가</h3>
          <div className="space-y-2">
            <input type="text" value={overrideKey} onChange={(e) => setOverrideKey(e.target.value)}
              placeholder="feature_key (예: module:settlement)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <input type="text" value={overrideValue} onChange={(e) => setOverrideValue(e.target.value)}
              placeholder='값 (JSON: true, 10, "unlimited")'
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <input type="text" value={overrideReason} onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="사유 (예: beta_tester, promo_2026Q1)"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <input type="datetime-local" value={overrideExpires}
              onChange={(e) => setOverrideExpires(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" />
            <button onClick={addOverride} disabled={!overrideKey}
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50">
              오버라이드 추가
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
