import React, { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { ArrowLeft, ArrowRight, CheckCircle2, Plus, Trash2, Activity, Clock3, Gauge, AlertTriangle } from 'lucide-react'
import './styles.css'

const wastes = [
  'Superprodução', 'Espera', 'Transporte', 'Processamento excessivo',
  'Estoque', 'Movimentação', 'Defeitos / Retrabalho', 'Talento não utilizado'
]

const blankStage = (n) => ({
  id: crypto.randomUUID(),
  title: `Etapa ${n}`,
  atendimento: '', sistema: '', responsavel: '', gargalos: '', oportunidades: '',
  processamento: '', espera: '', desperdicios: []
})

function App(){
  const [screen, setScreen] = useState('start')
  const [meta, setMeta] = useState({ instituicao:'Unimed Araçatuba', unidade:'Pronto Atendimento', avaliador:'', jornada:'Adulto', turno:'Manhã' })
  const [stages, setStages] = useState([blankStage(1)])
  const [current, setCurrent] = useState(0)

  const updateStage = (field, value) => {
    setStages(prev => prev.map((s,i)=> i===current ? {...s,[field]:value} : s))
  }

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
    const next = stages.filter((_,i)=>i!==current)
    setStages(next)
    setCurrent(Math.max(0,current-1))
  }

  const summary = useMemo(()=>{
    const proc = stages.reduce((a,s)=>a+(Number(s.processamento)||0),0)
    const wait = stages.reduce((a,s)=>a+(Number(s.espera)||0),0)
    const lead = proc+wait
    const value = lead ? Math.round((proc/lead)*100) : 0
    const wasteCount = stages.reduce((acc,s)=>{ s.desperdicios.forEach(w=>acc[w]=(acc[w]||0)+1); return acc },{})
    const dominant = Object.entries(wasteCount).sort((a,b)=>b[1]-a[1])
    const hotspots = stages.map((s,i)=>({
      etapa:s.atendimento || `Etapa ${i+1}`,
      score:(Number(s.espera)||0) + s.desperdicios.length*10 + (s.gargalos.trim()?15:0)
    })).sort((a,b)=>b.score-a.score).slice(0,3)
    return {proc,wait,lead,value,dominant,hotspots}
  },[stages])

  const finish = ()=>setScreen('summary')

  if(screen==='start'){
    return <div className="app-shell">
      <header className="hero compact">
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
    return <div className="app-shell">
      <header className="hero compact">
        <div className="eyebrow">ANÁLISE LEAN / BLACK BELT</div>
        <h1>Resumo da Jornada</h1>
        <p>{meta.instituicao} • {meta.unidade}</p>
      </header>
      <main className="container">
        <div className="metrics">
          <Metric icon={<Clock3/>} label="Lead Time" value={`${summary.lead} min`}/>
          <Metric icon={<Activity/>} label="Processamento" value={`${summary.proc} min`}/>
          <Metric icon={<Gauge/>} label="Espera" value={`${summary.wait} min`}/>
          <Metric icon={<CheckCircle2/>} label="Valor agregado" value={`${summary.value}%`}/>
        </div>

        <section className="card">
          <h2>Fluxo direcional AS-IS</h2>
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

        <div className="grid two">
          <section className="card">
            <h2>Desperdícios predominantes</h2>
            {summary.dominant.length ? summary.dominant.map(([w,n])=><div className="rank" key={w}><span>{w}</span><strong>{n}</strong></div>) : <p className="muted">Nenhum desperdício selecionado.</p>}
          </section>
          <section className="card">
            <h2>Hotspots prioritários</h2>
            {summary.hotspots.map((h,i)=><div className="hotspot" key={h.etapa}><span className="badge">{i+1}</span><div><strong>{h.etapa}</strong><small>Score de criticidade: {h.score}</small></div></div>)}
          </section>
        </div>

        <section className="card analysis-card">
          <h2><AlertTriangle size={22}/> Análise estratégica</h2>
          <p><strong>Diagnóstico executivo:</strong> a jornada apresenta maior oportunidade de ganho nas etapas com maior tempo de espera, presença simultânea de desperdícios e gargalos descritos pela equipe.</p>
          <p><strong>Direcionamento Black Belt:</strong> priorizar as três etapas de maior criticidade, validar causas no Gemba e separar problemas de capacidade, método, sistema e handoff entre equipes.</p>
          <p><strong>Quick wins:</strong> reduzir retrabalho cadastral, padronizar passagens de etapa, eliminar duplicidade de registros e atacar esperas sem valor agregado antes de mudanças estruturais.</p>
          <p><strong>Próximo ciclo:</strong> desenhar o TO-BE, definir responsáveis, metas de Lead Time e acompanhar redução de espera por etapa.</p>
        </section>

        <div className="actions wrap">
          <button className="btn secondary" onClick={()=>setScreen('mapping')}><ArrowLeft size={18}/> Voltar ao mapeamento</button>
          <button className="btn primary" onClick={()=>{setStages([blankStage(1)]);setCurrent(0);setScreen('start')}}>Nova avaliação</button>
        </div>
      </main>
    </div>
  }

  const s = stages[current]
  return <div className="app-shell">
    <header className="topbar">
      <div><span className="eyebrow">LEAN JOURNEY</span><strong>{meta.unidade}</strong></div>
      <div className="progress-text">Etapa {current+1} de {stages.length}</div>
    </header>
    <main className="container">
      <div className="progress"><div style={{width:`${((current+1)/stages.length)*100}%`}}/></div>
      <section className="card stage-card">
        <div className="stage-head">
          <div>
            <span className="step-label">ETAPA {String(current+1).padStart(2,'0')}</span>
            <h2>{s.atendimento || 'Nova etapa da jornada'}</h2>
          </div>
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
        </div>

        <TextArea label="Gargalos operacionais" placeholder="Descreva filas, esperas, retrabalho, falhas de comunicação, indisponibilidade de recursos..." value={s.gargalos} onChange={v=>updateStage('gargalos',v)}/>

        <div className="field-wrap">
          <label>7 desperdícios Lean + talento não utilizado</label>
          <div className="chips">
            {wastes.map(w=><button type="button" key={w} onClick={()=>toggleWaste(w)} className={`chip ${s.desperdicios.includes(w)?'active':''}`}>{w}</button>)}
          </div>
        </div>

        <TextArea label="Oportunidades de melhoria" placeholder="Registre ideias, hipóteses e ações potenciais..." value={s.oportunidades} onChange={v=>updateStage('oportunidades',v)}/>
      </section>

      <div className="actions wrap sticky-actions">
        <button className="btn secondary" disabled={current===0} onClick={()=>setCurrent(current-1)}><ArrowLeft size={18}/> Anterior</button>
        {current < stages.length-1
          ? <button className="btn secondary" onClick={()=>setCurrent(current+1)}>Próxima <ArrowRight size={18}/></button>
          : <button className="btn secondary" onClick={addStage}><Plus size={18}/> Próxima etapa</button>
        }
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
