import React, { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowLeft, ArrowRight, CheckCircle2, Plus, Trash2, Activity, Clock3, Gauge, AlertTriangle, FileDown, GitBranch, Sparkles, TrendingDown } from 'lucide-react'
import './styles.css'

const wastes = [
  'Superprodução', 'Espera', 'Transporte', 'Processamento excessivo',
  'Estoque', 'Movimentação', 'Defeitos / Retrabalho', 'Talento não utilizado'
]

const blankStage = (n) => ({
  id: crypto.randomUUID(),
  title: `Etapa ${n}`,
  atendimento: '', sistema: '', responsavel: '', gargalos: '', oportunidades: '',
  processamento: '', espera: '', desperdicios: [], valorTipo: 'VA'
})

function ArpenLogo({inverse=false}){
  return <div className={`arpen-logo ${inverse?'inverse':''}`} aria-label="Arpen Saúde">
    <div className="arpen-symbol"><span/><span/><span/></div>
    <div className="arpen-word"><strong>ARPEN</strong><small>SAÚDE</small></div>
  </div>
}

function App(){
  const [screen, setScreen] = useState('start')
  const [meta, setMeta] = useState({ instituicao:'Unimed Araçatuba', unidade:'Pronto Atendimento', avaliador:'', jornada:'Adulto', turno:'Manhã' })
  const [stages, setStages] = useState([blankStage(1)])
  const [current, setCurrent] = useState(0)

  const updateStage = (field, value) => setStages(prev => prev.map((s,i)=> i===current ? {...s,[field]:value} : s))

  const toggleWaste = (w) => {
    const selected = stages[current].desperdicios
    updateStage('desperdicios', selected.includes(w) ? selected.filter(x=>x!==w) : [...selected,w])
  }

  const addStage = () => {
    setStages(prev => [...prev, blankStage(prev.length+1)])
    setCurrent(stages.length)
  }

  const removeStage = () => {
    if(stages.length===1) return
    setStages(stages.filter((_,i)=>i!==current))
    setCurrent(Math.max(0,current-1))
  }

  const summary = useMemo(()=>{
    const proc = stages.reduce((a,s)=>a+(Number(s.processamento)||0),0)
    const wait = stages.reduce((a,s)=>a+(Number(s.espera)||0),0)
    const lead = proc+wait
    const va = stages.reduce((a,s)=>a+(s.valorTipo==='VA'?(Number(s.processamento)||0):0),0)
    const nvaNec = stages.reduce((a,s)=>a+(s.valorTipo==='NVA Necessária'?(Number(s.processamento)||0):0),0)
    const nvaWaste = Math.max(0, lead-va-nvaNec)
    const value = lead ? Math.round((va/lead)*100) : 0
    const wasteCount = stages.reduce((acc,s)=>{ s.desperdicios.forEach(w=>acc[w]=(acc[w]||0)+1); return acc },{})
    const dominant = Object.entries(wasteCount).sort((a,b)=>b[1]-a[1])
    const hotspots = stages.map((s,i)=>({
      etapa:s.atendimento || `Etapa ${i+1}`,
      index:i,
      score:(Number(s.espera)||0) + s.desperdicios.length*10 + (s.gargalos.trim()?15:0)
    })).sort((a,b)=>b.score-a.score).slice(0,3)
    const bottleneck = [...stages].map((s,i)=>({i,wait:Number(s.espera)||0,name:s.atendimento||`Etapa ${i+1}`})).sort((a,b)=>b.wait-a.wait)[0]
    const toBe = stages.map((s,i)=>{
      const wait=Number(s.espera)||0
      const proc=Number(s.processamento)||0
      let targetWait=Math.max(0,Math.round(wait*(s.desperdicios.includes('Espera')?.5:.7)))
      let targetProc=Math.max(1,Math.round(proc*(s.desperdicios.includes('Defeitos / Retrabalho')||s.desperdicios.includes('Processamento excessivo')?.85:.95)))
      const action = s.oportunidades || (wait>proc ? 'Reduzir fila, balancear capacidade e criar gatilho de fluxo.' : s.desperdicios.length ? 'Padronizar trabalho e eliminar o desperdício predominante.' : 'Manter padrão, medir estabilidade e revisar capacidade.')
      return {...s,index:i,targetWait,targetProc,targetTotal:targetWait+targetProc,action}
    })
    const toBeLead=toBe.reduce((a,s)=>a+s.targetTotal,0)
    const reduction=lead?Math.round((1-toBeLead/lead)*100):0
    const actions = toBe.map((s,i)=>{
      const current=(Number(stages[i]?.processamento)||0)+(Number(stages[i]?.espera)||0)
      const gain=Math.max(0,current-s.targetTotal)
      const impact = gain>=20 || stages[i]?.desperdicios?.length>=3 ? 'Alto' : gain>=8 || stages[i]?.desperdicios?.length>=2 ? 'Médio' : 'Baixo'
      const effort = stages[i]?.oportunidades ? 'Médio' : (stages[i]?.desperdicios?.includes('Transporte') || stages[i]?.desperdicios?.includes('Estoque') ? 'Alto' : 'Baixo')
      const priority = impact==='Alto' && effort!=='Alto' ? 'Quick Win' : impact==='Alto' ? 'Estratégica' : impact==='Médio' && effort==='Baixo' ? 'Quick Win' : 'Planejada'
      return {
        id:s.id, etapa:s.atendimento||`Etapa ${i+1}`,
        what:s.action,
        why: stages[i]?.gargalos || `Reduzir desperdícios e aproximar a etapa do tempo-alvo de ${s.targetTotal} min.`,
        where: s.atendimento||`Etapa ${i+1}`,
        who: stages[i]?.responsavel || 'Definir responsável',
        when:'Definir prazo',
        how: stages[i]?.desperdicios?.length ? `Atacar ${stages[i].desperdicios.join(', ')} com trabalho padronizado, balanceamento de capacidade e gestão visual.` : 'Padronizar o fluxo, medir estabilidade e revisar capacidade.',
        howMuch:'A estimar',
        status:'Não iniciado',
        impact, effort, priority, gain
      }
    }).sort((a,b)=>({Alto:3,Médio:2,Baixo:1}[b.impact]-{Alto:3,Médio:2,Baixo:1}[a.impact]) || b.gain-a.gain)
    return {proc,wait,lead,value,va,nvaNec,nvaWaste,dominant,hotspots,bottleneck,toBe,toBeLead,reduction,actions}
  },[stages])

  const finish = ()=>setScreen('summary')

  const exportPDF = () => {
    window.print()
  }


  if(screen==='start'){
    return <div className="app-shell">
      <header className="hero compact">
        <div className="hero-brand"><ArpenLogo inverse/></div>
        <div className="eyebrow">LEAN HEALTHCARE</div>
        <h1>Lean Journey</h1>
        <p>Mapeamento da jornada do paciente no Pronto Atendimento</p>
      </header>
      <main className="container narrow">
        <section className="card form-card">
          <h2>Identificação da avaliação</h2>
          <div className="grid two">
            <Field label="Instituição" value={meta.instituicao} onChange={v=>setMeta({...meta,instituicao:v})}/>
            <Field label="Unidade" value={meta.unidade} onChange={v=>setMeta({...meta,unidade:v})}/>
            <Field label="Avaliador" value={meta.avaliador} onChange={v=>setMeta({...meta,avaliador:v})}/>
            <Select label="Tipo de jornada" value={meta.jornada} onChange={v=>setMeta({...meta,jornada:v})} options={['Adulto','Pediátrico','Outro']}/>
            <Select label="Turno" value={meta.turno} onChange={v=>setMeta({...meta,turno:v})} options={['Manhã','Tarde','Noite','Madrugada']}/>
          </div>
          <button className="btn primary full" onClick={()=>setScreen('mapping')}>Iniciar mapeamento <ArrowRight size={18}/></button>
        </section>
      </main>
    </div>
  }

  if(screen==='summary'){
    return <div className="app-shell summary-shell">
      <div id="lean-report">
        <header className="hero compact report-hero">
          <div className="report-brand-row"><ArpenLogo inverse/><div className="report-tag">Relatório Lean Journey</div></div>
          <div className="eyebrow">ANÁLISE LEAN / BLACK BELT</div>
          <h1>Resumo da Jornada</h1>
          <p>{meta.instituicao} • {meta.unidade} • {meta.jornada} • {meta.turno}</p>
          {meta.avaliador && <p className="evaluator">Avaliador: {meta.avaliador}</p>}
        </header>
        <main className="container">
          <div className="metrics">
            <Metric icon={<Clock3/>} label="Lead Time" value={`${summary.lead} min`}/>
            <Metric icon={<Activity/>} label="Processamento" value={`${summary.proc} min`}/>
            <Metric icon={<Gauge/>} label="Espera" value={`${summary.wait} min`}/>
            <Metric icon={<CheckCircle2/>} label="Valor agregado" value={`${summary.value}%`}/>
            <Metric icon={<Gauge/>} label="Lead Time TO-BE" value={`${summary.toBeLead} min`}/>
            <Metric icon={<Sparkles/>} label="Redução potencial" value={`${summary.reduction}%`}/>
          </div>

          <section className="card vsm-card">
            <div className="section-title-row"><div><span className="section-kicker">VALUE STREAM MAP</span><h2><GitBranch size={22}/> VSM Executivo • AS-IS</h2></div><span className="as-is-pill">CRITICIDADE AUTOMÁTICA</span></div>
            <div className="vsm-flow">
              {stages.map((s,i)=>{
                const total=(Number(s.processamento)||0)+(Number(s.espera)||0)
                const hot=summary.hotspots.some(h=>h.index===i)
                const bottleneck=summary.bottleneck?.i===i && summary.bottleneck.wait>0
                const level=bottleneck?'critical':hot?'high':s.desperdicios.length?'medium':'low'
                return <React.Fragment key={s.id}>
                  <div className={`vsm-node ${level}`}>
                    <div className="vsm-flags">{bottleneck&&<span className="flag bottleneck">GARGALO</span>}<span className={`flag ${s.valorTipo==='VA'?'va':'nva'}`}>{s.valorTipo}</span></div>
                    <strong>{s.atendimento||`Etapa ${i+1}`}</strong>
                    <small>{s.responsavel||'Responsável não informado'}</small>
                    <div className="vsm-times"><b>{Number(s.processamento)||0}m proc.</b><b>{Number(s.espera)||0}m espera</b></div>
                    <em>{total} min</em>
                  </div>
                  {i<stages.length-1&&<ArrowRight className="flow-arrow"/>}
                </React.Fragment>
              })}
            </div>
            <div className="vsm-legend"><span>🟢 Fluxo estável</span><span>🟡 Atenção</span><span>🟠 Alta criticidade</span><span>🔴 Restrição / gargalo</span></div>
            <div className="va-strip"><div style={{width:`${summary.value}%`}}>VA {summary.va} min</div><span>NVA / Espera {summary.lead-summary.va} min</span></div>
          </section>

          <section className="card mindmap-card">
            <div className="section-title-row"><div><span className="section-kicker">VISÃO SISTÊMICA</span><h2><GitBranch size={22}/> Mapa mental da jornada</h2></div><span className="as-is-pill">AS-IS</span></div>
            <div className="mindmap">
              <div className="mindmap-root"><Sparkles size={20}/><strong>Jornada do Paciente</strong><span>{meta.unidade}</span></div>
              <div className="mindmap-trunk"/>
              <div className="mindmap-steps">
                {stages.map((s,i)=>{
                  const total=(Number(s.processamento)||0)+(Number(s.espera)||0)
                  return <div className="mind-step-wrap" key={s.id}>
                    <div className="mind-connector"/>
                    <article className={`mind-step ${summary.hotspots.some(h=>h.index===i)?'critical':''}`}>
                      <div className="mind-step-top"><span>{String(i+1).padStart(2,'0')}</span><strong>{s.atendimento || `Etapa ${i+1}`}</strong><em>{total} min</em></div>
                      <div className="mind-grid">
                        <div><small>Sistema</small><b>{s.sistema || 'Não informado'}</b></div>
                        <div><small>Responsável</small><b>{s.responsavel || 'Não informado'}</b></div>
                        <div><small>Espera</small><b>{Number(s.espera)||0} min</b></div>
                        <div><small>Processamento</small><b>{Number(s.processamento)||0} min</b></div>
                      </div>
                      {s.desperdicios.length>0 && <div className="mind-wastes">{s.desperdicios.map(w=><span key={w}>{w}</span>)}</div>}
                      {s.gargalos && <p><strong>Gargalo:</strong> {s.gargalos}</p>}
                      {s.oportunidades && <p className="opportunity"><strong>Melhoria:</strong> {s.oportunidades}</p>}
                    </article>
                  </div>
                })}
              </div>
            </div>
          </section>

          <section className="card">
            <h2>Fluxo direcional resumido</h2>
            <div className="flow">
              {stages.map((s,i)=><React.Fragment key={s.id}>
                <div className="flow-node">
                  <strong>{s.atendimento || `Etapa ${i+1}`}</strong>
                  <span>{s.sistema || 'Sistema não informado'}</span>
                  <small>{(Number(s.processamento)||0)+(Number(s.espera)||0)} min</small>
                </div>
                {i<stages.length-1 && <ArrowRight className="flow-arrow"/>}
              </React.Fragment>)}
            </div>
          </section>

          <div className="grid two summary-grid">
            <section className="card">
              <h2>Desperdícios predominantes</h2>
              {summary.dominant.length ? summary.dominant.map(([w,n])=><div className="rank" key={w}><span>{w}</span><strong>{n}</strong></div>) : <p className="muted">Nenhum desperdício selecionado.</p>}
            </section>
            <section className="card">
              <h2>Hotspots prioritários</h2>
              {summary.hotspots.map((h,i)=><div className="hotspot" key={`${h.etapa}-${i}`}><span className="badge">{i+1}</span><div><strong>{h.etapa}</strong><small>Score de criticidade: {h.score}</small></div></div>)}
            </section>
          </div>

          <section className="card tobe-card">
            <div className="section-title-row"><div><span className="section-kicker">ESTADO FUTURO</span><h2><Sparkles size={22}/> TO-BE sugerido</h2></div><span className="to-be-pill">META: {summary.toBeLead} MIN</span></div>
            <p className="muted">Cenário-alvo calculado a partir das esperas, desperdícios e oportunidades registradas. Deve ser validado no Gemba antes da implantação.</p>
            <div className="tobe-flow">
              {summary.toBe.map((s,i)=><React.Fragment key={s.id}>
                <article className="tobe-node">
                  <span>{String(i+1).padStart(2,'0')}</span><strong>{s.atendimento||`Etapa ${i+1}`}</strong>
                  <div><b>{s.targetTotal} min</b><small> alvo</small></div>
                  <p>{s.action}</p>
                </article>
                {i<summary.toBe.length-1&&<ArrowRight className="flow-arrow"/>}
              </React.Fragment>)}
            </div>
            <div className="impact-grid">
              <div><small>Lead Time AS-IS</small><strong>{summary.lead} min</strong></div>
              <div><small>Lead Time TO-BE</small><strong>{summary.toBeLead} min</strong></div>
              <div><small>Ganho potencial</small><strong>{Math.max(0,summary.lead-summary.toBeLead)} min</strong></div>
              <div><small>Redução potencial</small><strong>{summary.reduction}%</strong></div>
            </div>
          </section>

          <section className="card action-card">
            <div className="section-title-row">
              <div><span className="section-kicker">EXECUÇÃO</span><h2><CheckCircle2 size={22}/> Plano de Ação 5W2H</h2></div>
              <span className="to-be-pill">{summary.actions.filter(a=>a.priority==='Quick Win').length} QUICK WINS</span>
            </div>
            <div className="action-table-wrap">
              <table className="action-table">
                <thead><tr><th>Prioridade</th><th>Etapa</th><th>O quê</th><th>Por quê</th><th>Quem</th><th>Quando</th><th>Como</th><th>Custo</th><th>Status</th></tr></thead>
                <tbody>
                  {summary.actions.map((a,i)=><tr key={a.id}>
                    <td><span className={`priority-chip ${a.priority.toLowerCase().replace(' ','-')}`}>{a.priority}</span></td>
                    <td><strong>{a.etapa}</strong><small className="table-sub">Ganho potencial: {a.gain} min</small></td>
                    <td>{a.what}</td><td>{a.why}</td><td>{a.who}</td><td>{a.when}</td><td>{a.how}</td><td>{a.howMuch}</td>
                    <td><span className="status-chip">{a.status}</span></td>
                  </tr>)}
                </tbody>
              </table>
            </div>
          </section>

          <section className="card matrix-card">
            <div className="section-title-row"><div><span className="section-kicker">PRIORIZAÇÃO</span><h2><Gauge size={22}/> Matriz Impacto × Esforço</h2></div></div>
            <div className="matrix-grid">
              {['Alto|Baixo','Alto|Médio','Alto|Alto','Médio|Baixo','Médio|Médio','Médio|Alto','Baixo|Baixo','Baixo|Médio','Baixo|Alto'].map(cell=>{
                const [impact,effort]=cell.split('|')
                const acts=summary.actions.filter(a=>a.impact===impact&&a.effort===effort)
                return <div className={`matrix-cell impact-${impact.toLowerCase()} effort-${effort.toLowerCase()}`} key={cell}>
                  <div className="matrix-label"><b>{impact}</b> impacto · <b>{effort}</b> esforço</div>
                  {acts.length?acts.map(a=><span className="matrix-item" key={a.id}>{a.etapa}</span>):<small>Sem ações</small>}
                </div>
              })}
            </div>
            <p className="muted matrix-note">Priorize primeiro ações de alto impacto e baixo/médio esforço. Itens de alto esforço devem entrar em plano estruturado com patrocínio executivo.</p>
          </section>

          <section className="card before-after-card">
            <div className="section-title-row"><div><span className="section-kicker">RESULTADO</span><h2><TrendingDown size={22}/> Antes × Depois projetado</h2></div></div>
            <div className="comparison-grid">
              <div className="comparison-box asis"><span>AS-IS</span><strong>{summary.lead} min</strong><small>Lead Time atual</small></div>
              <ArrowRight className="comparison-arrow"/>
              <div className="comparison-box tobe"><span>TO-BE</span><strong>{summary.toBeLead} min</strong><small>Lead Time projetado</small></div>
              <div className="comparison-box gain"><span>GANHO</span><strong>{Math.max(0,summary.lead-summary.toBeLead)} min</strong><small>{summary.reduction}% de redução potencial</small></div>
            </div>
            <div className="result-bars">
              <div><label>AS-IS</label><div className="result-track"><span style={{width:'100%'}}>{summary.lead} min</span></div></div>
              <div><label>TO-BE</label><div className="result-track"><span style={{width:`${summary.lead?Math.max(4,Math.round(summary.toBeLead/summary.lead*100)):0}%`}}>{summary.toBeLead} min</span></div></div>
            </div>
          </section>

          <section className="card analysis-card">
            <h2><AlertTriangle size={22}/> Análise estratégica Black Belt</h2>
            <p><strong>Diagnóstico executivo:</strong> {summary.wait > summary.proc ? 'o tempo sem valor agregado supera o tempo de processamento, indicando forte potencial de redução de fila, handoffs e espera entre recursos.' : 'o fluxo tem maior concentração de tempo em processamento; o próximo passo é separar atividades que agregam valor das que podem ser simplificadas ou padronizadas.'}</p>
            {summary.bottleneck && <p><strong>Principal restrição:</strong> a etapa <b>{summary.bottleneck.name}</b> apresenta a maior espera registrada ({summary.bottleneck.wait} min) e deve ser validada no Gemba como potencial gargalo do sistema.</p>}
            <p><strong>Direcionamento Black Belt:</strong> priorizar as três etapas de maior criticidade, validar causas com observação direta e estratificar os problemas entre capacidade, método, tecnologia, demanda e handoffs.</p>
            <p><strong>Quick wins:</strong> atacar esperas sem valor agregado, eliminar duplicidade de registros, padronizar passagens de etapa e reduzir movimentações e retrabalho antes de mudanças estruturais de maior investimento.</p>
            <p><strong>Próximo ciclo:</strong> desenhar o TO-BE, definir responsáveis, metas por etapa e acompanhar Lead Time, espera, retrabalho e percentual de valor agregado.</p>
          </section>
          <footer className="report-footer"><ArpenLogo/><span>Lean Healthcare • Gestão orientada por dados e melhoria contínua</span></footer>
        </main>
      </div>

      <div className="container report-actions">
        <div className="actions wrap">
          <button className="btn secondary" onClick={()=>setScreen('mapping')}><ArrowLeft size={18}/> Voltar ao mapeamento</button>
          <button className="btn pdf" onClick={exportPDF}><FileDown size={18}/> Exportar PDF</button>
          <button className="btn primary" onClick={()=>{setStages([blankStage(1)]);setCurrent(0);setScreen('start')}}>Nova avaliação</button>
        </div>
      </div>
    </div>
  }

  const s = stages[current]
  return <div className="app-shell">
    <header className="topbar">
      <div className="topbar-brand"><ArpenLogo inverse/><div><span className="eyebrow">LEAN JOURNEY</span><strong>{meta.unidade}</strong></div></div>
      <div className="progress-text">Etapa {current+1} de {stages.length}</div>
    </header>
    <main className="container">
      <div className="progress"><div style={{width:`${((current+1)/stages.length)*100}%`}}/></div>
      <section className="card stage-card">
        <div className="stage-head">
          <div><span className="step-label">ETAPA {String(current+1).padStart(2,'0')}</span><h2>{s.atendimento || 'Nova etapa da jornada'}</h2></div>
          {stages.length>1 && <button className="icon-btn danger" onClick={removeStage} title="Excluir etapa"><Trash2 size={18}/></button>}
        </div>
        <div className="grid two">
          <Field label="Etapa de atendimento" placeholder="Ex.: Recepção, triagem, consulta..." value={s.atendimento} onChange={v=>updateStage('atendimento',v)}/>
          <Field label="Sistema utilizado" placeholder="Ex.: Tasy, MV, prontuário..." value={s.sistema} onChange={v=>updateStage('sistema',v)}/>
          <Field label="Responsável pela etapa" placeholder="Ex.: Recepção, enfermagem, médico..." value={s.responsavel} onChange={v=>updateStage('responsavel',v)}/>
          <div className="grid two compact-grid">
            <Field type="number" label="Tempo de processamento (min)" value={s.processamento} onChange={v=>updateStage('processamento',v)}/>
            <Field type="number" label="Tempo de espera (min)" value={s.espera} onChange={v=>updateStage('espera',v)}/>
          </div>
          <Select label="Classificação de valor" value={s.valorTipo} onChange={v=>updateStage('valorTipo',v)} options={['VA','NVA Necessária','NVA Desperdício']}/>
        </div>
        <TextArea label="Gargalos operacionais" placeholder="Descreva filas, esperas, retrabalho, falhas de comunicação, indisponibilidade de recursos..." value={s.gargalos} onChange={v=>updateStage('gargalos',v)}/>
        <div className="field-wrap"><label>7 desperdícios Lean + talento não utilizado</label><div className="chips">{wastes.map(w=><button type="button" key={w} onClick={()=>toggleWaste(w)} className={`chip ${s.desperdicios.includes(w)?'active':''}`}>{w}</button>)}</div></div>
        <TextArea label="Oportunidades de melhoria" placeholder="Registre ideias, hipóteses e ações potenciais..." value={s.oportunidades} onChange={v=>updateStage('oportunidades',v)}/>
      </section>
      <div className="actions wrap sticky-actions">
        <button className="btn secondary" disabled={current===0} onClick={()=>setCurrent(current-1)}><ArrowLeft size={18}/> Anterior</button>
        {current < stages.length-1 ? <button className="btn secondary" onClick={()=>setCurrent(current+1)}>Próxima <ArrowRight size={18}/></button> : <button className="btn secondary" onClick={addStage}><Plus size={18}/> Próxima etapa</button>}
        <button className="btn primary" onClick={finish}><CheckCircle2 size={18}/> Finalizar avaliação</button>
      </div>
    </main>
  </div>
}

function Field({label,value,onChange,placeholder='',type='text'}){return <div className="field-wrap"><label>{label}</label><input type={type} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/></div>}
function TextArea({label,value,onChange,placeholder=''}){return <div className="field-wrap"><label>{label}</label><textarea value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}/></div>}
function Select({label,value,onChange,options}){return <div className="field-wrap"><label>{label}</label><select value={value} onChange={e=>onChange(e.target.value)}>{options.map(o=><option key={o}>{o}</option>)}</select></div>}
function Metric({icon,label,value}){return <div className="metric-card"><div className="metric-icon">{icon}</div><div><span>{label}</span><strong>{value}</strong></div></div>}

createRoot(document.getElementById('root')).render(<React.StrictMode><App/></React.StrictMode>)
