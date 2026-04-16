'use client'

import { useEffect, useState } from 'react'
import { PieChart, Pie, Tooltip, ResponsiveContainer } from 'recharts'

const STORAGE = 'fii_real'

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

// ===============================
// 📊 MODELO SIMPLES E CONFIÁVEL
// ===============================

function analyze(portfolio, fundData){
  return portfolio.map(f=>{
    const d = fundData[f.ticker] || {}

    const dy = d.dy || 0.08
    const vac = d.vacancia || 0.1

    return {
      ticker: f.ticker,
      dy,
      vac,
      score: dy - vac,
      valor: f.price * f.shares
    }
  })
}

function portfolioReturn(data){
  if(!data.length) return 0

  const total = data.reduce((a,f)=>a+f.valor,0)

  return data.reduce((acc,f)=>{
    const w = f.valor / total
    return acc + (f.dy * w)
  },0)
}

function actionPlan(data){
  if(!data.length) return []

  const avg = data.reduce((a,f)=>a+f.score,0)/data.length

  return data.map(f=>{
    if(f.score > avg + 0.01)
      return `Aumentar ${f.ticker}`

    if(f.score < avg - 0.01)
      return `Reduzir ${f.ticker}`

    return `${f.ticker} equilibrado`
  })
}

// ===============================
// STORE
// ===============================

function useStore(){
  const [portfolio,setPortfolio]=useState([])

  useEffect(()=>{
    const saved=localStorage.getItem(STORAGE)
    if(saved) setPortfolio(JSON.parse(saved))
  },[])

  useEffect(()=>{
    localStorage.setItem(STORAGE,JSON.stringify(portfolio))
  },[portfolio])

  return {portfolio,setPortfolio}
}

// ===============================
// APP
// ===============================

export default function App(){

  const {portfolio,setPortfolio}=useStore()

  const [fundData,setFundData]=useState({})
  const [ticker,setTicker]=useState('')

  useEffect(()=>{
    fetch('/data/fii.json')
      .then(r=>r.json())
      .then(setFundData)
  },[])

  useEffect(()=>{
    async function update(){
      const updated = await Promise.all(
        portfolio.map(async f=>({...f,price:await fetchPriceSafe(f.ticker)}))
      )
      setPortfolio(updated)
    }

    if(portfolio.length) update()
  },[])

  const data = analyze(portfolio,fundData)

  const total = data.reduce((a,f)=>a+f.valor,0)
  const ret = portfolioReturn(data)

  const plan = actionPlan(data)

  function addFII(){
    const t = ticker.trim().toUpperCase()
    if(!t) return

    if(portfolio.find(f=>f.ticker===t)) return

    setPortfolio([
      ...portfolio,
      { ticker:t, shares:1, price:100 }
    ])

    setTicker('')
  }

  function updateShares(i,val){
    const list=[...portfolio]
    list[i].shares = Number(val)
    setPortfolio(list)
  }

  function removeFII(i){
    const list=[...portfolio]
    list.splice(i,1)
    setPortfolio(list)
  }

  return (
    <div className="flex min-h-screen bg-[#0b0f19] text-white">

      {/* SIDEBAR */}
      <div className="w-72 p-4 border-r border-gray-800">

        <input
          list="fiis"
          value={ticker}
          onChange={e=>setTicker(e.target.value.toUpperCase())}
          placeholder="Digite um FII"
          className="w-full bg-gray-800 p-2 mb-2 rounded"
        />

        <datalist id="fiis">
          {fiiList.map(f=><option key={f} value={f} />)}
        </datalist>

        <button onClick={addFII} className="w-full bg-green-600 p-2 rounded">
          Adicionar
        </button>

        <div className="mt-6">
          <h3 className="mb-2 text-gray-400">Carteira</h3>

          {portfolio.map((f,i)=>(
            <div key={f.ticker} className="flex justify-between items-center mb-2">

              <span>{f.ticker}</span>

              <input
                type="number"
                value={f.shares}
                onChange={e=>updateShares(i,e.target.value)}
                className="w-16 bg-gray-800 text-center rounded"
              />

              <span>R$ {(f.price*f.shares).toFixed(0)}</span>

              <button onClick={()=>removeFII(i)} className="text-red-400">
                x
              </button>

            </div>
          ))}
        </div>

      </div>

      {/* MAIN */}
      <div className="flex-1 p-6">

        <div className="grid grid-cols-2 gap-4 mb-6">

          <Card title="Total investido" value={`R$ ${total.toFixed(0)}`} />
          <Card title="Retorno estimado" value={`${(ret*100).toFixed(2)}% ao ano`} />

        </div>

        <Panel title="Análise do gestor">
          {plan.map((p,i)=> <div key={i}>{p}</div>)}
        </Panel>

        <Panel title="Alocação">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={data.map(f=>({name:f.ticker,value:f.valor}))} dataKey="value" />
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </Panel>

      </div>

    </div>
  )
}

function Card({title,value}){
  return (
    <div className="bg-[#111827] p-6 rounded-2xl border border-gray-800">
      <div className="text-gray-400">{title}</div>
      <div className="text-xl font-semibold">{value}</div>
    </div>
  )
}

function Panel({title,children}){
  return (
    <div className="bg-[#111827] p-6 rounded-2xl border border-gray-800 mb-4">
      <h2 className="mb-3 font-semibold">{title}</h2>
      {children}
    </div>
  )
}