'use client'
import React, { useState, useEffect, useRef } from "react";

const FII_LIST = [
  "HGLG11","XPLG11","BTLG11","XPML11","KNRI11",
  "VISC11","HSML11","MALL11","GGRC11","BRCO11",
  "HGBS11","HGRE11","PVBI11","VINO11","JSRE11",
  "RZAG11","VGIA11","RZTR11","SNAG11","FGAA11"
];

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
  const [ticker,setTicker]=useState("")
  const [aporte,setAporte]=useState(1500)
  const [loading,setLoading]=useState(false)
  const [showDropdown,setShowDropdown]=useState(false)

  const ref = useRef(null)

  // persistência
  useEffect(()=>{
    const saved = localStorage.getItem("fii_app")
    if(saved) setPortfolio(JSON.parse(saved))
  },[])

  useEffect(()=>{
    localStorage.setItem("fii_app", JSON.stringify(portfolio))
  },[portfolio])

  // fechar dropdown
  useEffect(()=>{
    const handler = e=>{
      if(ref.current && !ref.current.contains(e.target)){
        setShowDropdown(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return ()=>document.removeEventListener("mousedown", handler)
  },[])

  // FETCH PREÇO CORRETO
  const fetchPrices = async ()=>{
    if(portfolio.length === 0) return

    setLoading(true)

    try{
      const tickers = portfolio.map(p=>p.ticker.replace(".SA","")).join(",")

      const res = await fetch(`https://brapi.dev/api/quote/${tickers}`)
      const data = await res.json()

      const map = {}

      if(data.results){
        data.results.forEach(r=>{
          if(r.regularMarketPrice){
            map[r.symbol + ".SA"] = r.regularMarketPrice
          }
        })
      }

      setPrices(map)

    }catch(e){
      console.error(e)
    }

    setLoading(false)
  }

  useEffect(()=>{fetchPrices()},[portfolio])

  // carteira enriquecida
  const enriched = portfolio.map(p=>{
    const price = prices[p.ticker]

    return {
      ...p,
      price: price || null,
      value: price ? price * p.shares : 0
    }
  })

  // IA REAL (SEM BUG)
  const suggestion = Object.keys(FUNDAMENTALS)
    .map(ticker=>{
      const fund = FUNDAMENTALS[ticker]
      const price = prices[ticker]

      if(!price) return null

      const exists = portfolio.find(p=>p.ticker === ticker)

      let score = 0

      if(fund.pvp < 1) score += 4
      else if(fund.pvp < 1.05) score += 2
      else score -= 2

      if(fund.dy >= 0.08 && fund.dy <= 0.12) score += 3
      if(fund.dy > 0.12) score -= 1

      if(fund.sector === "Logística") score += 3
      if(fund.sector === "Shopping") score += 2

      if(exists) score -= 1

      return { ticker, price, score }
    })
    .filter(Boolean)
    .sort((a,b)=>b.score-a.score)
    .slice(0,3)
    .map(f=>({
      ticker:f.ticker,
      qty: Math.floor((aporte/3)/f.price)
    }))

  return(
    <div className="p-6 max-w-4xl mx-auto">

      <h1 className="text-xl font-bold mb-4">FII PRO (VERSÃO CORRETA)</h1>

      {/* INPUT */}
      <div ref={ref} className="relative">
        <input
          value={ticker}
          onFocus={()=>setShowDropdown(true)}
          onChange={e=>{
            setTicker(e.target.value.toUpperCase())
            setShowDropdown(true)
          }}
          className="border p-2 w-full"
        />

        {showDropdown && ticker && (
          <div className="absolute bg-white border w-full z-50">
            {FII_LIST.filter(f=>f.includes(ticker)).map((f,i)=>(
              <div key={i}
                onClick={()=>{setTicker(f);setShowDropdown(false)}}
                className="p-2 hover:bg-gray-100 cursor-pointer">
                {f}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ADD */}
      <button
        onClick={()=>{
          if(!ticker) return
          setPortfolio([...portfolio,{ticker:ticker+".SA",shares:1}])
          setTicker("")
        }}
        className="bg-indigo-600 text-white w-full mt-2 p-2"
      >
        Adicionar
      </button>

      {loading && <p className="mt-2">Carregando preços...</p>}

      {/* CARTEIRA */}
      <div className="mt-4">
        <h2 className="font-semibold">Carteira</h2>
        {enriched.map((f,i)=>(
          <div key={i}>
            {f.ticker} → {f.price ? `R$ ${f.value.toFixed(2)}` : "sem preço"}
          </div>
        ))}
      </div>

      {/* SUGESTÃO */}
      <div className="mt-4">
        <h2 className="font-semibold">Sugestões</h2>
        {suggestion.map((s,i)=>(
          <div key={i}>
            {s.ticker} → {s.qty} cotas
          </div>
        ))}
      </div>

    </div>
  )
}