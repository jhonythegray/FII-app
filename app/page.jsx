// ===============================
// FII PRO APP - FULL VERSION
// Ready for Vercel Deploy
// ===============================

// ---------- package.json ----------
{
  "name": "fii-pro",
  "version": "1.0.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "14.2.15",
    "react": "18.2.0",
    "react-dom": "18.2.0",
    "recharts": "2.10.0",
    "tailwindcss": "3.4.0"
  }
}

// ---------- app/layout.jsx ----------
import './globals.css'

export const metadata = {
  title: 'FII Pro',
  description: 'Professional FII Portfolio Manager'
}

export default function RootLayout({ children }) {
  return (
    <html lang="pt-br">
      <body className="bg-[#0b0f19] text-white">{children}</body>
    </html>
  )
}

// ---------- app/page.jsx ----------
'use client'

import { useEffect, useState } from 'react'
import { PieChart, Pie, Tooltip, LineChart, Line, XAxis, YAxis } from 'recharts'

const STORAGE = 'fii_pro_v1'

function scoreFII(f) {
  let s = 0
  if (f.pvp < 1) s += 2
  if (f.dy > 0.08) s += 2
  if (f.vacancia < 0.1) s += 2
  if (f.qualidade >= 8) s += 2
  return s
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
    ? portfolio.reduce((acc, f) => acc + scoreFII(fundData[f.ticker] || {}), 0) / portfolio.length
    : 0

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

  const chartData = portfolio.map(f => ({
    name: f.ticker,
    value: f.price * f.shares
  }))

  const growth = simulate(total, aporte, 0.1)

  return (
    <div className="p-6 max-w-7xl mx-auto">

      <h1 className="text-3xl mb-6">FII PRO</h1>

      <div className="flex gap-4 mb-6">
        <button onClick={createPortfolio} className="bg-blue-600 px-4 py-2 rounded">Nova Carteira</button>
        <button onClick={addFII} className="bg-green-600 px-4 py-2 rounded">Adicionar FII</button>
      </div>

      <div className="mb-6">
        <select
          value={data.selected || ''}
          onChange={e => setData(prev => ({ ...prev, selected: e.target.value }))}
          className="bg-gray-800 p-2"
        >
          <option value="">Selecione</option>
          {Object.keys(data.portfolios).map(p => (
            <option key={p}>{p}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <Card title="Total" value={`R$ ${total.toFixed(2)}`} />
        <Card title="Score" value={score.toFixed(2)} />
        <Card title="FIIs" value={portfolio.length} />
        <Card title="Aporte" value={`R$ ${aporte}`} />
      </div>

      <div className="grid grid-cols-2 gap-6">

        <div className="bg-[#111827] p-4 rounded">
          <h2 className="mb-4">Distribuição</h2>
          <PieChart width={400} height={300}>
            <Pie data={chartData} dataKey="value" nameKey="name" />
            <Tooltip />
          </PieChart>
        </div>

        <div className="bg-[#111827] p-4 rounded">
          <h2 className="mb-4">Projeção</h2>
          <LineChart width={400} height={300} data={growth}>
            <XAxis dataKey="month" />
            <YAxis />
            <Tooltip />
            <Line dataKey="value" />
          </LineChart>
        </div>

      </div>

    </div>
  )
}

function Card({ title, value }) {
  return (
    <div className="bg-[#111827] p-4 rounded">
      <div className="text-gray-400">{title}</div>
      <div className="text-xl">{value}</div>
    </div>
  )
}

// ---------- public/data/fii.json ----------
{
  "HGLG11": { "pvp": 0.95, "dy": 0.085, "vacancia": 0.05, "qualidade": 9 },
  "XPLG11": { "pvp": 0.98, "dy": 0.082, "vacancia": 0.06, "qualidade": 8 }
}

// ===============================
// READY ✅
// ===============================