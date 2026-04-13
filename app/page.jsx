'use client'

import { useEffect, useMemo, useState } from 'react'
import { PieChart, Pie, Tooltip, LineChart, Line, XAxis, YAxis, ResponsiveContainer } from 'recharts'

const STORAGE = 'fii_pro_ui'
const DEFAULT_PORTFOLIO = 'Carteira Inicial'

// API
async function fetchPriceSafe(ticker) {
  try {
    const res = await fetch(`https://brapi.dev/api/quote/${ticker}`)
    const data = await res.json()
    return data?.results?.[0]?.regularMarketPrice ?? 100
  } catch {
    return 100
  }
}

// QUANT
function buildMatrix(portfolio, fundData) {
  return portfolio.map(f => {
    const d = fundData[f.ticker] || {}
    return {
      ticker: f.ticker,
      retorno: d.dy || 0,
      risco: d.vacancia || 0.1,
      valor: (f.price || 0) * (f.shares || 0)
    }
  })
}

function expectedReturn(matrix) {
  if (!matrix.length) return 0
  return matrix.reduce((a,f)=>a+f.retorno,0)/matrix.length
}

function correlationMatrix(portfolio, fundData) {
  const matrix = buildMatrix(portfolio, fundData)
  const n = matrix.length
  const corr = Array(n).fill(0).map(()=>Array(n).fill(0))

  for (let i=0;i<n;i++){
    for (let j=0;j<n;j++){
      if(i===j) corr[i][j]=1
      else{
        const segI = fundData[matrix[i].ticker]?.segmento
        const segJ = fundData[matrix[j].ticker]?.segmento
        corr[i][j] = segI===segJ ? 0.8 : 0.3
      }
    }
  }

  return corr
}

function portfolioRisk(matrix, corr) {
  let risk = 0
  for (let i=0;i<matrix.length;i++){
    for (let j=0;j<matrix.length;j++){
      risk += matrix[i].retorno * matrix[j].retorno * corr[i][j]
    }
  }
  return Math.sqrt(risk)
}

function markowitzOptimization(portfolio, fundData) {
  const matrix = buildMatrix(portfolio, fundData)
  const weights = matrix.map(f => f.retorno / (f.risco + 0.01))
  const sum = weights.reduce((a,b)=>a+b,0) || 1
  return matrix.map((f,i)=>({ ticker: f.ticker, weight: weights[i]/sum }))
}

function monteCarlo(initial, monthly, returnRate, volatility, simulations=100) {
  const results=[]
  for(let s=0;s<simulations;s++){
    let value=initial
    for(let i=0;i<120;i++){
      const shock=(Math.random()-0.5)*volatility
      value=(value+monthly)*(1+returnRate+shock)
    }
    results.push(value)
  }
  return results.sort((a,b)=>a-b)
}

// STORE
function useStore(){
  const [data,setData]=useState({ portfolios:{[DEFAULT_PORTFOLIO]:[]}, selected:DEFAULT_PORTFOLIO })
  const [ready,setReady]=useState(false)

  useEffect(()=>{
    const saved=localStorage.getItem(STORAGE)
    if(saved) setData(JSON.parse(saved))
    setReady(true)
  },[])

  useEffect(()=>{
    if(ready) localStorage.setItem(STORAGE,JSON.stringify(data))
  },[data,ready])

  return {data,setData,ready}
}

// APP
export default function App(){
  const {data,setData,ready}=useStore()
  const [fundData,setFundData]=useState({})
  const [modal,setModal]=useState(false)
  const [ticker,setTicker]=useState('')
  const [aporte,setAporte]=useState(1000)

  useEffect(()=>{
    fetch('/data/fii.json').then(r=>r.json()).then(setFundData)
  },[])

  const portfolio = data.portfolios[data.selected] || []

  useEffect(()=>{
    async function update(){
      const updated = await Promise.all(
        portfolio.map(async f=>({...f,price:await fetchPriceSafe(f.ticker)}))
      )
      setData(prev=>({
        ...prev,
        portfolios:{...prev.portfolios,[prev.selected]:updated}
      }))
    }
    if(portfolio.length) update()
  },[data.selected])

  const matrix = buildMatrix(portfolio,fundData)
  const corr = correlationMatrix(portfolio,fundData)

  const ret = expectedReturn(matrix)
  const risk = portfolioRisk(matrix,corr)
  const sharpe = ret/(risk+0.0001)

  const total = portfolio.reduce((a,f)=>a+(f.price||0)*(f.shares||0),0)

  const mc = monteCarlo(total, aporte, ret||0.08, risk||0.05)
  const p10 = mc[Math.floor(mc.length*0.1)]
  const p50 = mc[Math.floor(mc.length*0.5)]
  const p90 = mc[Math.floor(mc.length*0.9)]

  const opt = markowitzOptimization(portfolio,fundData)

  function addFII(){
    const t = ticker.trim().toUpperCase()

    if(!t){
      alert("Digite um ticker válido (ex: HGLG11)")
      return
    }

    setData(prev=>{
      const list = prev.portfolios[prev.selected] || []

      if(list.find(f=>f.ticker===t)){
        alert("Esse FII já existe")
        return prev
      }

      return {
        ...prev,
        portfolios:{
          ...prev.portfolios,
          [prev.selected]:[
            ...list,
            { ticker: t, shares: 1, price: 100 }
          ]
        }
      }
    })

    setTicker('')
    setModal(false)
  }

  const sharpeColor =
    sharpe>1.5 ? "text-green-400" :
    sharpe>1 ? "text-yellow-400" :
    "text-red-400"

  if(!ready) return <div className="p-6">Carregando...</div>

  return (
    <div className="flex min-h-screen bg-[#0b0f19] text-white">

      {/* MODAL */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
          <div className="bg-[#111827] p-6 rounded-xl w-80">
            <input
              value={ticker}
              onChange={e=>setTicker(e.target.value)}
              placeholder="Ex: HGLG11"
              className="bg-gray-800 p-2 mb-4 w-full"
            />
            <button onClick={addFII} className="bg-green-600 px-4 py-2 rounded w-full">
              Adicionar
            </button>
          </div>
        </div>
      )}

      {/* EMPTY STATE */}
      {!portfolio.length ? (
        <div className="flex items-center justify-center w-full h-screen">
          <div className="text-center">
            <h1 className="text-2xl mb-4">Comece sua análise</h1>
            <button
              onClick={()=>setModal(true)}
              className="bg-blue-600 px-6 py-3 rounded"
            >
              Adicionar FII
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="w-64 p-4 border-r border-gray-800">
            <button
              onClick={()=>setModal(true)}
              className="w-full bg-green-600 p-2 rounded"
            >
              Adicionar FII
            </button>
          </div>

          <div className="flex-1 p-6">

            <div className="grid grid-cols-5 gap-4 mb-6">
              <Card title="Total" value={`R$ ${total.toFixed(0)}`} />
              <Card title="Retorno" value={`${(ret*100).toFixed(2)}%`} />
              <Card title="Risco" value={`${(risk*100).toFixed(2)}%`} />
              <Card title="Sharpe" value={<span className={sharpeColor}>{sharpe.toFixed(2)}</span>} />
              <Card title="Monte Carlo" value={`R$ ${p50?.toFixed(0)}`} />
            </div>

            <Panel title="Cenários">
              <div>Pessimista: R$ {p10?.toFixed(0)}</div>
              <div>Base: R$ {p50?.toFixed(0)}</div>
              <div>Otimista: R$ {p90?.toFixed(0)}</div>
            </Panel>

            <Panel title="Plano de Ação">
              {opt.map(o=> (
                <div key={o.ticker}>
                  Ajustar {o.ticker} para {(o.weight*100).toFixed(1)}%
                </div>
              ))}
            </Panel>

            <Panel title="Alocação">
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie data={portfolio.map(f=>({name:f.ticker,value:f.price*f.shares}))} dataKey="value" />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </Panel>

          </div>
        </>
      )}

    </div>
  )
}

function Card({title,value}){
  return <div className="bg-[#111827] p-4 rounded-xl"><div>{title}</div><div className="text-xl">{value}</div></div>
}

function Panel({title,children}){
  return <div className="bg-[#111827] p-4 rounded-xl mb-4"><h2 className="mb-2">{title}</h2>{children}</div>
}