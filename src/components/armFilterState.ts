import { createContext, useContext } from 'react'
import type { Arm } from '../engine/armFilter.ts'

export interface ArmFilter {
  /** The arm being highlighted, or null for everything. Always null during a guided tour. */
  arm: Arm | null
  /** The visitor's choice, kept even while a tour suspends it. */
  chosen: Arm | null
  setArm: (arm: Arm | null) => void
}

export const ArmFilterContext = createContext<ArmFilter>({ arm: null, chosen: null, setArm: () => {} })

export const useArmFilter = () => useContext(ArmFilterContext)
