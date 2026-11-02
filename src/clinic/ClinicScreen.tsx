// The clinic: arrival → triage → the care steps this visit needs (fixed order) → go home →
// recovery room → back to the title. A row of step icons shows progress; Home is always there.
// There is nothing to fail: every phase finishes by itself, by progress, or with the done heart.
import { useCallback, useEffect, useMemo, useReducer, useState, type ReactElement } from 'react';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { hush } from '../audio/speak';
import { randomSeed } from '../logic/rng';
import type { AccessoryId, DamageKind, PlushSpec } from '../plush/types';
import HomeButton from '../ui/HomeButton';
import { useLayout } from '../ui/theme';
import { flowReducer, initialFlow, type FlowEvent, type FlowState } from './flow';
import { CLINIC_PLUSH_RECT, sceneLayout } from './helpers';
import { Arrival, GoHome, Triage } from './phases';
import RecoveryRoom from './RecoveryRoom';
import { addRepair, type Repair } from './snap';
import BrushStep from './steps/BrushStep';
import DressStep from './steps/DressStep';
import PatchStep from './steps/PatchStep';
import RestuffStep from './steps/RestuffStep';
import StitchStep from './steps/StitchStep';
import type { StepProps } from './steps/types';
import WashStep from './steps/WashStep';
import StepIcons from './ui/StepIcons';
import { ALL_DAMAGE, createVisit, type AgeBand, type StepKind, type Visit } from './visit';

export { CLINIC_PLUSH_RECT };


/** Every care step, and the damage kinds visits use (all of them). */
export const STEP_COMPONENTS: Partial<Record<StepKind, (p: StepProps) => ReactElement | null>> = {
  stitch: StitchStep,
  patch: PatchStep,
  stuff: RestuffStep,
  wash: WashStep,
  brush: BrushStep,
  dress: DressStep,
};
export const CLINIC_KINDS: readonly DamageKind[] = ALL_DAMAGE;

interface Props {
  spec: PlushSpec;
  age?: AgeBand;
  seed?: number;
  onExit: () => void;
  /** Replaces the recovery room (tests). */
  renderRecovery?: (visit: Visit, onDone: () => void) => ReactElement;
}

export default function ClinicScreen({ spec, age = '3-5', seed, onExit, renderRecovery }: Props) {
  const visit = useMemo(() => createVisit(spec, seed ?? randomSeed(), { age, kinds: CLINIC_KINDS }), [spec, seed, age]);
  const [flow, dispatch] = useReducer((s: FlowState, e: FlowEvent) => flowReducer(visit, s, e), initialFlow);
  const { width, height } = useLayout();
  const insets = useSafeAreaInsets();
  const layout = useMemo(() => sceneLayout(width, height, CLINIC_PLUSH_RECT), [width, height]);
  // What changes on the plushie during the visit: repairs stay on; Dress sets what it wears.
  const [repairs, setRepairs] = useState<Repair[]>([]);
  const [outfit, setOutfit] = useState<AccessoryId[] | null>(null);
  const current = useMemo<PlushSpec>(() => (outfit ? { ...visit.plush, accessories: outfit } : visit.plush), [visit.plush, outfit]);
  const onRepair = useCallback((r: Repair) => setRepairs((list) => addRepair(list, r)), []);

  useEffect(() => () => hush(), []);
  const stepDone = useCallback(() => dispatch({ type: 'stepDone' }), []);
  const arrived = useCallback(() => dispatch({ type: 'arrived' }), []);
  const spotTapped = useCallback((id: string) => dispatch({ type: 'spotTapped', id }), []);
  const triageDone = useCallback(() => dispatch({ type: 'triageDone' }), []);
  const homeDone = useCallback(() => dispatch({ type: 'homeDone' }), []);
  const recoveryDone = useCallback(() => dispatch({ type: 'recoveryDone' }), []);

  useEffect(() => {
    if (flow.phase === 'finished') onExit();
  }, [flow.phase, onExit]);

  // A step with no screen yet is passed over (never a dead end).
  const missingStep = flow.phase === 'care' && !STEP_COMPONENTS[visit.steps[flow.step]];
  useEffect(() => {
    if (missingStep) stepDone();
  }, [missingStep, stepDone, flow.step]);
  let body: ReactElement | null = null;
  switch (flow.phase) {
    case 'arrival':
      body = <Arrival visit={visit} layout={layout} onArrived={arrived} />;
      break;
    case 'triage':
      body = <Triage visit={visit} layout={layout} found={flow.found} onSpot={spotTapped} onDone={triageDone} />;
      break;
    case 'care': {
      const kind = visit.steps[flow.step];
      const Step = STEP_COMPONENTS[kind];
      body = Step ? <Step key={`${kind}-${flow.step}`} visit={visit} layout={layout} onDone={stepDone} spec={current} repairs={repairs} onRepair={onRepair} onOutfit={setOutfit} /> : null;
      break;
    }
    case 'gohome':
      body = <GoHome visit={visit} layout={layout} onDone={homeDone} spec={current} repairs={repairs} />;
      break;
    case 'recovery':
      body = renderRecovery ? renderRecovery(visit, recoveryDone) : <RecoveryRoom spec={current} repairs={repairs} onDone={recoveryDone} />;
      break;
    default:
      body = null;
  }

  return (
    <View style={styles.root} testID="clinic-screen">
      {body}
      {flow.phase === 'care' || flow.phase === 'gohome' ? (
        <View style={[styles.icons, { top: insets.top + 12 }]} pointerEvents="none">
          <StepIcons steps={visit.steps} current={flow.phase === 'care' ? flow.step : -1} done={flow.done} />
        </View>
      ) : null}
      <View style={[styles.home, { top: insets.top + 12, left: insets.left + 12 }]}>
        <HomeButton onHome={onExit} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#E8F4EE' },
  icons: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  home: { position: 'absolute' },
});
