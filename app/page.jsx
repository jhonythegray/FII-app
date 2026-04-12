// ===============================
// FII PRO APP — QUANT INTEGRATED (STABLE SAAS)
// ===============================

'use client'

import { useEffect, useMemo, useState } from 'react'
import { PieChart, Pie, Tooltip, LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts'

const STORAGE = 'fii_pro_quant'
const DEFAULT_PORTFOLIO = 'Carteira Inicial'

// ===============================
// 🔌 API
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
// 🧠 QUANT ENGINE
// ===============================

function buildMatrix(portfolio, fundData) {
  return portfolio.map(f => {
    const d = fundData[f.ticker] || {}
    return {
      ticker: f.ticker,
      retorno: d.dy || 0,
      risco: d.vacancia || 0.1,
      valor: f.price * f.shares
    }
  })
}

function expectedReturn(matrix) {
  if (!matrix.length) return 0
  return matrix.reduce((a,f)=>a+f.retorno,0)/matrix.length
}

function portfolioVariance(matrix) {
  if (!matrix.length) return 0
  const mean = expectedReturn(matrix)
  return matrix.reduce((acc,f)=>acc + Math.pow(f.retorno - mean,2),0)
}

function quantScore(matrix) {
  const ret = expectedReturn(matrix)
  const risk = portfolioVariance(matrix)
  return ret / (risk + 0.0001)
}

function optimizeAllocation(portfolio, fundData) {
  const matrix = buildMatrix(portfolio, fundData)

  const total = matrix.reduce((a,f)=>a + (f.retorno/(f.risco+0.01)),0)

  return matrix.map(f => ({
    ticker: f.ticker,
    weight: total ? (f.retorno/(f.risco+0.01))/total : 0
  }))
}

function smartAporte(aporte, portfolio, fundData) {
  const opt = optimizeAllocation(portfolio, fundData)
  return opt.map(f => ({
    ticker: f.ticker,
    value: Math.round(f.weight * aporte)
  }))
}

function quantReport(portfolio, fundData) {
  const matrix = buildMatrix(portfolio, fundData)

  if (!matrix.length) return 'Carteira vazia.'

  const ret = expectedReturn(matrix)
  const risk = portfolioVariance(matrix)
  const score = quantScore(matrix)

  return `Retorno esperado: ${(ret*100).toFixed(2)}% | Risco: ${(risk*100).toFixed(2)}% | Sharpe: ${score.toFixed(2)}\n\nEficiência: ${score>1 ? 'Boa relação risco/retorno' : 'Baixa eficiência — otimização recomendada.'}`
}

function simulate(initial, monthly, rate, months=120){
  let val = initial
  const data=[]
  for(let i=0;i<months;i++){
    val=(val+monthly)*(1+rate/12)
    data.push({month:i+1,value:val})
  }
  return data
}

// ===============================
// STORE
// ===============================
function useStore(){
  const [data,setData]=useState({
    portfolios:{[DEFAULT_PORTFOLIO]:[]},
    selected:DEFAULT_PORTFOLIO
  })
  const [ready,setReady]=useState(false)

  useEffect(()=>{
    try{
      const saved=localStorage.getItem(STORAGE)
      if(saved) setData(JSON.parse(saved))
    }catch{}
    setReady(true)
  },[])

  useEffect(()=>{
    if(ready) localStorage.setItem(STORAGE,JSON.stringify(data))
  },[data,ready])

  return {data,setData,ready}
}

// ===============================
// APP
// ===============================
export default function App(){
  const {data,setData,ready}=useStore()
  const [fundData,setFundData]=useState({})
  const [aporte,setAporte]=useState(1000)

  useEffect(()=>{
    fetch('/data/fii.json').then(r=>r.json()).then(setFundData).catch(()=>setFundData({}))
  },[])

  const portfolio = data.portfolios[data.selected] || []

  useEffect(()=>{
    let cancel=false
    async function update(){
      if(!portfolio.length) return
      const updated = await Promise.all(
        portfolio.map(async f=>({...f,price:await fetchPriceSafe(f.ticker)}))
      )
      if(cancel) return
      setData(prev=>({
        ...prev,
        portfolios:{...prev.portfolios,[prev.selected]:updated}
      }))
    }
    update()
    return ()=>{cancel=true}
  // eslint-disable-next-line
  },[data.selected])

  const total = useMemo(()=>portfolio.reduce((a,f)=>a+(f.price||0)*(f.shares||0),0),[portfolio])

  const matrix = useMemo(()=>buildMatrix(portfolio,fundData),[portfolio,fundData])
  const qScore = quantScore(matrix)
  const ret = expectedReturn(matrix)
  const risk = portfolioVariance(matrix)

  const report = quantReport(portfolio,fundData)
  const suggestions = smartAporte(aporte,portfolio,fundData)

  const chartData = portfolio.map(f=>({name:f.ticker,value:f.price*f.shares}))
  const growth = simulate(total,aporte,ret||0.1)

  function addFII(){
    const ticker=(prompt('Ticker')||'').toUpperCase()
    if(!ticker) return
    setData(prev=>{
      const list=prev.portfolios[prev.selected]||[]
      return {...prev,portfolios:{...prev.portfolios,[prev.selected]:[...list,{ticker,shares:1,price:100}]}}
    })
  }

  if(!ready) return <div className="p-6 text-white">Carregando...</div>

  return (
    <div className="flex min-h-screen bg-[#0b0f19] text-white">

      <div className="w-64 p-4 border-r border-gray-800">
        <button onClick={addFII} className="w-full bg-green-600 p-2 rounded">Adicionar FII</button>
      </div>

      <div className="flex-1 p-6">

        <div className="grid grid-cols-4 gap-4 mb-6">
          <Card title="Total" value={`R$ ${total.toFixed(0)}`} />
          <Card title="Retorno" value={`${(ret*100).toFixed(2)}%`} />
          <Card title="Risco" value={`${(risk*100).toFixed(2)}%`} />
          <Card title="Sharpe" value={qScore.toFixed(2)} />
        </div>

        <Panel title="Relatório Quant">{report}</Panel>

        <div className="grid grid-cols-2 gap-6 my-6">
          <Panel title="Alocação">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie data={chartData} dataKey="value" nameKey="name" />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Panel>

          <Panel title="Projeção">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={growth}>
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Line dataKey="value" />
              </LineChart>
            </ResponsiveContainer>
          </Panel>
        </div>

        <Panel title="Sugestão Quant de Aporte">
          {suggestions.map(s=>(<div key={s.ticker}>{s.ticker}: R$ {s.value}</div>))}
        </Panel>

      </div>

    </div>
  )
}

function Card({title,value}){
  return <div className="bg-[#111827] p-4 rounded-xl">{title}<div>{value}</div></div>
}

function Panel({title,children}){
  return <div className="bg-[#111827] p-4 rounded-xl mb-4"><h2>{title}</h2>{children}</div>
}

// ===============================
// 🚀 QUANT ENGINE INTEGRADO
// ===============================