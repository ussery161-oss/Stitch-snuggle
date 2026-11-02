import type { SceneLayout } from '../helpers';
import type { Visit } from '../visit';

/** What every care step gets. */
export interface StepProps {
  visit: Visit;
  layout: SceneLayout;
  /** The step is finished (always reachable: progress, auto-finish or the done heart). */
  onDone: () => void;
}
