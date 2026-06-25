import { useState } from "react"
import {
  type SlabInput,
  type SlabResult,
  type AggregateType,
  type AggressivenessClass,
  type SupportCase,
  type VariableLoadType,
  calculateSlab,
  SUPPORT_CASE_DESCRIPTIONS,
  ONE_WAY_CASE_DESCRIPTIONS,
} from "@/lib/slabCalculations"

// ─── Support Case SVG Diagrams ───────────────────────────────────────────────

function SupportCaseDiagram({ caso, direction }: { caso: SupportCase; direction: 1 | 2 }) {
  const eng = {
    1: { top: false, right: false, bottom: false, left: false },
    2: { top: false, right: false, bottom: false, left: true },
    3: { top: true, right: false, bottom: false, left: false },
    4: { top: false, right: true, bottom: false, left: true },
    5: { top: true, right: false, bottom: true, left: false },
    6: { top: false, right: false, bottom: true, left: true },
    7: { top: true, right: false, bottom: true, left: true },
    8: { top: true, right: true, bottom: true, left: false },
    9: { top: true, right: true, bottom: true, left: true },
  }[caso]

  if (direction === 1) {
    const oneWayEng = {
      1: { left: false, right: false },
      2: { left: true, right: false },
      3: { left: true, right: true },
      4: { left: true, right: false },
    }[caso as 1 | 2 | 3 | 4] || { left: false, right: false }

    return (
      <svg viewBox="0 0 120 80" className="w-full max-w-[160px] mx-auto">
        <rect x="20" y="15" width="80" height="50" fill="#e2e8f0" stroke="#475569" strokeWidth="2" />
        <text x="60" y="44" textAnchor="middle" fontSize="10" fill="#334155" fontWeight="bold">L</text>
        {/* Left support */}
        {oneWayEng.left ? (
          <>
            <line x1="20" y1="10" x2="20" y2="70" stroke="#dc2626" strokeWidth="3" />
            {[15, 25, 35, 45, 55, 65].map(y => (
              <line key={y} x1="20" y1={y} x2="14" y2={y + 6} stroke="#dc2626" strokeWidth="1.5" />
            ))}
          </>
        ) : (
          <>
            <circle cx="20" cy="68" r="3" fill="#3b82f6" />
            <line x1="14" y1="72" x2="26" y2="72" stroke="#3b82f6" strokeWidth="2" />
          </>
        )}
        {/* Right support */}
        {oneWayEng.right ? (
          <>
            <line x1="100" y1="10" x2="100" y2="70" stroke="#dc2626" strokeWidth="3" />
            {[15, 25, 35, 45, 55, 65].map(y => (
              <line key={y} x1="100" y1={y} x2="106" y2={y + 6} stroke="#dc2626" strokeWidth="1.5" />
            ))}
          </>
        ) : caso === 4 ? (
          <text x="100" y="44" textAnchor="middle" fontSize="16" fill="#94a3b8">⟶</text>
        ) : (
          <>
            <circle cx="100" cy="68" r="3" fill="#3b82f6" />
            <line x1="94" y1="72" x2="106" y2="72" stroke="#3b82f6" strokeWidth="2" />
          </>
        )}
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 140 100" className="w-full max-w-[180px] mx-auto">
      <rect x="25" y="20" width="90" height="60" fill="#e2e8f0" stroke="#475569" strokeWidth="2" />
      <text x="45" y="54" textAnchor="middle" fontSize="9" fill="#334155">a</text>
      <text x="70" y="75" textAnchor="middle" fontSize="9" fill="#334155">b</text>

      {/* Top */}
      {eng.top ? (
        <>
          <line x1="25" y1="20" x2="115" y2="20" stroke="#dc2626" strokeWidth="3" />
          {[30, 45, 60, 75, 90, 105].map(x => (
            <line key={x} x1={x} y1="20" x2={x - 5} y2="14" stroke="#dc2626" strokeWidth="1.5" />
          ))}
        </>
      ) : (
        <>
          {[35, 55, 75, 95].map(x => (
            <g key={x}>
              <circle cx={x} cy="18" r="2" fill="#3b82f6" />
            </g>
          ))}
        </>
      )}
      {/* Bottom */}
      {eng.bottom ? (
        <>
          <line x1="25" y1="80" x2="115" y2="80" stroke="#dc2626" strokeWidth="3" />
          {[30, 45, 60, 75, 90, 105].map(x => (
            <line key={x} x1={x} y1="80" x2={x + 5} y2="86" stroke="#dc2626" strokeWidth="1.5" />
          ))}
        </>
      ) : (
        <>
          {[35, 55, 75, 95].map(x => (
            <g key={x}>
              <circle cx={x} cy="82" r="2" fill="#3b82f6" />
            </g>
          ))}
        </>
      )}
      {/* Left */}
      {eng.left ? (
        <>
          <line x1="25" y1="20" x2="25" y2="80" stroke="#dc2626" strokeWidth="3" />
          {[25, 40, 55, 70].map(y => (
            <line key={y} x1="25" y1={y} x2="19" y2={y + 5} stroke="#dc2626" strokeWidth="1.5" />
          ))}
        </>
      ) : (
        <>
          {[30, 45, 60, 70].map(y => (
            <g key={y}>
              <circle cx="23" cy={y} r="2" fill="#3b82f6" />
            </g>
          ))}
        </>
      )}
      {/* Right */}
      {eng.right ? (
        <>
          <line x1="115" y1="20" x2="115" y2="80" stroke="#dc2626" strokeWidth="3" />
          {[25, 40, 55, 70].map(y => (
            <line key={y} x1="115" y1={y} x2="121" y2={y + 5} stroke="#dc2626" strokeWidth="1.5" />
          ))}
        </>
      ) : (
        <>
          {[30, 45, 60, 70].map(y => (
            <g key={y}>
              <circle cx="117" cy={y} r="2" fill="#3b82f6" />
            </g>
          ))}
        </>
      )}
    </svg>
  )
}

// ─── Result Step Card ────────────────────────────────────────────────────────

function StepCard({ step, title, children }: { step: string; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm">
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 rounded-t-lg">
        <h3 className="text-sm font-semibold text-gray-700">
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs mr-2">{step}</span>
          {title}
        </h3>
      </div>
      <div className="p-4 text-sm">{children}</div>
    </div>
  )
}

function ResultRow({ label, value, unit, highlight }: { label: string; value: string | number; unit?: string; highlight?: boolean }) {
  const formatted = typeof value === 'number' ? value.toFixed(4) : value
  return (
    <div className={`flex justify-between items-center py-1.5 px-2 rounded ${highlight ? 'bg-blue-50' : ''}`}>
      <span className="text-gray-600">{label}</span>
      <span className="font-mono font-medium text-gray-900">
        {formatted} {unit && <span className="text-gray-500 text-xs">{unit}</span>}
      </span>
    </div>
  )
}

function StatusBadge({ ok, trueText, falseText }: { ok: boolean; trueText: string; falseText: string }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ok ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
      {ok ? trueText : falseText}
    </span>
  )
}

// ─── Reinforcement Result Display ────────────────────────────────────────────

function ReinforcementDisplay({ label, data }: { label: string; data: { As: number; AsMin: number; phi: number; spacing: number } }) {
  if (data.As <= 0 && data.phi === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-3">
        <h4 className="text-xs font-semibold text-gray-500 uppercase mb-1">{label}</h4>
        <p className="text-sm text-gray-400 italic">Sem armadura necessaria</p>
      </div>
    )
  }
  return (
    <div className="bg-blue-50 rounded-lg p-3">
      <h4 className="text-xs font-semibold text-blue-700 uppercase mb-2">{label}</h4>
      <div className="space-y-1">
        <ResultRow label="As necessario" value={data.As.toFixed(2)} unit="cm2/m" />
        {data.AsMin > 0 && <ResultRow label="As minimo" value={data.AsMin.toFixed(2)} unit="cm2/m" />}
        <div className="flex gap-4 mt-2 pt-2 border-t border-blue-200">
          <div className="text-center">
            <div className="text-lg font-bold text-blue-800">&#8960; {data.phi}</div>
            <div className="text-xs text-blue-600">mm</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-bold text-blue-800">c/ {data.spacing}</div>
            <div className="text-xs text-blue-600">cm</div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Main Page Component ─────────────────────────────────────────────────────

const defaultInput: SlabInput = {
  a: 4,
  b: 6,
  h: 0.09,
  caso: 2,
  fck: 20,
  fyk: 50,
  agregado: 'basalto',
  classeAgressividade: 3,
  cargas: {
    laje: true,
    contraPiso: false,
    argamassa: true,
    reboco: true,
    ceramico: true,
    taco: false,
    forroFalso: false,
    gesso: false,
    enchimento: false,
    paredeA: false,
    paredeB: false,
  },
  cargaVariavel: 'residencial',
  parede: {
    La: 0,
    Lb: 0,
    bLinha: 0,
    hLinha: 0,
    hEstrela: 0,
  },
}

export default function SlabCalculationPage() {
  const [input, setInput] = useState<SlabInput>(defaultInput)
  const [result, setResult] = useState<SlabResult | null>(null)
  const [activeTab, setActiveTab] = useState<'input' | 'results'>('input')

  const direction: 1 | 2 = (input.b / input.a) > 2 ? 1 : 2
  const maxCaso = direction === 1 ? 4 : 9

  function handleCalculate() {
    const res = calculateSlab(input)
    setResult(res)
    setActiveTab('results')
  }

  function handleReset() {
    setInput(defaultInput)
    setResult(null)
    setActiveTab('input')
  }

  function updateInput<K extends keyof SlabInput>(key: K, value: SlabInput[K]) {
    setInput(prev => ({ ...prev, [key]: value }))
  }

  function updateCargas(key: keyof SlabInput['cargas'], value: boolean) {
    setInput(prev => ({
      ...prev,
      cargas: { ...prev.cargas, [key]: value },
    }))
  }

  function updateParede<K extends keyof SlabInput['parede']>(key: K, value: number) {
    setInput(prev => ({
      ...prev,
      parede: { ...prev.parede, [key]: value },
    }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Calculo Estrutural de Lajes Macicas</h1>
          <p className="text-sm text-gray-500 mt-1">
            Dimensionamento conforme NBR 6118:2014 - Concreto Armado
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Limpar
          </button>
          <button
            onClick={handleCalculate}
            className="px-6 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            Calcular
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-4">
          <button
            onClick={() => setActiveTab('input')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'input'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
          >
            Dados de Entrada
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={`pb-3 px-1 text-sm font-medium border-b-2 transition-colors ${activeTab === 'results'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            disabled={!result}
          >
            Resultados {result && (result.approved ?
              <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-green-100 text-green-800">Aprovado</span> :
              <span className="ml-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-xs bg-red-100 text-red-800">Recalcular</span>
            )}
          </button>
        </nav>
      </div>

      {/* ─── INPUT TAB ──────────────────────────────────────────────────────── */}
      {activeTab === 'input' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Geometry */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm">1</span>
              Geometria da Laje
            </h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">a - Menor vao (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={input.a}
                  onChange={e => updateInput('a', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">b - Maior vao (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={input.b}
                  onChange={e => updateInput('b', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">h - Espessura (m)</label>
                <input
                  type="number"
                  step="0.01"
                  value={input.h}
                  onChange={e => updateInput('h', parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <div className="mt-3 p-3 bg-gray-50 rounded-lg">
              <div className="flex justify-between text-xs text-gray-500">
                <span>b/a = {input.a > 0 ? (input.b / input.a).toFixed(2) : '-'}</span>
                <span>Direcao: {direction === 1 ? '1 direcao' : '2 direcoes'}</span>
                <span>{direction === 1 ? '(b/a > 2)' : '(1 <= b/a <= 2)'}</span>
              </div>
            </div>
            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800">
              <strong>NBR 6118:2014 - Espessuras minimas:</strong>
              <ul className="mt-1 space-y-0.5 list-disc list-inside">
                <li>7 cm - Lajes de cobertura nao em balanco</li>
                <li>8 cm - Lajes de piso nao em balanco</li>
                <li>10 cm - Lajes em balanco</li>
                <li>10 cm - Lajes com veiculos &le; 30 kN</li>
                <li>12 cm - Lajes com veiculos &gt; 30 kN</li>
              </ul>
            </div>
          </div>

          {/* Material Properties */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm">2</span>
              Propriedades dos Materiais
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">fck (MPa)</label>
                <select
                  value={input.fck}
                  onChange={e => updateInput('fck', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  {[20, 25, 30, 35, 40, 45, 50].map(v => (
                    <option key={v} value={v}>{v} MPa</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">fyk (kN/cm2)</label>
                <select
                  value={input.fyk}
                  onChange={e => updateInput('fyk', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value={50}>CA-50 (50 kN/cm2)</option>
                  <option value={60}>CA-60 (60 kN/cm2)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Tipo de Agregado</label>
                <select
                  value={input.agregado}
                  onChange={e => updateInput('agregado', e.target.value as AggregateType)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value="basalto">Basalto / Diabasio (aE=1.2)</option>
                  <option value="granito">Granito / Gnaisse (aE=1.0)</option>
                  <option value="calcario">Calcario (aE=0.9)</option>
                  <option value="arenito">Arenito (aE=0.7)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Classe de Agressividade</label>
                <select
                  value={input.classeAgressividade}
                  onChange={e => updateInput('classeAgressividade', parseInt(e.target.value) as AggressivenessClass)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                >
                  <option value={1}>Classe I - Rural (c=2.0cm)</option>
                  <option value={2}>Classe II - Urbana (c=2.5cm)</option>
                  <option value={3}>Classe III - Marinha/Industrial (c=3.5cm)</option>
                  <option value={4}>Classe IV - Especial (c=4.5cm)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Support Case */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm">3</span>
              Caso de Apoio / Engastamento
            </h2>
            <div className="grid grid-cols-3 gap-2">
              {Array.from({ length: maxCaso }, (_, i) => i + 1).map(c => {
                const casoNum = c as SupportCase
                const desc = direction === 1
                  ? ONE_WAY_CASE_DESCRIPTIONS[c] || ''
                  : SUPPORT_CASE_DESCRIPTIONS[casoNum] || ''
                return (
                  <button
                    key={c}
                    onClick={() => updateInput('caso', casoNum)}
                    className={`p-3 rounded-lg border-2 text-center transition-all ${input.caso === casoNum
                        ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                        : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    <div className="text-sm font-bold text-gray-700 mb-1">Caso {c}</div>
                    <SupportCaseDiagram caso={casoNum} direction={direction} />
                    <div className="text-[10px] text-gray-500 mt-1 leading-tight">{desc}</div>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Permanent Loads */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm">4</span>
              Cargas Permanentes
            </h2>
            <div className="space-y-2">
              {[
                { key: 'laje' as const, label: 'Laje (25 kN/m3 x h)', desc: `${(input.h * 25).toFixed(2)} kN/m2` },
                { key: 'contraPiso' as const, label: 'Contrapiso (21 kN/m3 x 1cm)', desc: '0.21 kN/m2' },
                { key: 'argamassa' as const, label: 'Argamassa (21 kN/m3 x 1cm)', desc: '0.21 kN/m2' },
                { key: 'reboco' as const, label: 'Reboco', desc: '0.20 kN/m2' },
                { key: 'ceramico' as const, label: 'Piso Ceramico', desc: '0.85 kN/m2' },
                { key: 'taco' as const, label: 'Taco de Madeira', desc: '0.70 kN/m2' },
                { key: 'forroFalso' as const, label: 'Forro Falso', desc: '0.50 kN/m2' },
                { key: 'gesso' as const, label: 'Gesso', desc: '0.13 kN/m2' },
                { key: 'enchimento' as const, label: 'Enchimento (14 kN/m3)', desc: 'Volume' },
                { key: 'paredeA' as const, label: 'Parede na direcao a', desc: 'Linear' },
                { key: 'paredeB' as const, label: 'Parede na direcao b', desc: 'Linear' },
              ].map(item => (
                <label key={item.key} className="flex items-center gap-3 py-1.5 px-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={input.cargas[item.key]}
                    onChange={e => updateCargas(item.key, e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm text-gray-700">{item.label}</span>
                    <span className="text-xs text-gray-400 ml-2">{item.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Variable Loads */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
            <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm">5</span>
              Carga Variavel (q)
            </h2>
            <div className="space-y-2">
              {[
                { key: 'residencial' as VariableLoadType, label: 'Sala, Dormitorio, Cozinha, Banheiro', value: '1.5 kN/m2' },
                { key: 'servico' as VariableLoadType, label: 'Despensa, Lavanderia, Area de Servico', value: '2.0 kN/m2' },
                { key: 'corredor_residencial' as VariableLoadType, label: 'Corredor/Escada em Edificios Residenciais', value: '3.0 kN/m2' },
                { key: 'corredor_nao_residencial' as VariableLoadType, label: 'Corredor/Escada em Edificios Nao Residenciais', value: '5.0 kN/m2' },
              ].map(item => (
                <label key={item.key} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="radio"
                    name="cargaVariavel"
                    checked={input.cargaVariavel === item.key}
                    onChange={() => updateInput('cargaVariavel', item.key)}
                    className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
                  />
                  <div className="flex-1 flex justify-between">
                    <span className="text-sm text-gray-700">{item.label}</span>
                    <span className="text-sm font-medium text-gray-900">{item.value}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Wall Data */}
          {(input.cargas.paredeA || input.cargas.paredeB || input.cargas.enchimento) && (
            <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-5">
              <h2 className="text-base font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center text-sm">6</span>
                Dados de Paredes / Enchimento
              </h2>
              <div className="grid grid-cols-2 gap-4">
                {input.cargas.paredeA && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">La - Comprimento parede a (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={input.parede.La}
                      onChange={e => updateParede('La', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                {input.cargas.paredeB && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Lb - Comprimento parede b (m)</label>
                    <input
                      type="number"
                      step="0.1"
                      value={input.parede.Lb}
                      onChange={e => updateParede('Lb', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
                {(input.cargas.paredeA || input.cargas.paredeB) && (
                  <>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">b' - Espessura da parede (m)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={input.parede.bLinha}
                        onChange={e => updateParede('bLinha', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">h' - Altura da parede (m)</label>
                      <input
                        type="number"
                        step="0.1"
                        value={input.parede.hLinha}
                        onChange={e => updateParede('hLinha', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </>
                )}
                {input.cargas.enchimento && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">h* - Altura enchimento (m)</label>
                    <input
                      type="number"
                      step="0.01"
                      value={input.parede.hEstrela}
                      onChange={e => updateParede('hEstrela', parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Calculate Button (bottom) */}
          <div className="lg:col-span-2 flex justify-center">
            <button
              onClick={handleCalculate}
              className="px-10 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold text-base shadow-lg shadow-blue-200"
            >
              Calcular Laje
            </button>
          </div>
        </div>
      )}

      {/* ─── RESULTS TAB ────────────────────────────────────────────────────── */}
      {activeTab === 'results' && result && (
        <div className="space-y-6">
          {/* Summary Header */}
          <div className={`p-5 rounded-lg border-2 ${result.approved
              ? 'bg-green-50 border-green-300'
              : 'bg-red-50 border-red-300'
            }`}>
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-gray-900">
                  Laje {input.a}m x {input.b}m - h = {input.h * 100}cm
                </h2>
                <div className="flex gap-4 mt-1 text-sm text-gray-600">
                  <span>Direcao: <strong>{result.direction === 1 ? '1 direcao' : '2 direcoes'}</strong></span>
                  <span>Classificacao: <strong>{result.classification}</strong></span>
                  <span>b/a = <strong>{result.ba_ratio.toFixed(2)}</strong></span>
                  <span>Caso: <strong>{input.caso}</strong></span>
                </div>
              </div>
              <StatusBadge
                ok={result.approved}
                trueText="APROVADO"
                falseText="RECALCULAR (aumentar h)"
              />
            </div>
          </div>

          {/* Results Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

            {/* Step 1 */}
            <StepCard step="1" title="Composicao das Cargas">
              <ResultRow label="g superficial" value={result.gSuperficial} unit="kN/m2" />
              <ResultRow label="q (variavel)" value={result.q} unit="kN/m2" />
              <ResultRow label="p0 = g + q" value={result.p0} unit="kN/m2" highlight />
              <ResultRow label="Pd,serv = g + 0.3q" value={result.pdServ} unit="kN/m2" />
              {(result.Pa > 0 || result.Pb > 0) && (
                <>
                  <div className="border-t border-gray-200 my-2" />
                  <ResultRow label="Pa (parede a)" value={result.Pa} unit="kN/m" />
                  <ResultRow label="Pb (parede b)" value={result.Pb} unit="kN/m" />
                  <ResultRow label="alpha (carga)" value={result.alpha_load} />
                  <ResultRow label="beta (carga)" value={result.beta_load} />
                  <ResultRow label="p* = p0(1+a+2b)" value={result.pEstrela} unit="kN/m2" highlight />
                </>
              )}
            </StepCard>

            {/* Step 2 */}
            <StepCard step="2" title="Modulo de Elasticidade">
              <ResultRow label="fck" value={input.fck} unit="MPa" />
              <ResultRow label="alphaI" value={result.alphaI} />
              <ResultRow label="alphaE" value={result.alphaE} />
              <ResultRow label="Eci" value={result.Eci} unit="MPa" />
              <ResultRow label="Ecs" value={result.Ecs} unit="MPa" highlight />
            </StepCard>

            {/* Step 3 */}
            <StepCard step="3" title="Resistencia a Tracao">
              <ResultRow label="fctm" value={result.fctm} unit="MPa" />
              <ResultRow label="fctm" value={result.fctm_kNcm2} unit="kN/cm2" highlight />
            </StepCard>

            {/* Step 4 */}
            <StepCard step="4" title="Momento de Fissuracao">
              <p className="text-xs text-gray-500 mb-2">mr = 0,25 * fctm * bw * h2</p>
              <ResultRow label="mr" value={result.mr} unit="kN.cm/m" />
              <ResultRow label="mr" value={result.mr_kNm} unit="kN.m/m" highlight />
            </StepCard>

            {/* Step 5 */}
            <StepCard step="5" title="Momento de Servico">
              {result.direction === 2 && (
                <ResultRow label="alpha (tabela)" value={result.alpha_moment} />
              )}
              <ResultRow label="ma" value={result.ma} unit="kN.m/m" highlight />
              <div className="mt-2">
                <StatusBadge
                  ok={result.maLeqMr}
                  trueText="ma <= mr (secao nao fissurada)"
                  falseText="ma > mr (secao fissurada)"
                />
              </div>
            </StepCard>

            {/* Step 6 */}
            <StepCard step="6" title="Momento de Inercia">
              <p className="text-xs text-gray-500 mb-2">
                {result.maLeqMr ? 'Ieq = Ic = bw*h3/12' : 'Ieq = 0,30 * Ic'}
              </p>
              <ResultRow label="Ieq" value={result.Ieq} unit="cm4" highlight />
            </StepCard>

            {/* Step 7 */}
            <StepCard step="7" title="Flecha Curta Duracao">
              <ResultRow label="K (tabela)" value={result.K_flecha} />
              <ResultRow label="f(t=0)" value={result.f_t0} unit="cm" highlight />
            </StepCard>

            {/* Step 8 */}
            <StepCard step="8" title="Flecha Longa Duracao">
              <ResultRow label="alphaF" value={result.alphaF} />
              <p className="text-xs text-gray-500 mb-1">f(t=inf) = (1 + alphaF) * f(t=0)</p>
              <ResultRow label="f(t=inf)" value={result.f_tInf} unit="cm" highlight />
            </StepCard>

            {/* Step 9 */}
            <StepCard step="9" title="Flecha Admissivel">
              <ResultRow label="f,adm = L/250" value={result.fAdm} unit="cm" />
              <ResultRow label="f(t=inf)" value={result.f_tInf} unit="cm" />
              <div className="mt-2">
                <StatusBadge
                  ok={result.deflectionOk}
                  trueText="f(t=inf) < f,adm - OK"
                  falseText="f(t=inf) >= f,adm - FALHA"
                />
              </div>
            </StepCard>

            {/* Step 10 */}
            <StepCard step="10" title="Calculo das Solicitacoes">
              {result.direction === 2 && (
                <>
                  <ResultRow label="ar (vao reduzido)" value={result.ar} unit="m" />
                  <ResultRow label="br* (vao reduzido)" value={result.br_star} unit="m" />
                  {result.classification === 'Ortótropa' && (
                    <ResultRow label="phi (ortotropia)" value={result.phi_ortho} />
                  )}
                </>
              )}
              <div className="border-t border-gray-200 my-2" />
              <p className="text-xs font-semibold text-gray-600 mb-1">Momentos Positivos</p>
              <ResultRow label="mv,a" value={result.mv_a} unit="kN.m/m" highlight />
              {result.mv_b !== 0 && (
                <ResultRow label="mv,b" value={result.mv_b} unit="kN.m/m" highlight />
              )}
              {(result.me_a !== 0 || result.me_b !== 0) && (
                <>
                  <div className="border-t border-gray-200 my-2" />
                  <p className="text-xs font-semibold text-gray-600 mb-1">Momentos Negativos</p>
                  {result.me_a !== 0 && <ResultRow label="me,a" value={result.me_a} unit="kN.m/m" />}
                  {result.me_b !== 0 && <ResultRow label="me,b" value={result.me_b} unit="kN.m/m" />}
                </>
              )}
            </StepCard>

            {/* Neutral Axis */}
            <StepCard step="" title="Linha Neutra">
              <div className="space-y-2">
                <ResultRow label="d (positiva)" value={result.d_pos} unit="cm" />
                <ResultRow label="md,a = mv,a x 1.4" value={result.md_a} unit="kN.m" />
                <ResultRow label="xa" value={result.xa} unit="cm" />
                {result.xb > 0 && <ResultRow label="xb" value={result.xb} unit="cm" />}
                <div className="mt-1">
                  <StatusBadge
                    ok={result.neutralAxisOk_pos}
                    trueText="x/d <= 0,25 - OK"
                    falseText="x/d > 0,25 - FALHA"
                  />
                </div>
                {result.xa_neg > 0 && (
                  <>
                    <div className="border-t border-gray-200 my-2" />
                    <ResultRow label="d (negativa)" value={result.d_neg} unit="cm" />
                    <ResultRow label="xa' (negativa)" value={result.xa_neg} unit="cm" />
                    {result.xb_neg > 0 && <ResultRow label="xb' (negativa)" value={result.xb_neg} unit="cm" />}
                  </>
                )}
              </div>
            </StepCard>

            {/* Step 11 */}
            <StepCard step="11" title="Area de Aco Positiva">
              <div className="grid grid-cols-2 gap-3">
                <ReinforcementDisplay label="Direcao a" data={result.positiveA} />
                <ReinforcementDisplay label="Direcao b" data={result.positiveB} />
              </div>
            </StepCard>

            {/* Step 12 */}
            <StepCard step="12" title="Area de Aco Negativa">
              <div className="grid grid-cols-2 gap-3">
                <ReinforcementDisplay label="Direcao a" data={result.negativeA} />
                <ReinforcementDisplay label="Direcao b" data={result.negativeB} />
              </div>
            </StepCard>
          </div>

          {/* Slab Drawing / Detailing */}
          <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-6">
            <h2 className="text-base font-semibold text-gray-800 mb-4">Detalhamento da Laje</h2>
            <div className="flex justify-center">
              <svg viewBox="0 0 500 350" className="w-full max-w-[600px]">
                {/* Slab rectangle */}
                <rect x="100" y="50" width="300" height="200" fill="#f1f5f9" stroke="#334155" strokeWidth="2" />

                {/* Dimensions */}
                <line x1="100" y1="280" x2="400" y2="280" stroke="#64748b" strokeWidth="1" markerEnd="url(#arrow)" markerStart="url(#arrow)" />
                <text x="250" y="295" textAnchor="middle" fontSize="14" fill="#334155">{input.b}m (b)</text>

                <line x1="430" y1="50" x2="430" y2="250" stroke="#64748b" strokeWidth="1" markerEnd="url(#arrow)" markerStart="url(#arrow)" />
                <text x="460" y="155" textAnchor="middle" fontSize="14" fill="#334155">{input.a}m (a)</text>

                {/* Thickness label */}
                <text x="250" y="160" textAnchor="middle" fontSize="16" fill="#1e40af" fontWeight="bold">
                  h = {input.h * 100} cm
                </text>

                {/* Positive reinforcement info */}
                {result.positiveA.phi > 0 && (
                  <text x="250" y="100" textAnchor="middle" fontSize="11" fill="#16a34a">
                    Pos. a: &#8960;{result.positiveA.phi}mm c/{result.positiveA.spacing}cm
                  </text>
                )}
                {result.positiveB.phi > 0 && (
                  <text x="250" y="120" textAnchor="middle" fontSize="11" fill="#16a34a">
                    Pos. b: &#8960;{result.positiveB.phi}mm c/{result.positiveB.spacing}cm
                  </text>
                )}

                {/* Negative reinforcement info */}
                {result.negativeA.phi > 0 && (
                  <text x="250" y="200" textAnchor="middle" fontSize="11" fill="#dc2626">
                    Neg. a: &#8960;{result.negativeA.phi}mm c/{result.negativeA.spacing}cm
                  </text>
                )}
                {result.negativeB.phi > 0 && (
                  <text x="250" y="220" textAnchor="middle" fontSize="11" fill="#dc2626">
                    Neg. b: &#8960;{result.negativeB.phi}mm c/{result.negativeB.spacing}cm
                  </text>
                )}

                {/* Classification */}
                <text x="250" y="40" textAnchor="middle" fontSize="12" fill="#64748b">
                  {result.classification} - Caso {input.caso} - fck {input.fck}MPa
                </text>

                {/* Cobrimento */}
                <text x="250" y="330" textAnchor="middle" fontSize="11" fill="#64748b">
                  Cobrimento: {result.cobrimento} cm | fcd = {result.fcd.toFixed(4)} kN/cm2 | fyd = {result.fyd.toFixed(2)} kN/cm2
                </text>

                {/* Arrow marker def */}
                <defs>
                  <marker id="arrow" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                    <path d="M 0 0 L 10 5 L 0 10 z" fill="#64748b" />
                  </marker>
                </defs>
              </svg>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setActiveTab('input')}
              className="px-6 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Voltar aos Dados
            </button>
            <button
              onClick={() => window.print()}
              className="px-6 py-2 text-sm bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors"
            >
              Imprimir Resultado
            </button>
            {!result.approved && (
              <button
                onClick={() => {
                  updateInput('h', input.h + 0.01)
                  setActiveTab('input')
                }}
                className="px-6 py-2 text-sm bg-amber-500 text-white rounded-lg hover:bg-amber-600 transition-colors"
              >
                Aumentar h em 1cm e Recalcular
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
