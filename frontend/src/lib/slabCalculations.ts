// Calculation engine for solid concrete slabs (Lajes Maciças)
// Based on NBR 6118:2014 - Brazilian Standard for Concrete Structures

// ─── Types ───────────────────────────────────────────────────────────────────

export type AggregateType = 'basalto' | 'granito' | 'calcario' | 'arenito'

export type SupportCase = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9

export type AggressivenessClass = 1 | 2 | 3 | 4

export type VariableLoadType =
  | 'residencial'
  | 'servico'
  | 'corredor_residencial'
  | 'corredor_nao_residencial'

export interface PermanentLoads {
  laje: boolean        // Slab self-weight (25 kN/m³)
  contraPiso: boolean  // Sub-floor (21 kN/m³ * 0.01m)
  argamassa: boolean   // Mortar (21 kN/m³ * 0.01m)
  reboco: boolean      // Plaster (0.2 kN/m²)
  ceramico: boolean    // Ceramic floor (0.85 kN/m²)
  taco: boolean        // Wood floor (0.7 kN/m²)
  forroFalso: boolean  // False ceiling (0.5 kN/m²)
  gesso: boolean       // Plaster ceiling (0.13 kN/m²)
  enchimento: boolean  // Fill (14 kN/m³)
  paredeA: boolean     // Wall in direction a
  paredeB: boolean     // Wall in direction b
}

export interface WallData {
  La: number  // Wall length in direction a (m)
  Lb: number  // Wall length in direction b (m)
  bLinha: number  // Wall thickness (m)
  hLinha: number  // Wall height (m)
  hEstrela: number // Fill height (m)
}

export interface SlabInput {
  a: number            // Shorter span (m)
  b: number            // Longer span (m)
  h: number            // Slab thickness (m)
  caso: SupportCase    // Support case (1-9)
  fck: number          // Characteristic concrete strength (MPa)
  fyk: number          // Characteristic steel strength (kN/cm²)
  agregado: AggregateType
  classeAgressividade: AggressivenessClass
  cargas: PermanentLoads
  cargaVariavel: VariableLoadType
  parede: WallData
}

export interface ReinforcementResult {
  As: number
  AsMin: number
  phi: number
  spacing: number
}

export interface SlabResult {
  // Classification
  ba_ratio: number
  ab_ratio: number
  direction: 1 | 2
  classification: 'Isótropa' | 'Ortótropa' | 'Normal' | 'Balanço'
  approved: boolean

  // Material properties
  cobrimento: number
  alphaC: number
  fcd: number
  fyd: number
  alphaE: number

  // Step 1: Load composition
  gSuperficial: number
  q: number
  p0: number
  pdServ: number

  // Wall loads
  Pa: number
  Pb: number
  alpha_load: number
  beta_load: number
  pEstrela: number

  // Step 2: Modulus of elasticity
  alphaI: number
  Eci: number
  Ecs: number

  // Step 3: Tensile strength
  fctm: number
  fctm_kNcm2: number

  // Step 4: Cracking moment
  mr: number
  mr_kNm: number

  // Step 5: Service moment
  alpha_moment: number
  ma: number
  K_flecha: number

  // Step 6: Moment of inertia
  maLeqMr: boolean
  Ieq: number

  // Step 7: Short-term deflection
  f_t0: number

  // Step 8: Long-term deflection
  alphaF: number
  f_tInf: number

  // Step 9: Allowable deflection
  fAdm: number
  deflectionOk: boolean

  // Step 10: Moments
  ar: number
  br_star: number
  mv_a: number
  mv_b: number
  me_a: number
  me_b: number

  // Neutral axis
  d_pos: number
  d_neg: number
  md_a: number
  md_b: number
  xa: number
  xb: number
  xa_neg: number
  xb_neg: number
  neutralAxisOk_pos: boolean
  neutralAxisOk_neg: boolean

  // Step 11: Positive steel area
  positiveA: ReinforcementResult
  positiveB: ReinforcementResult

  // Step 12: Negative steel area
  negativeA: ReinforcementResult
  negativeB: ReinforcementResult

  // Orthotropy coefficient
  phi_ortho: number
}

// ─── Constants ───────────────────────────────────────────────────────────────

const AGGREGATE_ALPHA: Record<AggregateType, number> = {
  basalto: 1.2,
  granito: 1.0,
  calcario: 0.9,
  arenito: 0.7,
}

const COVER_BY_CLASS: Record<AggressivenessClass, number> = {
  1: 2.0,
  2: 2.5,
  3: 3.5,
  4: 4.5,
}

const VARIABLE_LOADS: Record<VariableLoadType, number> = {
  residencial: 1.5,
  servico: 2.0,
  corredor_residencial: 3.0,
  corredor_nao_residencial: 5.0,
}

// ─── Reinforcement Area Table ────────────────────────────────────────────────
// Areas per meter (cm²/m) for different bar diameters and spacings

const BAR_DIAMETERS = [4.2, 4.6, 5, 5.5, 6, 6.3, 6.4, 7, 8, 9.5, 10, 12.5]
const SPACINGS = [10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25]

function getReinforcementArea(phi: number, spacing: number): number {
  const area = (Math.PI * (phi / 10) ** 2 / 4) * (100 / spacing)
  return Math.round(area * 100) / 100
}

export function findReinforcement(
  asRequired: number,
  type: 'positive' | 'negative' | 'distribution'
): ReinforcementResult {
  if (asRequired <= 0) {
    return { As: 0, AsMin: 0, phi: 0, spacing: 0 }
  }

  let minSpacing: number, maxSpacing: number, minPhi: number
  if (type === 'positive') {
    minSpacing = 10; maxSpacing = 15; minPhi = 4.2
  } else if (type === 'negative') {
    minSpacing = 15; maxSpacing = 20; minPhi = 5
  } else {
    minSpacing = 21; maxSpacing = 25; minPhi = 5
  }

  let bestPhi = 0, bestSpacing = 0, bestArea = Infinity
  for (const phi of BAR_DIAMETERS) {
    if (phi < minPhi) continue
    for (const s of SPACINGS) {
      if (s < minSpacing || s > maxSpacing) continue
      const area = getReinforcementArea(phi, s)
      if (area >= asRequired && area < bestArea) {
        bestArea = area
        bestPhi = phi
        bestSpacing = s
      }
    }
  }

  if (bestPhi === 0) {
    // Fallback: use largest diameter with smallest spacing
    bestPhi = BAR_DIAMETERS[BAR_DIAMETERS.length - 1]
    bestSpacing = minSpacing
    bestArea = getReinforcementArea(bestPhi, bestSpacing)
  }

  return {
    As: asRequired,
    AsMin: 0,
    phi: bestPhi,
    spacing: bestSpacing,
  }
}

// ─── Support case engagement factors ─────────────────────────────────────────
// I1 = top side of b, I2 = right side of a, I3 = bottom side of b, I4 = left side of a
// 0 = simply supported, 1.5 = fixed

interface EngagementFactors {
  I1: number; I2: number; I3: number; I4: number
}

function getEngagementFactors(caso: SupportCase): EngagementFactors {
  const cases: Record<SupportCase, EngagementFactors> = {
    1: { I1: 0, I2: 0, I3: 0, I4: 0 },
    2: { I1: 0, I2: 0, I3: 0, I4: 1.5 },
    3: { I1: 0, I2: 1.5, I3: 0, I4: 0 },
    4: { I1: 0, I2: 1.5, I3: 0, I4: 1.5 },
    5: { I1: 1.5, I2: 0, I3: 1.5, I4: 0 },
    6: { I1: 0, I2: 0, I3: 1.5, I4: 1.5 },
    7: { I1: 1.5, I2: 0, I3: 1.5, I4: 1.5 },
    8: { I1: 0, I2: 1.5, I3: 1.5, I4: 1.5 },
    9: { I1: 1.5, I2: 1.5, I3: 1.5, I4: 1.5 },
  }
  return cases[caso]
}

// ─── Alpha & K tables for two-way slabs ──────────────────────────────────────

// Alpha (moment coefficient) and K (deflection coefficient) tables
// indexed by [case][ab_ratio_range]
// ab_ratio ranges: <=0.5, 0.5-0.6, 0.6-0.7, 0.7-0.8, 0.8-0.9, 0.9-1.0

type RatioRange = '0.5' | '0.6' | '0.7' | '0.8' | '0.9' | '1.0'

function getRatioRange(ab: number): RatioRange {
  if (ab <= 0.5) return '0.5'
  if (ab <= 0.6) return '0.6'
  if (ab <= 0.7) return '0.7'
  if (ab <= 0.8) return '0.8'
  if (ab <= 0.9) return '0.9'
  return '1.0'
}

const ALPHA_TABLE: Record<number, Record<RatioRange, number>> = {
  1: { '0.5': 0.099, '0.6': 0.086, '0.7': 0.073, '0.8': 0.061, '0.9': 0.051, '1.0': 0.042 },
  2: { '0.5': 0.091, '0.6': 0.075, '0.7': 0.060, '0.8': 0.048, '0.9': 0.037, '1.0': 0.030 },
  3: { '0.5': 0.060, '0.6': 0.056, '0.7': 0.051, '0.8': 0.046, '0.9': 0.040, '1.0': 0.036 },
  4: { '0.5': 0.057, '0.6': 0.052, '0.7': 0.045, '0.8': 0.039, '0.9': 0.033, '1.0': 0.027 },
  5: { '0.5': 0.084, '0.6': 0.065, '0.7': 0.049, '0.8': 0.037, '0.9': 0.027, '1.0': 0.020 },
  6: { '0.5': 0.042, '0.6': 0.041, '0.7': 0.039, '0.8': 0.037, '0.9': 0.034, '1.0': 0.031 },
  7: { '0.5': 0.055, '0.6': 0.048, '0.7': 0.040, '0.8': 0.033, '0.9': 0.026, '1.0': 0.021 },
  8: { '0.5': 0.042, '0.6': 0.040, '0.7': 0.037, '0.8': 0.033, '0.9': 0.029, '1.0': 0.026 },
  9: { '0.5': 0.041, '0.6': 0.038, '0.7': 0.034, '0.8': 0.029, '0.9': 0.025, '1.0': 0.021 },
}

const K_TABLE: Record<number, Record<RatioRange, number>> = {
  1: { '0.5': 0.99, '0.6': 0.85, '0.7': 0.71, '0.8': 0.59, '0.9': 0.48, '1.0': 0.40 },
  2: { '0.5': 0.91, '0.6': 0.73, '0.7': 0.58, '0.8': 0.46, '0.9': 0.35, '1.0': 0.28 },
  3: { '0.5': 0.48, '0.6': 0.44, '0.7': 0.41, '0.8': 0.36, '0.9': 0.31, '1.0': 0.28 },
  4: { '0.5': 0.46, '0.6': 0.41, '0.7': 0.36, '0.8': 0.30, '0.9': 0.25, '1.0': 0.21 },
  5: { '0.5': 0.83, '0.6': 0.63, '0.7': 0.48, '0.8': 0.35, '0.9': 0.26, '1.0': 0.19 },
  6: { '0.5': 0.25, '0.6': 0.25, '0.7': 0.24, '0.8': 0.23, '0.9': 0.21, '1.0': 0.19 },
  7: { '0.5': 0.44, '0.6': 0.38, '0.7': 0.32, '0.8': 0.25, '0.9': 0.20, '1.0': 0.16 },
  8: { '0.5': 0.24, '0.6': 0.24, '0.7': 0.23, '0.8': 0.20, '0.9': 0.18, '1.0': 0.16 },
  9: { '0.5': 0.25, '0.6': 0.23, '0.7': 0.21, '0.8': 0.18, '0.9': 0.15, '1.0': 0.13 },
}

// K for one-way slabs
const K_ONE_WAY: Record<1 | 2 | 3, number> = {
  1: 1.30,
  2: 0.53,
  3: 0.26,
}

// ─── Negative moment factors ─────────────────────────────────────────────────
// Factor for me = factor * m (positive moment)
// me,a = I2_factor * ma, me,b = I3_factor * mb (for direction a/b engagement)

// ─── Main Calculation Function ───────────────────────────────────────────────

export function calculateSlab(input: SlabInput): SlabResult {
  const { a, b, h, caso, fck, fyk, agregado, classeAgressividade, cargas, cargaVariavel, parede } = input

  // ─── Classification ──────────────────────────────────────────────────────
  const ba_ratio = b / a
  const ab_ratio = a / b
  const direction: 1 | 2 = ba_ratio > 2 ? 1 : 2
  const isBalanco = direction === 1 && caso === 4

  let classification: 'Isótropa' | 'Ortótropa' | 'Normal' | 'Balanço'
  if (direction === 1 && caso === 4) {
    classification = 'Balanço'
  } else if (direction === 1) {
    classification = 'Normal'
  } else if (ab_ratio >= 0.8 && ab_ratio <= 1) {
    classification = 'Isótropa'
  } else {
    classification = 'Ortótropa'
  }

  // ─── Material Properties ─────────────────────────────────────────────────
  const cobrimento = COVER_BY_CLASS[classeAgressividade]
  const alphaC = fck <= 50 ? 0.85 : 0.85 * (1 - (fck - 50) / 200)
  const fcd = fck / 10 / 1.4  // kN/cm²
  const fyd_calc = fyk / 1.15  // kN/cm²
  const alphaE = AGGREGATE_ALPHA[agregado]
  const bw = 100  // cm (per meter width)
  const lambda = fck <= 50 ? 0.8 : 0.8  // simplification

  // ─── Step 1: Load Composition ────────────────────────────────────────────
  const h_slab_kNm2 = cargas.laje ? h * 25 : 0
  const contraPiso_kNm2 = cargas.contraPiso ? 0.01 * 21 : 0
  const argamassa_kNm2 = cargas.argamassa ? 0.01 * 21 : 0
  const reboco_kNm2 = cargas.reboco ? 0.20 : 0
  const ceramico_kNm2 = cargas.ceramico ? 0.85 : 0
  const taco_kNm2 = cargas.taco ? 0.70 : 0
  const forroFalso_kNm2 = cargas.forroFalso ? 0.50 : 0
  const gesso_kNm2 = cargas.gesso ? 0.13 : 0
  const enchimento_kNm2 = cargas.enchimento ? 14 * parede.hEstrela : 0

  // Wall linear loads
  const paredeA_kNm2 = cargas.paredeA ? (parede.bLinha * parede.hLinha * 13) / a : 0
  const paredeB_kNm2 = cargas.paredeB ? (parede.bLinha * parede.hLinha * 13) / b : 0

  const gSuperficial =
    h_slab_kNm2 + contraPiso_kNm2 + argamassa_kNm2 + reboco_kNm2 +
    ceramico_kNm2 + taco_kNm2 + forroFalso_kNm2 + gesso_kNm2 +
    enchimento_kNm2 + paredeA_kNm2 + paredeB_kNm2

  const q = VARIABLE_LOADS[cargaVariavel]
  const p0 = gSuperficial + q  // Surface load (kN/m²)

  // Service load: Pd,serv = Σg + ψ2*q (ψ2 = 0.3 for residential)
  const pdServ = gSuperficial + 0.3 * q

  // Wall linear loads (kN/m)
  const Pa = cargas.paredeA && parede.La > 0 ? parede.bLinha * parede.hLinha * 13 : 0
  const Pb = cargas.paredeB && parede.Lb > 0 ? parede.bLinha * parede.hLinha * 13 : 0

  // Load coefficients for linear loads
  const alpha_load = direction === 2 && Pa > 0 ? Pa / (p0 * b) : 0
  const beta_load = Pb > 0 ? Pb / (p0 * a) : 0

  // Equivalent load with linear loads
  const pEstrela = p0 * (1 + alpha_load + 2 * beta_load)

  // ─── Orthotropy coefficient ──────────────────────────────────────────────
  const eng = getEngagementFactors(caso)
  let phi_ortho = 1
  if (classification === 'Ortótropa') {
    const numerator = 12 - eng.I2 - eng.I4
    const denominator = 12 - eng.I1 - eng.I3
    phi_ortho = (numerator / denominator) * Math.pow(ab_ratio, 1.7)
  }

  // ─── Step 2: Modulus of Elasticity ───────────────────────────────────────
  const alphaI = Math.min(0.8 + 0.2 * fck / 80, 1)
  let Eci: number
  if (fck <= 50) {
    Eci = alphaE * 5600 * Math.sqrt(fck)
  } else {
    Eci = 21.5e3 * alphaE * Math.pow(fck / 10 + 1.25, 1 / 3)
  }
  const Ecs = alphaI * Eci  // MPa

  // ─── Step 3: Tensile Strength ────────────────────────────────────────────
  let fctm: number
  if (fck <= 50) {
    fctm = 0.3 * Math.pow(fck, 2 / 3)
  } else {
    fctm = 2.12 * Math.log(1 + 0.11 * fck)
  }
  const fctm_kNcm2 = fctm / 10  // Convert MPa to kN/cm²

  // ─── Step 4: Cracking Moment ─────────────────────────────────────────────
  const h_cm = h * 100
  const mr = 0.25 * fctm_kNcm2 * bw * h_cm * h_cm  // kN.cm/m
  const mr_kNm = mr / 100  // kN.m/m

  // ─── Step 5: Service Moment ──────────────────────────────────────────────
  let alpha_moment = 0
  let K_flecha = 0

  if (direction === 2) {
    // Two-way slab: use alpha table
    const range = getRatioRange(ab_ratio)
    alpha_moment = ALPHA_TABLE[caso]?.[range] ?? 0.042
    K_flecha = K_TABLE[caso]?.[range] ?? 0.40
  } else if (!isBalanco) {
    // One-way slab
    if (caso === 1) {
      alpha_moment = 0   // Will use formula directly
      K_flecha = K_ONE_WAY[1]
    } else if (caso === 2) {
      alpha_moment = 0
      K_flecha = K_ONE_WAY[2]
    } else if (caso === 3) {
      alpha_moment = 0
      K_flecha = K_ONE_WAY[3]
    }
  } else {
    // Cantilever
    K_flecha = 12.5
  }

  // Service moment
  let ma: number
  if (direction === 2) {
    ma = alpha_moment * pdServ * a * a
  } else if (!isBalanco) {
    if (caso === 1) {
      ma = (pdServ * a * a) / 8
    } else if (caso === 2) {
      ma = (9 * pdServ * a * a) / 128
    } else if (caso === 3) {
      ma = (pdServ * a * a) / 24
    } else {
      ma = alpha_moment * pdServ * a * a
    }
  } else {
    // Cantilever
    ma = (pdServ * a * a) / 2
  }

  // ─── Step 6: Moment of Inertia ──────────────────────────────────────────
  const maLeqMr = ma <= mr_kNm
  let Ieq: number
  if (maLeqMr) {
    Ieq = (bw * Math.pow(h_cm, 3)) / 12  // cm⁴
  } else {
    Ieq = 0.30 * (bw * Math.pow(h_cm, 3)) / 12
  }

  // ─── Step 7: Short-term Deflection ───────────────────────────────────────
  const pdServ_kNcm = pdServ / 10000  // kN/cm²
  const Ecs_kNcm2 = Ecs / 10  // MPa to kN/cm²

  let f_t0: number
  if (direction === 2 || !isBalanco) {
    f_t0 = (K_flecha * pdServ_kNcm * Math.pow(a * 100, 4)) / (Ecs_kNcm2 * Ieq)
  } else {
    // Cantilever - different formula
    f_t0 = (K_flecha * pdServ_kNcm * Math.pow(a * 100, 4)) / (Ecs_kNcm2 * Ieq)
  }

  // ─── Step 8: Long-term Deflection ───────────────────────────────────────
  const alphaF = 1.32  // Long-term factor
  const f_tInf = (1 + alphaF) * f_t0  // cm

  // ─── Step 9: Allowable Deflection ────────────────────────────────────────
  let fAdm: number
  if (isBalanco) {
    fAdm = (2 * a / 250) * 100  // cm
  } else {
    fAdm = (a / 250) * 100  // cm
  }
  const deflectionOk = f_tInf < fAdm

  // ─── Step 10: Moment Calculations ────────────────────────────────────────
  // Reduced spans (ar, br*)
  let ar = 0, br_star = 0

  if (direction === 2) {
    // Two-way slab: reduced spans
    ar = (2 * a) / (Math.sqrt(1 + eng.I2) + Math.sqrt(1 + eng.I4))

    if (classification === 'Isótropa') {
      br_star = (2 * b) / (Math.sqrt(1 + eng.I1) + Math.sqrt(1 + eng.I3))
    } else {
      // Orthotropic
      br_star = (1 / Math.sqrt(phi_ortho)) *
        Math.sqrt((1 + alpha_load + 2 * beta_load) / (1 + 3 * beta_load)) *
        ((2 * b) / (Math.sqrt(1 + eng.I1) + Math.sqrt(1 + eng.I3)))
    }
  }

  // Positive moments
  let mv_a = 0, mv_b = 0
  const loadForMoments = pEstrela

  if (direction === 2) {
    mv_a = (loadForMoments * ar * br_star) /
      (8 * (1 + (ar / br_star) + (br_star / ar)))
    mv_b = phi_ortho * mv_a
  } else if (!isBalanco) {
    // One-way slab: moment depends on support case
    if (caso === 1) {
      mv_a = (p0 * a * a) / 8
    } else if (caso === 2) {
      mv_a = (9 * p0 * a * a) / 128
    } else if (caso === 3) {
      mv_a = (p0 * a * a) / 24
    }
    mv_b = 0
  } else {
    mv_a = (p0 * a * a) / 2
    mv_b = 0
  }

  // Negative moments
  let me_a = 0, me_b = 0

  if (direction === 2) {
    // Negative moment in direction a: based on engagement
    if (eng.I2 > 0 || eng.I4 > 0) {
      me_a = 0
      if (eng.I2 > 0) me_a = -1.5 * mv_a
      if (eng.I4 > 0 && me_a === 0) me_a = -1.5 * mv_a
    }
    // Negative moment in direction b
    if (eng.I1 > 0 || eng.I3 > 0) {
      me_b = -1.5 * mv_b
    }
  } else if (!isBalanco) {
    // One-way: negative moments based on support case
    if (caso === 2) {
      me_a = -(p0 * a * a) / 8.88
    } else if (caso === 3) {
      me_a = -(3 * p0 * a * a) / 40
    }
  }

  // ─── Neutral Axis ────────────────────────────────────────────────────────
  const d_pos = h_cm - cobrimento - 0.5  // Effective depth positive (cm)
  const d_neg = h_cm - cobrimento - 0.5  // Effective depth negative (cm)
  const d_prime = h_cm - cobrimento - 1   // For orthotropic direction b

  // Design moments (multiply by 1.4)
  const md_a = mv_a * 1.4
  const md_b = mv_b * 1.4
  const md_neg_a = me_a !== 0 ? Math.abs(me_a) * 1.4 : 0
  const md_neg_b = me_b !== 0 ? Math.abs(me_b) * 1.4 : 0

  // Neutral axis position
  let xa = 0, xb = 0, xa_neg = 0, xb_neg = 0

  if (md_a > 0 && d_pos > 0) {
    const term = 1 - (2 * md_a * 100) / (alphaC * fcd * bw * d_pos * d_pos)
    if (term >= 0) {
      xa = (d_pos / lambda) * (1 - Math.sqrt(term))
    }
  }

  if (md_b > 0 && d_prime > 0) {
    const term = 1 - (2 * md_b * 100) / (alphaC * fcd * bw * d_prime * d_prime)
    if (term >= 0) {
      xb = (d_prime / lambda) * (1 - Math.sqrt(term))
    }
  }

  if (md_neg_a > 0 && d_neg > 0) {
    const term = 1 - (2 * md_neg_a * 100) / (alphaC * fcd * bw * d_neg * d_neg)
    if (term >= 0) {
      xa_neg = (d_neg / lambda) * (1 - Math.sqrt(term))
    }
  }

  if (md_neg_b > 0 && d_neg > 0) {
    const term = 1 - (2 * md_neg_b * 100) / (alphaC * fcd * bw * d_neg * d_neg)
    if (term >= 0) {
      xb_neg = (d_neg / lambda) * (1 - Math.sqrt(term))
    }
  }

  // Verify x/d ratio
  const limit = fck <= 50 ? 0.25 : 0.15
  const neutralAxisOk_pos = d_pos > 0 ? (xa / d_pos <= limit) : true
  const neutralAxisOk_neg = d_neg > 0 ? (xa_neg / d_neg <= limit) : true

  // ─── Step 11: Positive Steel Area ────────────────────────────────────────
  let AsA = 0, AsAmin = 0
  if (xa > 0) {
    AsA = Math.ceil((alphaC * lambda * fcd * bw * xa / fyd_calc) * 100) / 100
  }
  if (direction === 2 || classification === 'Normal') {
    AsAmin = 0.67 * 0.15 * h_cm * bw / 100  // Convert to cm²/m
  }

  let AsB = 0, AsBmin = 0
  if (classification === 'Ortótropa' && xb > 0) {
    AsB = alphaC * lambda * fcd * bw * xb / fyd_calc
  } else if (classification === 'Normal' || classification === 'Isótropa') {
    // Distribution steel: min of As/5 or AsMin/2
    const ratio = Math.max(AsA / 5, AsAmin / 2)
    AsB = Math.max(ratio, 0.93)  // Minimum 0.93 cm²/m
  }
  if (classification === 'Ortótropa') {
    AsBmin = 0.67 * 0.15 * bw * h_cm / 100
  }

  const posA_required = Math.max(AsA, AsAmin)
  const posB_required = Math.max(AsB, AsBmin)

  const positiveA = findReinforcement(posA_required, 'positive')
  positiveA.AsMin = AsAmin

  const positiveB = classification === 'Ortótropa'
    ? findReinforcement(posB_required, 'positive')
    : findReinforcement(posB_required, 'distribution')
  positiveB.AsMin = AsBmin

  // ─── Step 12: Negative Steel Area ────────────────────────────────────────
  let AsNegA = 0, AsNegAmin = 0
  if (xa_neg > 0) {
    AsNegA = Math.ceil((alphaC * lambda * fcd * bw * xa_neg / fyd_calc) * 100) / 100
  }
  if (AsNegA > 0) {
    AsNegAmin = 0.15 * bw * h_cm / 100
  }

  let AsNegB = 0, AsNegBmin = 0
  if (xb_neg > 0) {
    AsNegB = alphaC * lambda * fcd * bw * xb_neg / fyd_calc
  }
  if (AsNegB > 0 || (direction === 2 && me_b !== 0)) {
    AsNegBmin = 0.15 * bw * h_cm / 100
  }

  const negA_required = Math.max(AsNegA, AsNegAmin)
  const negB_required = Math.max(AsNegB, AsNegBmin)

  const negativeA = findReinforcement(negA_required, 'negative')
  negativeA.AsMin = AsNegAmin

  const negativeB = findReinforcement(negB_required, 'negative')
  negativeB.AsMin = AsNegBmin

  // ─── Approval Check ─────────────────────────────────────────────────────
  const approved = deflectionOk

  return {
    ba_ratio,
    ab_ratio,
    direction,
    classification,
    approved,
    cobrimento,
    alphaC,
    fcd,
    fyd: fyd_calc,
    alphaE,
    gSuperficial,
    q,
    p0,
    pdServ,
    Pa,
    Pb,
    alpha_load,
    beta_load,
    pEstrela,
    alphaI,
    Eci,
    Ecs,
    fctm,
    fctm_kNcm2,
    mr,
    mr_kNm,
    alpha_moment,
    ma,
    K_flecha,
    maLeqMr,
    Ieq,
    f_t0,
    alphaF,
    f_tInf,
    fAdm,
    deflectionOk,
    ar,
    br_star,
    mv_a,
    mv_b,
    me_a,
    me_b,
    d_pos,
    d_neg,
    md_a,
    md_b,
    xa,
    xb,
    xa_neg,
    xb_neg,
    neutralAxisOk_pos,
    neutralAxisOk_neg,
    positiveA,
    positiveB,
    negativeA,
    negativeB,
    phi_ortho,
  }
}

// ─── Support case descriptions ───────────────────────────────────────────────

export const SUPPORT_CASE_DESCRIPTIONS: Record<SupportCase, string> = {
  1: 'Apoiado nos 4 lados',
  2: 'Engastado em 1 lado menor (esquerdo)',
  3: 'Engastado em 1 lado maior (superior)',
  4: 'Engastado em 2 lados opostos (esq. + dir.)',
  5: 'Engastado em 2 lados opostos (sup. + inf.)',
  6: 'Engastado em 2 lados adjacentes (esq. + inf.)',
  7: 'Engastado em 3 lados (esq. + sup. + inf.)',
  8: 'Engastado em 3 lados (dir. + sup. + inf.)',
  9: 'Engastado nos 4 lados',
}

export const ONE_WAY_CASE_DESCRIPTIONS: Record<number, string> = {
  1: 'Apoiado-Apoiado',
  2: 'Apoiado-Engastado',
  3: 'Engastado-Engastado',
  4: 'Balanço (engastado em 1 lado)',
}
