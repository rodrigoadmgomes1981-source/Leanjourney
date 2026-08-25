import React, { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const WASTES = ['Superprodução','Espera','Transporte','Processamento excessivo','Estoque','Movimentação','Defeitos / Retrabalho','Talento não utilizado']
const makeId = () => `id-${Date.now()}-${Math.random().toString(36).slice(2,10)}`
const blankStage = (n=1) => ({
  id: makeId(), atendimento:`Etapa ${n}`, sistema:'', responsavel:'', processamento:'', espera:'',
  valorTipo:'VA', gargalos:'', desperdicios:[], oportunidades:''
})
const defaultMeta = () => ({instituicao:'Unimed Araçatuba', unidade:'Pronto Atendimento', avaliador:'', jornada:'Adulto', turno:'Manhã'})

function safeLoad(){
  try {
    const raw = window.localStorage.getItem('leanJourneyEvaluationsV4')
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}
function safeSave(items){
  try { window.localStorage.setItem('leanJourneyEvaluationsV4', JSON.stringify(items)); return true }
  catch { return false }
}
function Logo({small=false}){ return <img src="/logo-arpen.png" alt="ARPEN Saúde" className={small?'logo small':'logo'} /> }

function summarize(stages){
  const proc = stages.reduce((a,s)=>a+(Number(s.processamento)||0),0)
  const wait = stages.reduce((a,s)=>a+(Number(s.espera)||0),0)
  const lead = proc+wait
  const va = stages.reduce((a,s)=>a+(s.valorTipo==='VA'?(Number(s.processamento)||0):0),0)
  const value = lead ? Math.round((va/lead)*100) : 0
  const wasteMap = {}
  stages.forEach(s=>(s.desperdicios||[]).forEach(w=>wasteMap[w]=(wasteMap[w]||0)+1))
  const dominant = Object.entries(wasteMap).sort((a,b)=>b[1]-a[1])
  const bottleneck = stages.map((s,i)=>({i,name:s.atendimento||`Etapa ${i+1}`,wait:Number(s.espera)||0})).sort((a,b)=>b.wait-a.wait)[0] || {i:0,name:'—',wait:0}
  const toBeStages = stages.map((s,i)=>{
    const p=Number(s.processamento)||0, w=Number(s.espera)||0
    const tw=Math.max(0,Math.round(w*((s.desperdicios||[]).includes('Espera')?0.5:0.7)))
    const tp=Math.max(0,Math.round(p*((s.desperdicios||[]).some(x=>['Defeitos / Retrabalho','Processamento excessivo'].includes(x))?0.85:0.95)))
    return {...s,index:i,targetProc:tp,targetWait:tw,targetTotal:tp+tw}
  })
  const toBeLead=toBeStages.reduce((a,s)=>a+s.targetTotal,0)
  const reduction=lead?Math.max(0,Math.round((1-toBeLead/lead)*100)):0
  const hotspots=stages.map((s,i)=>({
    i,name:s.atendimento||`Etapa ${i+1}`,
    score:(Number(s.espera)||0)+((s.desperdicios||[]).length*10)+(s.gargalos?.trim()?15:0)
  })).sort((a,b)=>b.score-a.score).slice(0,3)
  const actions=toBeStages.map((s,i)=>{
    const current=(Number(stages[i].processamento)||0)+(Number(stages[i].espera)||0)
    const gain=Math.max(0,current-s.targetTotal)
    const impact=gain>=20||(stages[i].desperdicios||[]).length>=3?'Alto':gain>=8?'Médio':'Baixo'
    const effort=(stages[i].desperdicios||[]).some(x=>['Transporte','Estoque'].includes(x))?'Alto':stages[i].oportunidades?.trim()?'Médio':'Baixo'
    const priority=impact==='Alto'&&effort!=='Alto'?'Quick Win':impact==='Alto'?'Estratégica':impact==='Médio'&&effort==='Baixo'?'Quick Win':'Planejada'
    return {id:s.id,etapa:s.atendimento||`Etapa ${i+1}`,what:s.oportunidades||'Padronizar fluxo, reduzir espera e eliminar desperdícios.',why:s.gargalos||'Melhorar fluidez da jornada e reduzir tempo sem valor agregado.',who:s.responsavel||'Definir responsável',when:'Definir prazo',how:`Revisar processo e atacar ${(s.desperdicios||[]).join(', ')||'variações do fluxo'}.`,cost:'A estimar',status:'Não iniciado',impact,effort,priority,gain}
  })
  return {proc,wait,lead,va,value,dominant,bottleneck,toBeStages,toBeLead,reduction,hotspots,actions}
}

function App(){
  const [screen,setScreen]=useState('start')
  const [meta,setMeta]=useState(defaultMeta())
  const [stages,setStages]=useState([blankStage(1)])
  const [current,setCurrent]=useState(0)
  const [evaluations,setEvaluations]=useState(()=>safeLoad())
  const [editingId,setEditingId]=useState(null)
  const [notice,setNotice]=useState('')
  const summary=useMemo(()=>summarize(stages),[stages])

  const persist=(items)=>{ setEvaluations(items); const ok=safeSave(items); if(!ok)setNotice('A avaliação foi mantida nesta sessão, mas o navegador bloqueou o armazenamento local.') }
  const updateStage=(field,value)=>setStages(prev=>prev.map((s,i)=>i===current?{...s,[field]:value}:s))
  const toggleWaste=(w)=>{ const list=stages[current].desperdicios||[]; updateStage('desperdicios',list.includes(w)?list.filter(x=>x!==w):[...list,w]) }
  const addStage=()=>{ const n=stages.length+1; setStages(prev=>[...prev,blankStage(n)]); setCurrent(stages.length) }
  const removeStage=()=>{ if(stages.length<=1)return; const next=stages.filter((_,i)=>i!==current); setStages(next); setCurrent(Math.max(0,current-1)) }
  const newAssessment=()=>{ setMeta(defaultMeta()); setStages([blankStage(1)]); setCurrent(0); setEditingId(null); setNotice(''); setScreen('start') }
  const finish=()=>{
    const now=new Date().toISOString()
    const rec={
      id:editingId||makeId(), createdAt:editingId?(evaluations.find(x=>x.id===editingId)?.createdAt||now):now, updatedAt:now,
      meta:{...meta}, stages:stages.map(s=>({...s,desperdicios:[...(s.desperdicios||[])]})),
      metrics:{lead:summary.lead,proc:summary.proc,wait:summary.wait,value:summary.value,toBeLead:summary.toBeLead,reduction:summary.reduction,gargalos:stages.filter(s=>s.gargalos?.trim()).length,desperdicios:stages.reduce((a,s)=>a+(s.desperdicios||[]).length,0)}
    }
    const next=editingId?evaluations.map(x=>x.id===editingId?rec:x):[rec,...evaluations]
    persist(next); setEditingId(null); setScreen('dashboard')
  }
  const openEvaluation=(item,mode)=>{ setMeta({...item.meta}); setStages(item.stages.map(s=>({...s,desperdicios:[...(s.desperdicios||[])]}))); setCurrent(0); setEditingId(mode==='edit'?item.id:null); setScreen(mode==='edit'?'mapping':'summary') }
  const deleteEvaluation=(id)=>{ if(window.confirm('Deseja apagar esta avaliação? Esta ação não poderá ser desfeita.'))persist(evaluations.filter(x=>x.id!==id)) }
  const exportPDF=()=>window.print()

  if(screen==='start') return <div className="app">
    <header className="hero"><Logo/><div><span>LEAN HEALTHCARE</span><h1>Lean Journey</h1><p>Mapeamento da jornada do paciente no Pronto Atendimento</p></div></header>
    <main className="container narrow">
      <section className="card"><h2>Identificação da avaliação</h2>
        <div className="grid2"><Field label="Instituição" value={meta.instituicao} onChange={v=>setMeta({...meta,instituicao:v})}/><Field label="Unidade" value={meta.unidade} onChange={v=>setMeta({...meta,unidade:v})}/><Field label="Avaliador" value={meta.avaliador} onChange={v=>setMeta({...meta,avaliador:v})}/><Select label="Tipo de jornada" value={meta.jornada} onChange={v=>setMeta({...meta,jornada:v})} options={['Adulto','Pediátrico','Outro']}/><Select label="Turno" value={meta.turno} onChange={v=>setMeta({...meta,turno:v})} options={['Manhã','Tarde','Noite','Madrugada']}/></div>
        <button className="btn primary full" onClick={()=>setScreen('mapping')}>Iniciar mapeamento →</button>
        {evaluations.length>0&&<button className="btn secondary full" onClick={()=>setScreen('dashboard')}>▦ Ver avaliações realizadas ({evaluations.length})</button>}
      </section>
    </main>
  </div>

  if(screen==='dashboard'){
    const total=evaluations.length
    const avgLead=total?Math.round(evaluations.reduce((a,x)=>a+(x.metrics?.lead||0),0)/total):0
    const avgReduction=total?Math.round(evaluations.reduce((a,x)=>a+(x.metrics?.reduction||0),0)/total):0
    const critical=evaluations.filter(x=>(x.metrics?.wait||0)>(x.metrics?.proc||0)||(x.metrics?.gargalos||0)>=3).length
    return <div className="app dashboard"><header className="dashHead"><Logo/><div><span>LEAN HEALTHCARE</span><h1>Dashboard de Avaliações</h1><p>Histórico dos mapeamentos realizados</p></div><button className="btn primary" onClick={newAssessment}>＋ Nova avaliação</button></header>
      <main className="container">{notice&&<div className="notice">{notice}</div>}
        <div className="kpis"><Kpi label="Avaliações realizadas" value={total}/><Kpi label="Lead Time médio" value={`${avgLead} min`}/><Kpi label="Redução potencial média" value={`${avgReduction}%`}/><Kpi label="Avaliações críticas" value={critical}/></div>
        <section className="card"><div className="sectionTitle"><div><small>HISTÓRICO</small><h2>Relação de avaliações realizadas</h2></div><b>{total} registro{total===1?'':'s'}</b></div>
          {total===0?<div className="empty"><h3>Nenhuma avaliação concluída</h3><p>Finalize um mapeamento para ele aparecer aqui.</p><button className="btn primary" onClick={newAssessment}>Criar avaliação</button></div>:
          <div className="tableWrap"><table><thead><tr><th>Data</th><th>Instituição / Unidade</th><th>Avaliador</th><th>Jornada</th><th>Etapas</th><th>Lead Time</th><th>Espera</th><th>VA</th><th>Redução</th><th>Ações</th></tr></thead><tbody>{evaluations.map(item=>{const d=new Date(item.updatedAt||item.createdAt);return <tr key={item.id}><td><strong>{d.toLocaleDateString('pt-BR')}</strong><small>{d.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</small></td><td><strong>{item.meta?.instituicao||'—'}</strong><small>{item.meta?.unidade||'—'}</small></td><td>{item.meta?.avaliador||'—'}</td><td>{item.meta?.jornada||'—'}<small>{item.meta?.turno||'—'}</small></td><td>{item.stages?.length||0}</td><td><strong>{item.metrics?.lead||0} min</strong></td><td>{item.metrics?.wait||0} min</td><td>{item.metrics?.value||0}%</td><td><span className="pill green">{item.metrics?.reduction||0}%</span></td><td><div className="rowActions"><button title="Visualizar" onClick={()=>openEvaluation(item,'view')}>👁</button><button title="Editar" onClick={()=>openEvaluation(item,'edit')}>✏️</button><button title="Apagar" className="danger" onClick={()=>deleteEvaluation(item.id)}>🗑️</button></div></td></tr>})}</tbody></table></div>}
        </section>
      </main>
    </div>
  }

  if(screen==='summary') return <div className="app report"><header className="reportHead"><Logo/><div><span>ANÁLISE LEAN / BLACK BELT</span><h1>Resumo da Jornada</h1><p>{meta.instituicao} • {meta.unidade} • {meta.jornada} • {meta.turno}</p>{meta.avaliador&&<small>Avaliador: {meta.avaliador}</small>}</div></header>
    <main className="container"><div className="kpis six"><Kpi label="Lead Time" value={`${summary.lead} min`}/><Kpi label="Processamento" value={`${summary.proc} min`}/><Kpi label="Espera" value={`${summary.wait} min`}/><Kpi label="Valor agregado" value={`${summary.value}%`}/><Kpi label="Lead Time TO-BE" value={`${summary.toBeLead} min`}/><Kpi label="Redução potencial" value={`${summary.reduction}%`}/></div>
      <section className="card"><div className="sectionTitle"><div><small>VALUE STREAM MAP</small><h2>VSM Executivo • AS-IS</h2></div><b>CRITICIDADE AUTOMÁTICA</b></div><div className="flow">{stages.map((s,i)=><React.Fragment key={s.id}><div className={`node ${summary.bottleneck.i===i&&summary.bottleneck.wait>0?'critical':''}`}><span>{s.valorTipo}</span><strong>{s.atendimento||`Etapa ${i+1}`}</strong><small>{s.responsavel||'Responsável não informado'}</small><div><b>{Number(s.processamento)||0}m proc.</b><b>{Number(s.espera)||0}m espera</b></div></div>{i<stages.length-1&&<i>→</i>}</React.Fragment>)}</div></section>
      <section className="card"><div className="sectionTitle"><div><small>ESTADO FUTURO</small><h2>TO-BE sugerido</h2></div><b>META: {summary.toBeLead} MIN</b></div><div className="flow">{summary.toBeStages.map((s,i)=><React.Fragment key={s.id}><div className="node tobe"><span>0{i+1}</span><strong>{s.atendimento}</strong><em>{s.targetTotal} min</em><small>{s.oportunidades||'Reduzir espera, padronizar e balancear capacidade.'}</small></div>{i<summary.toBeStages.length-1&&<i>→</i>}</React.Fragment>)}</div></section>
      <section className="card"><div className="sectionTitle"><div><small>HOTSPOTS</small><h2>Pontos prioritários</h2></div></div><div className="cards3">{summary.hotspots.map((h,i)=><div className="mini" key={h.i}><span>#{i+1}</span><strong>{h.name}</strong><small>Score de criticidade: {h.score}</small></div>)}</div></section>
      <section className="card"><div className="sectionTitle"><div><small>5W2H</small><h2>Plano de Ação</h2></div></div><div className="tableWrap"><table><thead><tr><th>Prioridade</th><th>Etapa</th><th>O quê</th><th>Por quê</th><th>Quem</th><th>Quando</th><th>Como</th><th>Status</th></tr></thead><tbody>{summary.actions.map(a=><tr key={a.id}><td><span className="pill">{a.priority}</span></td><td><strong>{a.etapa}</strong><small>Ganho: {a.gain} min</small></td><td>{a.what}</td><td>{a.why}</td><td>{a.who}</td><td>{a.when}</td><td>{a.how}</td><td>{a.status}</td></tr>)}</tbody></table></div></section>
      <div className="bottomActions noPrint"><button className="btn secondary" onClick={()=>setScreen('dashboard')}>▦ Dashboard</button><button className="btn secondary" onClick={()=>setScreen('mapping')}>✏️ Editar</button><button className="btn primary" onClick={exportPDF}>⇩ Exportar PDF</button></div>
    </main>
  </div>

  const s=stages[current]
  return <div className="app"><header className="mapHead"><Logo small/><div><span>MAPEAMENTO EM CAMPO</span><h1>{meta.instituicao}</h1><p>{meta.unidade} • {meta.jornada} • {meta.turno}</p></div><button className="btn secondary" onClick={()=>setScreen('dashboard')}>▦ Dashboard</button></header>
    <main className="container"><div className="progress"><div><strong>Etapa {current+1} de {stages.length}</strong><small>{s.atendimento||'Nova etapa'}</small></div><div className="dots">{stages.map((_,i)=><button key={i} className={i===current?'active':''} onClick={()=>setCurrent(i)}>{i+1}</button>)}</div></div>
      <section className="card mappingCard"><div className="sectionTitle"><div><small>ETAPA {String(current+1).padStart(2,'0')}</small><h2>Jornada do Paciente</h2></div>{stages.length>1&&<button className="linkDanger" onClick={removeStage}>🗑 Remover etapa</button>}</div>
        <div className="grid2"><Field label="Etapa de atendimento" value={s.atendimento} onChange={v=>updateStage('atendimento',v)}/><Field label="Sistema utilizado" value={s.sistema} onChange={v=>updateStage('sistema',v)}/><Field label="Responsável pela etapa" value={s.responsavel} onChange={v=>updateStage('responsavel',v)}/><Field type="number" label="Tempo de processamento (min)" value={s.processamento} onChange={v=>updateStage('processamento',v)}/><Field type="number" label="Tempo de espera (min)" value={s.espera} onChange={v=>updateStage('espera',v)}/><Select label="Classificação de valor" value={s.valorTipo} onChange={v=>updateStage('valorTipo',v)} options={['VA','NVA Necessária','NVA Desperdício']}/></div>
        <TextArea label="Gargalos operacionais" value={s.gargalos} onChange={v=>updateStage('gargalos',v)} placeholder="Filas, esperas, retrabalho, falhas de comunicação..."/>
        <div className="field"><label>7 desperdícios Lean + talento não utilizado</label><div className="chips">{WASTES.map(w=><button key={w} type="button" className={(s.desperdicios||[]).includes(w)?'active':''} onClick={()=>toggleWaste(w)}>{w}</button>)}</div></div>
        <TextArea label="Oportunidades de melhoria" value={s.oportunidades} onChange={v=>updateStage('oportunidades',v)} placeholder="Registre ideias, hipóteses e ações potenciais..."/>
      </section>
      <div className="bottomActions"><button className="btn secondary" disabled={current===0} onClick={()=>setCurrent(current-1)}>← Anterior</button>{current<stages.length-1?<button className="btn secondary" onClick={()=>setCurrent(current+1)}>Próxima →</button>:<button className="btn secondary" onClick={addStage}>＋ Próxima etapa</button>}<button className="btn primary" onClick={finish}>✓ Finalizar avaliação</button></div>
    </main>
  </div>
}

function Field({label,value,onChange,type='text'}){return <div className="field"><label>{label}</label><input type={type} value={value} onChange={e=>onChange(e.target.value)} min={type==='number'?'0':undefined}/></div>}
function TextArea({label,value,onChange,placeholder=''}){return <div className="field"><label>{label}</label><textarea value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/></div>}
function Select({label,value,onChange,options}){return <div className="field"><label>{label}</label><select value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o}>{o}</option>)}</select></div>}
function Kpi({label,value}){return <div className="kpi"><small>{label}</small><strong>{value}</strong></div>}

createRoot(document.getElementById('root')).render(<App/>)
