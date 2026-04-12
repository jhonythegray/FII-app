// ===============================
// FII PRO APP - HEDGE FUND + IA VERSION
// ===============================

'use client'

import { useEffect, useState } from 'react'
import { PieChart, Pie, Tooltip, LineChart, Line, XAxis, YAxis } from 'recharts'

const STORAGE = 'fii_pro_v2'

// ===============================
// 🧠 IA ENGINE
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

function explainFII(ticker, f) {
  if (!f) return "Sem dados"

  if (f.vacancia > 0.15) return `${ticker}: risco alto (vacância elevada)`
  if (f.pvp > 1.1) return `${ticker}: sobrevalorizado`
  if (f.dy > 0.09) return `${ticker}: excelente gerador de renda`

  return `${ticker}: ativo equilibrado`
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
// 🚀 APP
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

  const portfolio = data.portfolios[data.selected] || []

  const total = portfolio.reduce((acc, f) => acc + f.price * f.shares, 0)

  const score = portfolio.length
    ? portfolio.reduce((acc, f) => acc + scoreFII(fundData[f.ticker]), 0) / portfolio.length
    : 0

  const dyMedio = portfolio.length
    ? portfolio.reduce((acc, f) => acc + (fundData[f.ticker]?.dy || 0), 0) / portfolio.length
    : 0

  const rendaMensal = total * dyMedio / 12

  const growth = simulate(total, aporte, dyMedio || 0.1)

  const chartData = portfolio.map(f => ({
    name: f.ticker,
    value: f.price * f.shares
  }))

  const rebalanceData = rebalance(portfolio, fundData)

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
    const ticker = prompt('Ticker')
    if (!ticker) return

    setData(prev => {
      const list = prev.portfolios[prev.selected] || []
      return {
        ...prev,
        portfolios: {
          ...prev.portfolios,
          [prev.selected]: [...list, { ticker, shares: 1, price: 100 }]
        }
      }
    })
  }

  return (
    <div className="flex">

      {/* SIDEBAR */}
      <div className="w-64 min-h-screen bg-[#05070d] p-4 border-r border-gray-800">
        <h2 className="text-xl mb-6">FII PRO</h2>

        <button onClick={createPortfolio} className="w-full mb-2 bg-blue-600 p-2 rounded">Nova Carteira</button>
        <button onClick={addFII} className="w-full bg-green-600 p-2 rounded">Adicionar FII</button>

        <select
          value={data.selected || ''}
          onChange={e => setData(prev => ({ ...prev, selected: e.target.value }))}
          className="mt-4 w-full bg-gray-800 p-2"
        >
          <option value="">Selecionar</option>
          {Object.keys(data.portfolios).map(p => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>

      {/* MAIN */}
      <div className="flex-1 p-6">

        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card title="Total" value={`R$ ${total.toFixed(0)}`} />
          <Card title="Score" value={score.toFixed(2)} />
          <Card title="DY Médio" value={(dyMedio*100).toFixed(2)+"%"} />
          <Card title="Renda Mensal" value={`R$ ${rendaMensal.toFixed(0)}`} />
        </div>

        <div className="grid grid-cols-2 gap-6 mb-6">

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

        <Panel title="IA - Recomendações">
          {portfolio.map(f => (
            <div key={f.ticker} className="mb-2">
              {explainFII(f.ticker, fundData[f.ticker])}
            </div>
          ))}
        </Panel>

        <Panel title="Rebalanceamento">
          {rebalanceData.map(r => (
            <div key={r.ticker}>{r.ticker}: {r.action}</div>
          ))}
        </Panel>

      </div>

    </div>
  )
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

// ===============================
// FINAL - HEDGE FUND LEVEL UI + IA
// ===============================