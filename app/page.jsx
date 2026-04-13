'use client'

import { useEffect, useState } from 'react'
import { PieChart, Pie, Tooltip, ResponsiveContainer } from 'recharts'

const STORAGE = 'fii_fintech'
const DEFAULT_PORTFOLIO = 'Carteira'

const fiiList = ["HGLG11","XPML11","KNRI11","VISC11","XPLG11","BTLG11"]

async function fetchPriceSafe(ticker) {
  try {
    const res = await fetch(`https://brapi.dev/api/quote/${ticker}`)
    const data = await res.json()
    return data?.results?.[0]?.regularMarketPrice ?? 100
  } catch {
    return 100
  }
}

function buildMatrix(portfolio, fundData) {
  return portfolio.map(f => {
    const d = fundData[f.ticker] || {}
    return {
      ticker: f.ticker,
      retorno: d.dy || 0.08,
      risco: d.vacancia || 0.1,
      valor: f.price * f.shares
    }
  })
}

function expectedReturn(matrix){
  if(!matrix.length) return 0
  return matrix.reduce((a,f)=>a+f.retorno,0)/matrix.length
}

function markowitz(portfolio,fundData){
  const matrix = buildMatrix(portfolio,fundData)
  const weights = matrix.map(f=>f.retorno/(f.risco+0.01))
  const sum = weights.reduce((a,b)=>a+b,0) || 1

  return matrix.map((f,i)=>({
    ticker:f.ticker,
    weight: Math.max(weights[i]/sum,0.05)
  }))
}

function monteCarlo(initial,monthly,rate,vol){
  let val=initial
  const monthlyRate = rate/12

  for(let i=0;i<120;i++){
    const shock=(Math.random()-0.5)*vol
    val=(val+monthly)*(1+monthlyRate+shock)
  }

  return val
}

function useStore(){
  const [data,setData]=useState({ portfolios:{[DEFAULT_PORTFOLIO]:[]}, selected:DEFAULT_PORTFOLIO })

  useEffect(()=>{
    const saved=localStorage.getItem(STORAGE)
    if(saved) setData(JSON.parse(saved))
  },[])

  useEffect(()=>{
    localStorage.setItem(STORAGE,JSON.stringify(data))
  },[data])

  return {data,setData}
}

export default function App(){
  const {data,setData}=useStore()
  const [fundData,setFundData]=useState({})
  const [ticker,setTicker]=useState('')

  useEffect(()=>{
    fetch('/data/fii.json').then(r=>r.json()).then(setFundData)
  },[])

  const portfolio = data.portfolios[data.selected]

  useEffect(()=>{
    async function update(){
      const updated = await Promise.all(portfolio.map(async f=>({...f,price:await fetchPriceSafe(f.ticker)})))
      setData(prev=>({...prev,portfolios:{...prev.portfolios,[prev.selected]:updated}}))
    }
    if(portfolio.length) update()
  },[data.selected])

  const matrix = buildMatrix(portfolio,fundData)
  const ret = expectedReturn(matrix)
  const total = portfolio.reduce((a,f)=>a+f.price*f.shares,0)

  const mc = monteCarlo(total,1000,ret,0.05)
  const opt = markowitz(portfolio,fundData)

  function addFII(){
    const t = ticker.trim().toUpperCase()
    if(!t) return

    setData(prev=>{
      const list=prev.portfolios[prev.selected]
      if(list.find(f=>f.ticker===t)) return prev

      return {
        ...prev,
        portfolios:{
          ...prev.portfolios,
          [prev.selected]:[...list,{ticker:t,shares:1,price:100}]
        }
      }
    })

    setTicker('')
  }

  return (
    <div className="flex min-h-screen bg-[#0b0f19] text-white">

      <div className="w-72 p-4 border-r border-gray-800">

        <input
          list="fiis"
          value={ticker}
          onChange={e=>setTicker(e.target.value.toUpperCase())}
          placeholder="Digite um FII"
          className="w-full bg-gray-800 p-2 mb-2"
        />

        <datalist id="fiis">
          {fiiList.map(f=><option key={f} value={f} />)}
        </datalist>

        <button onClick={addFII} className="w-full bg-green-600 p-2 rounded">
          Adicionar
        </button>

        <div className="mt-6">
          <h3 className="mb-2">Carteira</h3>
          {portfolio.map(f=>(
            <div key={f.ticker} className="flex justify-between text-sm mb-1">
              <span>{f.ticker}</span>
              <span>R$ {(f.price*f.shares).toFixed(0)}</span>
            </div>
          ))}
        </div>

      </div>

      <div className="flex-1 p-6">

        <div className="grid grid-cols-3 gap-4 mb-6">
          <Card title="Total" value={`R$ ${total.toFixed(0)}`} />
          <Card title="Retorno" value={`${(ret*100).toFixed(2)}%`} />
          <Card title="Monte Carlo" value={`R$ ${mc.toFixed(0)}`} />
        </div>

        <Panel title="Plano de Ação">
          {opt.map(o=> (
            <div key={o.ticker}>
              Ajustar {o.ticker} para {(o.weight*100).toFixed(1)}%
            </div>
          ))}
        </Panel>

        <Panel title="Alocação">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie data={portfolio.map(f=>({name:f.ticker,value:f.price*f.shares}))} dataKey="value" />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

      </div>

    </div>
  )
}

function Card({title,value}){
  return <div className="bg-[#111827] p-4 rounded-xl"><div>{title}</div><div className="text-xl">{value}</div></div>
}

function Panel({title,children}){
  return <div className="bg-[#111827] p-4 rounded-xl mb-4"><h2 className="mb-2">{title}</h2>{children}</div>
}
