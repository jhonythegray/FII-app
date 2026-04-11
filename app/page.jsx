'use client'
import React, { useState, useEffect } from "react";
import { PieChart, Pie, Cell, Tooltip } from "recharts";

const COLORS = ["#6366f1","#22c55e","#f59e0b","#ef4444"];

const FII_LIST = [
  "HGLG11","XPLG11","BTLG11","XPML11","KNRI11",
  "VISC11","HSML11","MALL11","GGRC11","BRCO11",
  "HGBS11","HGRE11","PVBI11","VINO11","JSRE11",
  "RZAG11","VGIA11","RZTR11","SNAG11","FGAA11"
];

// 📊 BASE PROFISSIONAL
const FUNDAMENTALS = {
  "HGLG11.SA": { pvp: 0.95, dy: 0.085, sector: "Logística" },
  "XPLG11.SA": { pvp: 0.98, dy: 0.082, sector: "Logística" },
  "BTLG11.SA": { pvp: 1.02, dy: 0.09, sector: "Logística" },
  "GGRC11.SA": { pvp: 0.97, dy: 0.088, sector: "Logística" },
  "BRCO11.SA": { pvp: 0.96, dy: 0.084, sector: "Logística" },

  "XPML11.SA": { pvp: 0.97, dy: 0.075, sector: "Shopping" },
  "VISC11.SA": { pvp: 0.92, dy: 0.08, sector: "Shopping" },
  "MALL11.SA": { pvp: 0.91, dy: 0.083, sector: "Shopping" },
  "HSML11.SA": { pvp: 0.94, dy: 0.082, sector: "Shopping" },
  "HGBS11.SA": { pvp: 0.99, dy: 0.078, sector: "Shopping" },

  "KNRI11.SA": { pvp: 1.05, dy: 0.07, sector: "Lajes" },
  "HGRE11.SA": { pvp: 0.93, dy: 0.085, sector: "Lajes" },
  "PVBI11.SA": { pvp: 0.9, dy: 0.082, sector: "Lajes" },
  "VINO11.SA": { pvp: 0.88, dy: 0.087, sector: "Lajes" },
  "JSRE11.SA": { pvp: 0.95, dy: 0.08, sector: "Lajes" },

  "RZAG11.SA": { pvp: 0.99, dy: 0.1, sector: "Agro" },
  "VGIA11.SA": { pvp: 0.97, dy: 0.11, sector: "Agro" },
  "RZTR11.SA": { pvp: 1.01, dy: 0.095, sector: "Agro" },
  "SNAG11.SA": { pvp: 0.98, dy: 0.105, sector: "Agro" },
  "FGAA11.SA": { pvp: 1.0, dy: 0.102, sector: "Agro" }
};

export default function Page(){

  const [portfolio,setPortfolio]=useState([])
  const [prices,setPrices]=useState({})
  const [aporte,setAporte]=useState(1500)
  const [ticker,setTicker]=useState("")
  const [loading,setLoading]=useState(false)
  const [error,setError]=useState(null)

  // 💾 persistência
  useEffect(()=>{
    const saved = localStorage.getItem("fii_app")
    if(saved){
      setPortfolio(JSON.parse(saved))
    }
  },[])

  useEffect(()=>{
    localStorage.setItem("fii_app", JSON.stringify(portfolio))
  },[portfolio])

  const addFII = ()=>{
    if(!ticker) return
    setPortfolio([...portfolio,{ticker:ticker.toUpperCase()+".SA",shares:1}])
    setTicker("")
  }

  const removeFII = (i)=>{
    const updated=[...portfolio]
    updated.splice(i,1)
    setPortfolio(updated)
  }

  const fetchPrices = async ()=>{
    setLoading(true)
    const map={}
    try{
      await Promise.all(portfolio.map(async p=>{
        try{
          const t=p.ticker.replace(".SA","")
          const res=await fetch(`https://brapi.dev/api/quote/${t}`)
          const data=await res.json()
          map[p.ticker]=data?.results?.[0]?.regularMarketPrice || 0
        }catch{
          map[p.ticker]=0
        }
      }))
      setError(null)
    }catch{
      setError("Erro ao buscar preços")
    }
    setPrices(map)
    setLoading(false)
  }

  useEffect(()=>{if(portfolio.length>0) fetchPrices()},[portfolio])

  const enriched = portfolio.map(p=>{
    const price=prices[p.ticker]||0
    const fund = FUNDAMENTALS[p.ticker] || {pvp:1,dy:0.08,sector:"Outro"}

    return {...p,...fund,value:price*p.shares,price}
  })

  const total = enriched.reduce((a,b)=>a+b.value,0)

  // 🧠 IA PROFISSIONAL
  const scored = enriched.map(f=>{
    let score = 0

    if(f.pvp < 1) score += 4
    else if(f.pvp < 1.05) score += 2
    else score -= 2

    if(f.dy >= 0.08 && f.dy <= 0.12) score += 3
    if(f.dy > 0.12) score -= 1

    if(f.sector === "Logística") score += 3
    if(f.sector === "Shopping") score += 2
    if(f.sector === "Lajes") score += 1

    const weight = total>0 ? f.value/total : 0
    if(weight > 0.25) score -= 3

    return {...f,score}
  })

  const suggestion = scored
    .sort((a,b)=>b.score-a.score)
    .slice(0,3)
    .map(f=>({
      ticker:f.ticker,
      qty: Math.floor((aporte/3)/(f.price||1)),
      reason:[
        f.pvp<1 ? "Desconto (P/VP)" : "Preço justo",
        f.dy>0.08 ? "Boa renda" : "DY baixo",
        "Rebalanceamento"
      ]
    }))

  const chartData = enriched.map(f=>({name:f.ticker,value:f.value}))

  return(
    <div className="p-6 max-w-5xl mx-auto">

      <h1 className="text-2xl font-bold mb-6">FII App PRO</h1>

      {/* 🔎 AUTOCOMPLETE + BOTÃO CORRIGIDO */}
      <div className="mb-4">

        <div className="relative w-full">
          <input 
            value={ticker}
            onChange={e=>setTicker(e.target.value.toUpperCase())}
            placeholder="Digite o ticker"
            className="border p-2 rounded w-full"
          />

          {ticker && (
            <div className="absolute bg-white border w-full z-50 max-h-40 overflow-y-auto">
              {FII_LIST
                .filter(f=>f.includes(ticker))
                .map((f,i)=>(
                  <div 
                    key={i}
                    onClick={()=>setTicker(f)}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                  >
                    {f}
                  </div>
                ))
              }
            </div>
          )}
        </div>

        <button 
          onClick={addFII} 
          className="bg-indigo-600 text-white px-4 py-2 rounded mt-2 w-full"
        >
          Adicionar FII
        </button>

      </div>

      {loading && <p className="text-sm text-gray-500">Carregando preços...</p>}
      {error && <p className="text-red-500">{error}</p>}

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white p-4 rounded shadow">
          Patrimônio: R$ {total.toFixed(2)}
        </div>
        <div className="bg-white p-4 rounded shadow">
          FIIs: {portfolio.length}
        </div>
        <div className="bg-white p-4 rounded shadow">
          <input type="number" value={aporte} onChange={e=>setAporte(Number(e.target.value))}/>
        </div>
      </div>

      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="font-semibold mb-3">Carteira</h2>

        {scored.map((f,i)=>(
          <div key={i} className="flex justify-between items-center py-2 border-b">

            <span>{f.ticker}</span>

            <input 
              type="number" 
              value={f.shares}
              onChange={e=>{
                const updated=[...portfolio]
                updated[i].shares=Number(e.target.value)
                setPortfolio(updated)
              }}
              className="w-16 border rounded"
            />

            <span>R$ {f.value.toFixed(2)}</span>

            <div className={`text-sm ${
              f.score>=6 ? "text-green-600" :
              f.score>=3 ? "text-yellow-500" :
              "text-red-500"
            }`}>
              Score {f.score}
            </div>

            <button onClick={()=>removeFII(i)} className="text-red-500">X</button>
          </div>
        ))}
      </div>

      <div className="bg-white p-4 rounded shadow mb-6">
        <h2 className="font-semibold mb-3">Sugestões</h2>

        {suggestion.map((s,i)=>(
          <div key={i} className="mb-2">
            <b>{s.ticker}</b> → {s.qty} cotas
            <div className="text-sm text-gray-500">
              {s.reason.join(" | ")}
            </div>
          </div>
        ))}
      </div>

      <PieChart width={300} height={250}>
        <Pie data={chartData} dataKey="value">
          {chartData.map((_,i)=>(<Cell key={i} fill={COLORS[i%COLORS.length]} />))}
        </Pie>
        <Tooltip/>
      </PieChart>

    </div>
  )
}