// ===============================
// FII PRO APP - INSTITUTIONAL AI VERSION (GESTOR PROFISSIONAL)
// ===============================

'use client'

import { useEffect, useState } from 'react'
import { PieChart, Pie, Tooltip, LineChart, Line, XAxis, YAxis } from 'recharts'

const STORAGE = 'fii_pro_ultra'

// ===============================
// 🔌 API
// ===============================

async function fetchPrice(ticker) {
  try {
    const res = await fetch(`https://brapi.dev/api/quote/${ticker}`)
    const data = await res.json()
    return data?.results?.[0]?.regularMarketPrice || 100
  } catch {
    return 100
  }
}

// ===============================
// 🧠 IA NÍVEL GESTOR
// ===============================

function scoreFII(f) {
  if (!f) return 0
  let s = 0
  if (f.pvp < 1) s += 2
  if (f.dy > 0.08) s += 2
  if (f.vacancia < 0.1) s += 2
  if (f.qualidade >= 8) s += 2
  return s
}

function portfolioMetrics(portfolio, fundData) {
  let dy = 0, pvp = 0, vac = 0

  portfolio.forEach(f => {
    const d = fundData[f.ticker] || {}
    dy += d.dy || 0
    pvp += d.pvp || 1
    vac += d.vacancia || 0
  })

  const n = portfolio.length || 1

  return {
    dy: dy / n,
    pvp: pvp / n,
    vac: vac / n
  }
}

function riskAnalysis(portfolio, fundData) {
  let concentration = {}

  portfolio.forEach(f => {
    const seg = fundData[f.ticker]?.segmento || 'outros'
    concentration[seg] = (concentration[seg] || 0) + 1
  })

  const max = Math.max(...Object.values(concentration), 0)
  const total = portfolio.length || 1

  return max / total
}

function generateReport(portfolio, fundData) {
  if (!portfolio.length) return "Carteira vazia"

  const metrics = portfolioMetrics(portfolio, fundData)
  const risk = riskAnalysis(portfolio, fundData)

  let report = ""

  // DY
  if (metrics.dy > 0.085) report += "Carteira com excelente geração de renda. "
  else report += "Renda moderada, com espaço para otimização. "

  // PVP
  if (metrics.pvp > 1.05) report += "Ativos relativamente caros. "
  else report += "Boa margem de segurança nos preços. "

  // VACANCIA
  if (metrics.vac > 0.12) report += "Risco elevado via vacância. "
  else report += "Baixo risco operacional. "

  // CONCENTRAÇÃO
  if (risk > 0.5) report += "Alta concentração setorial, aumentando risco estrutural. "
  else report += "Diversificação adequada. "

  // FINAL
  report += "Recomenda-se ajuste fino via rebalanceamento e alocação direcionada."

  return report
}

function suggestAllocation(aporte, portfolio, fundData) {
  const ranked = portfolio
    .map(f => ({ ...f, score: scoreFII(fundData[f.ticker]) }))
    .sort((a,b)=>b.score-a.score)

  return ranked.map(f => ({
    ticker: f.ticker,
    value: (aporte / ranked.length).toFixed(0)
  }))
}

function rebalance(portfolio, fundData) {
  return portfolio.map(f => {
    const score = scoreFII(fundData[f.ticker])
    if (score <= 4) return { ticker: f.ticker, action: 'REDUZIR' }
    if (score >= 7) return { ticker: f.ticker, action: 'AUMENTAR' }
    return { ticker: f.ticker, action: 'MANTER' }
  })
}

function simulate(initial, monthly, rate, months = 120) {
  let val = initial
  let data = []

  for (let i = 0; i < months; i++) {
    val = (val + monthly) * (1 + rate / 12)
    data.push({ month: i, value: val })
  }

  return data
}

// ===============================
// APP
// ===============================

export default function App() {
  const [data, setData] = useState({ portfolios: {}, selected: null })
  const [aporte, setAporte] = useState(1000)
  const [fundData, setFundData] = useState({})

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE)
    if (saved) setData(JSON.parse(saved))
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE, JSON.stringify(data))
  }, [data])

  useEffect(() => {
    fetch('/data/fii.json')
      .then(r => r.json())
      .then(setFundData)
  }, [])

  useEffect(() => {
    async function updatePrices() {
      if (!data.selected) return

      const updated = await Promise.all(
        (data.portfolios[data.selected] || []).map(async f => ({
          ...f,
          price: await fetchPrice(f.ticker)
        }))
      )

      setData(prev => ({
        ...prev,
        portfolios: {
          ...prev.portfolios,
          [prev.selected]: updated
        }
      }))
    }

    updatePrices()
  }, [data.selected])

  const portfolio = data.portfolios[data.selected] || []

  const total = portfolio.reduce((acc, f) => acc + f.price * f.shares, 0)

  const metrics = portfolioMetrics(portfolio, fundData)
  const report = generateReport(portfolio, fundData)

  const growth = simulate(total, aporte, metrics.dy || 0.1)

  const chartData = portfolio.map(f => ({
    name: f.ticker,
    value: f.price * f.shares
  }))

  const rebalanceData = rebalance(portfolio, fundData)
  const suggestions = suggestAllocation(aporte, portfolio, fundData)

  return (
    <div className="flex">

      <div className="w-64 min-h-screen bg-[#05070d] p-4 border-r border-gray-800">
        <h2 className="text-xl mb-6">FII PRO</h2>
      </div>

      <div className="flex-1 p-6">

        <Panel title="Relatório IA">
          {report}
        </Panel>

        <div className="grid grid-cols-2 gap-6 my-6">

          <Panel title="Alocação">
            <PieChart width={400} height={300}>
              <Pie data={chartData} dataKey="value" nameKey="name" />
              <Tooltip />
            </PieChart>
          </Panel>

          <Panel title="Projeção">
            <LineChart width={400} height={300} data={growth}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line dataKey="value" />
            </LineChart>
          </Panel>

        </div>

        <Panel title="Rebalanceamento">
          {rebalanceData.map(r => (
            <div key={r.ticker}>{r.ticker}: {r.action}</div>
          ))}
        </Panel>

        <Panel title="Sugestão de Aporte">
          {suggestions.map(s => (
            <div key={s.ticker}>{s.ticker}: R$ {s.value}</div>
          ))}
        </Panel>

      </div>

    </div>
  )
}

function Panel({ title, children }) {
  return (
    <div className="bg-[#111827] p-4 rounded-2xl border border-gray-800 shadow-xl mb-4">
      <h2 className="mb-4 text-lg">{title}</h2>
      {children}
    </div>
  )
}

// ===============================
// IA NÍVEL GESTOR ENTREGUE
// ===============================
