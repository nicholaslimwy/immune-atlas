import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { useLocation } from 'react-router'
import { type Arm, loadArm, saveArm } from '../engine/armFilter.ts'
import { ArmFilterContext } from './armFilterState.ts'

/** Holds the chosen arm, remembers it in localStorage and hands it to scenes, the network and search. */
export function ArmFilterProvider({ children }: { children: ReactNode }) {
  const [chosen, setChosen] = useState<Arm | null>(loadArm)
  const setArm = useCallback((arm: Arm | null) => {
    setChosen(arm)
    saveArm(arm)
  }, [])
  // A tour points at specific cells itself, so the filter waits outside it.
  const inTour = useLocation().pathname.startsWith('/tours')
  const value = useMemo(() => ({ arm: inTour ? null : chosen, chosen, setArm }), [inTour, chosen, setArm])
  return <ArmFilterContext.Provider value={value}>{children}</ArmFilterContext.Provider>
}
