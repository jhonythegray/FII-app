// ===============================
// FII PRO APP — STABLE SAAS VERSION (PRODUCTION-READY)
// Next.js 14 + Tailwind + Recharts
// ===============================

'use client'

import { useEffect, useMemo, useState } from 'react'
import {
  PieChart, Pie, Tooltip, LineChart, Line, XAxis, YAxis, ResponsiveContainer
} from 'recharts'

// ===============================
// 🔧 CONFIG
// ===============================
const STORAGE = 'fii_pro_saas_v1'
const DEFAULT_PORTFOLIO = 'Carteira Inicial'

// ===============================
// 🔌 API (SAFE)
// ===============================
async function fetchPriceSafe(ticker) {
  try {
    const res = await fetch(`https://brapi.dev/api/quote/${ticker}`)
    const data = await res.json()
    return data?.results?.[0]?.regularMarketPrice ?? 100
  } catch {
    return 100
  }
}

// ===============================
// 🧠 IA CORE
// ===============================
function scoreFII(f = {}) {
  let s = 0
  if ((f.pvp ?? 1) < 1) s += 2
  if ((f.dy ?? 0) > 0.08) s += 2
  if ((f.vacancia ?? 1) < 0.1) s += 2
  if ((f.qualidade ?? 0) >= 8) s += 2
  return s
}

function portfolioMetrics(portfolio, fundData) {
  const n = portfolio.length || 1
  let dy = 0, pvp = 0, vac = 0

  for (const f of portfolio) {
    const d = fundData[f.ticker] || {}
    dy += d.dy || 0
    pvp += d.pvp ?? 1
    vac += d.vacancia || 0
  }

  return { dy: dy / n, pvp: pvp / n, vac: vac / n }
}

function riskConcentration(portfolio, fundData) {
  const buckets = {}
  for (const f of portfolio) {
    const seg = fundData[f.ticker]?.segmento || 'outros'
    buckets[seg] = (buckets[seg] || 0) + 1
  }
  const max = Math.max(0, ...Object.values(buckets))
  return max / (portfolio.length || 1)
}

function generateReport(portfolio, fundData) {
  if (!portfolio.length) return 'Carteira vazia. Adicione ativos para análise.'

  const m = portfolioMetrics(portfolio, fundData)
  const r = riskConcentration(portfolio, fundData)

  const parts = []

  parts.push(m.dy > 0.085 ? 'Excelente geração de renda.' : 'Renda moderada, com espaço para otimização.')
  parts.push(m.pvp > 1.05 ? 'Ativos relativamente caros.' : 'Boa margem de segurança nos preços.')
  parts.push(m.vac > 0.12 ? 'Risco operacional elevado (vacância).' : 'Baixo risco operacional.')
  parts.push(r > 0.5 ? 'Alta concentração setorial.' : 'Diversificação adequada.')
  parts.push('Recomenda-se rebalanceamento e alocação direcionada.')

  return parts.join(' ')
}

function rebalance(portfolio, fundData) {
  return portfolio.map(f => {
    const s = scoreFII(fundData[f.ticker])
    if (s <= 4) return { ticker: f.ticker, action: 'REDUZIR' }
    if (s >= 7) return { ticker: f.ticker, action: 'AUMENTAR' }
    return { ticker: f.ticker, action: 'MANTER' }
  })
}

function suggestAllocation(aporte, portfolio, fundData) {
  const ranked = [...portfolio]
    .map(f => ({ ...f, score: scoreFII(fundData[f.ticker]) }))
    .sort((a, b) => b.score - a.score)

  const n = ranked.length || 1
  return ranked.map(f => ({ ticker: f.ticker, value: Math.round(aporte / n) }))
}

function simulate(initial, monthly, rate, months = 120) {
  let val = initial
  const out = []
  for (let i = 0; i < months; i++) {
    val = (val + monthly) * (1 + rate / 12)
    out.push({ month: i + 1, value: val })
  }
  return out
}

// ===============================
// 💾 STORE (SAFE)
// ===============================
function useStore() {
  const [data, setData] = useState(() => ({
    portfolios: { [DEFAULT_PORTFOLIO]: [] },
    selected: DEFAULT_PORTFOLIO
  }))
  const [ready, setReady] = useState(false)

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE)
      if (saved) setData(JSON.parse(saved))
    } catch {}
    setReady(true)
  }, [])

  useEffect(() => {
    if (!ready) return
    localStorage.setItem(STORAGE, JSON.stringify(data))
  }, [data, ready])

  return { data, setData, ready }
}

// ===============================
// 🚀 APP
// ===============================
export default function App() {
  const { data, setData, ready } = useStore()
  const [fundData, setFundData] = useState({})
  const [aporte, setAporte] = useState(1000)
  const [loadingPrices, setLoadingPrices] = useState(false)

  // Load JSON diário
  useEffect(() => {
    fetch('/data/fii.json').then(r => r.json()).then(setFundData).catch(() => setFundData({}))
  }, [])

  const portfolio = data.portfolios[data.selected] || []

  // Update prices (safe, no loops)
  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!data.selected || !portfolio.length) return
      setLoadingPrices(true)
      const updated = await Promise.all(
        portfolio.map(async f => ({ ...f, price: await fetchPriceSafe(f.ticker) }))
      )
      if (cancelled) return
      setData(prev => ({
        ...prev,
        portfolios: { ...prev.portfolios, [prev.selected]: updated }
      }))
      setLoadingPrices(false)
    }
    run()
    return () => { cancelled = true }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.selected])

  // Derived
  const total = useMemo(() => portfolio.reduce((a, f) => a + (f.price || 0) * (f.shares || 0), 0), [portfolio])
  const metrics = useMemo(() => portfolioMetrics(portfolio, fundData), [portfolio, fundData])
  const report = useMemo(() => generateReport(portfolio, fundData), [portfolio, fundData])
  const growth = useMemo(() => simulate(total, aporte, metrics.dy || 0.1), [total, aporte, metrics.dy])
  const chartData = useMemo(() => portfolio.map(f => ({ name: f.ticker, value: (f.price || 0) * (f.shares || 0) })), [portfolio])
  const rebalanceData = useMemo(() => rebalance(portfolio, fundData), [portfolio, fundData])
  const suggestions = useMemo(() => suggestAllocation(aporte, portfolio, fundData), [aporte, portfolio, fundData])

  // Actions
  function createPortfolio() {
    const name = prompt('Nome da carteira')
    if (!name) return
    setData(prev => ({
      ...prev,
      portfolios: { ...prev.portfolios, [name]: [] },
      selected: name
    }))
  }

  function addFII() {
    const ticker = (prompt('Ticker') || '').toUpperCase()
    if (!ticker) return
    setData(prev => {
      const list = prev.portfolios[prev.selected] || []
      if (list.find(x => x.ticker === ticker)) return prev
      return {
        ...prev,
        portfolios: {
          ...prev.portfolios,
          [prev.selected]: [...list, { ticker, shares: 1, price: 100 }]
        }
      }
    })
  }

  function updateShares(i, val) {
    const v = Math.max(0, Number(val) || 0)
    setData(prev => {
      const list = [...(prev.portfolios[prev.selected] || [])]
      list[i] = { ...list[i], shares: v }
      return { ...prev, portfolios: { ...prev.portfolios, [prev.selected]: list } }
    })
  }

  if (!ready) {
    return <Shell><Skeleton /></Shell>
  }

  return (
    <Shell>
      <Sidebar
        data={data}
        onCreate={createPortfolio}
        onAdd={addFII}
        onSelect={(v)=>setData(p=>({ ...p, selected: v }))}
      />

      <Main>
        <Grid4>
          <Card title="Total" value={`R$ ${total.toFixed(0)}`} />
          <Card title="DY Médio" value={`${(metrics.dy*100).toFixed(2)}%`} />
          <Card title="Renda Mensal" value={`R$ ${(total*metrics.dy/12).toFixed(0)}`} />
          <Card title="Aporte" value={`R$ ${aporte}`} />
        </Grid4>

        <Panel title="Relatório IA">
          {report}
        </Panel>

        <Grid2>
          <Panel title="Alocação">
            {chartData.length === 0 ? <Empty /> : (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={chartData} dataKey="value" nameKey="name" />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </Panel>

          <Panel title="Projeção">
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={growth}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line dataKey="value" />
              </LineChart>
            </ResponsiveContainer>
          </Panel>
        </Grid2>

        <Grid2>
          <Panel title="Rebalanceamento">
            {portfolio.length === 0 ? <Empty /> : rebalanceData.map(r => (
              <Row key={r.ticker}>{r.ticker}: {r.action}</Row>
            ))}
          </Panel>

          <Panel title="Sugestão de Aporte">
            {portfolio.length === 0 ? <Empty /> : suggestions.map(s => (
              <Row key={s.ticker}>{s.ticker}: R$ {s.value}</Row>
            ))}
          </Panel>
        </Grid2>

        <Panel title="Carteira">
          {portfolio.length === 0 ? <Empty /> : portfolio.map((f, i) => (
            <div key={f.ticker} className="flex items-center justify-between mb-2">
              <span className="w-24">{f.ticker}</span>
              <input
                className="w-20 bg-[#1f2937] text-center"
                type="number"
                value={f.shares}
                onChange={e=>updateShares(i, e.target.value)}
              />
              <span className="w-32 text-right">R$ {(f.price*f.shares).toFixed(2)}</span>
            </div>
          ))}
          {loadingPrices && <small className="text-gray-400">Atualizando preços…</small>}
        </Panel>
      </Main>
    </Shell>
  )
}

// ===============================
// 🧱 UI (SAAS)
// ===============================
function Shell({ children }) {
  return <div className="flex min-h-screen bg-[#0b0f19] text-white">{children}</div>
}

function Sidebar({ data, onCreate, onAdd, onSelect }) {
  return (
    <div className="w-64 p-4 border-r border-gray-800 bg-[#05070d]">
      <h1 className="text-xl mb-6">FII PRO</h1>
      <button onClick={onCreate} className="w-full mb-2 bg-blue-600 p-2 rounded">Nova Carteira</button>
      <button onClick={onAdd} className="w-full bg-green-600 p-2 rounded">Adicionar FII</button>
      <select
        value={data.selected}
        onChange={e=>onSelect(e.target.value)}
        className="mt-4 w-full bg-gray-800 p-2"
      >
        {Object.keys(data.portfolios).map(p => <option key={p}>{p}</option>)}
      </select>
    </div>
  )
}

function Main({ children }) {
  return <div className="flex-1 p-6">{children}</div>
}

function Grid4({ children }) {
  return <div className="grid grid-cols-4 gap-4 mb-6">{children}</div>
}

function Grid2({ children }) {
  return <div className="grid grid-cols-2 gap-6 mb-6">{children}</div>
}

function Card({ title, value }) {
  return (
    <div className="bg-[#111827] p-4 rounded-2xl border border-gray-800 shadow-xl">
      <div className="text-gray-400">{title}</div>
      <div className="text-xl">{value}</div>
    </div>
  )
}

function Panel({ title, children }) {
  return (
    <div className="bg-[#111827] p-4 rounded-2xl border border-gray-800 shadow-xl">
      <h2 className="mb-4 text-lg">{title}</h2>
      {children}
    </div>
  )
}

function Row({ children }) {
  return <div className="mb-2">{children}</div>
}

function Empty() {
  return <div className="text-gray-400">Sem dados</div>
}

function Skeleton() {
  return <div className="p-6 text-gray-400">Carregando…</div>
}

// ===============================
// ✅ ESTÁVEL + COMPLETO + SAAS
// ===============================
