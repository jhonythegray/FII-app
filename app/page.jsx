'use client'

import { useEffect, useState } from 'react'
import { PieChart, Pie, Tooltip, ResponsiveContainer } from 'recharts'

const STORAGE = 'fii_stable'

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
// 📊 CORE LÓGICO (SEM ALEATORIEDADE)
// ===============================

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

// alocação baseada em valor + qualidade
function allocationModel(portfolio, fundData){
  const matrix = buildMatrix(portfolio,fundData)

  const total = matrix.reduce((a,f)=>a+f.valor,0)

  return matrix.map(f=>{
    const weightAtual = f.valor / total
    const score = f.retorno / (f.risco + 0.01)

    return {
      ticker: f.ticker,
      atual: weightAtual,
      ideal: score
    }
  })
}

// plano coerente
function actionPlan(portfolio, fundData){
  const data = allocationModel(portfolio,fundData)

  return data.map(f=>{
    if(f.atual > f.ideal + 0.05)
      return `Reduzir ${f.ticker}`

    if(f.atual < f.ideal - 0.05)
      return `Aumentar ${f.ticker}`

    return `${f.ticker} equilibrado`
  })
}

// projeção determinística
function projection(total, monthly, rate, months=120){
  let val = total
  const monthlyRate = rate / 12

  for(let i=0;i<months;i++){
    val = (val + monthly) * (1 + monthlyRate)
  }

  return val
}

// ===============================
// STORE
// ===============================

function useStore(){
  const [data,setData]=useState({ portfolio:[] })

  useEffect(()=>{
    const saved=localStorage.getItem(STORAGE)
    if(saved) setData(JSON.parse(saved))
  },[])

  useEffect(()=>{
    localStorage.setItem(STORAGE,JSON.stringify(data))
  },[data])

  return {data,setData}
}

// ===============================
// APP
// ===============================

export default function App(){

  const {data,setData}=useStore()

  const [fundData,setFundData]=useState({})
  const [ticker,setTicker]=useState('')
  const [aporte,setAporte]=useState(1000)

  const portfolio = data.portfolio

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
      setData({ portfolio: updated })
    }

    if(portfolio.length) update()
  },[])

  const matrix = buildMatrix(portfolio,fundData)
  const ret = expectedReturn(matrix)

  const total = portfolio.reduce((a,f)=>a+f.price*f.shares,0)

  const proj = projection(total, aporte, ret)

  const plan = actionPlan(portfolio,fundData)

  function addFII(){
    const t = ticker.trim().toUpperCase()
    if(!t) return

    if(portfolio.find(f=>f.ticker===t)) return

    setData({
      portfolio:[
        ...portfolio,
        { ticker:t, shares:1, price:100 }
      ]
    })

    setTicker('')
  }

  function updateShares(i,val){
    const v = Number(val)

    const list=[...portfolio]
    list[i].shares=v

    setData({ portfolio:list })
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

            </div>
          ))}
        </div>

      </div>

      {/* MAIN */}
      <div className="flex-1 p-6">

        <div className="grid grid-cols-3 gap-4 mb-6">

          <Card title="Total" value={`R$ ${total.toFixed(0)}`} />
          <Card title="Retorno esperado" value={`${(ret*100).toFixed(2)}%`} />
          <Card title="Projeção 10 anos" value={`R$ ${proj.toFixed(0)}`} />

        </div>

        <Panel title="Plano do gestor">
          {plan.map((p,i)=> <div key={i}>{p}</div>)}
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