import type { AccessoryId, PlushSpec } from '../../plush/types';
import type { SceneLayout } from '../helpers';
import type { Repair } from '../snap';
import type { Visit } from '../visit';

/** What every care step gets. */
export interface StepProps {
  visit: Visit;
  layout: SceneLayout;
  /** The step is finished (always reachable: progress, auto-finish or the done heart). */
  onDone: () => void;
  /** The plushie as it is now (with whatever it's wearing). */
  spec: PlushSpec;
  /** Repairs so far (patches and sewn rips stay on for the rest of the visit). */
  repairs: readonly Repair[];
  onRepair: (r: Repair) => void;
  /** Dress: what the plushie wears from now on. */
  onOutfit: (worn: AccessoryId[]) => void;
}
