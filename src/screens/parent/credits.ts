// The Credits page, in its fixed order (parent area only): the verse, the blessing, the team, then
// the art and audio credits from assets/CREDITS.md (including the Kokoro af_bella voice).
import { CREDIT_ROWS, type CreditRow } from '../../config/credits.generated';

export const VERSE = {
  text: 'And be ye kind one to another, tenderhearted, forgiving one another, even as God for Christ’s sake hath forgiven you.',
  reference: 'Ephesians 4:32 (KJV)',
};

export const BLESSING = 'Thanking Our Lord and Savior Jesus Christ for the ample blessings he has bestowed.';

export const TEAM = ['Made by DesMacApps', 'Design and direction: Mike U', 'Art: the Art Director for Mike U (DesMacApps), original and code-drawn', 'Voice: Bella'];

export type CreditBlock = { kind: 'verse'; text: string; reference: string } | { kind: 'blessing'; text: string } | { kind: 'team'; lines: readonly string[] } | { kind: 'credit'; row: CreditRow };

/** The page, top to bottom. */
export function creditBlocks(): CreditBlock[] {
  return [{ kind: 'verse', ...VERSE }, { kind: 'blessing', text: BLESSING }, { kind: 'team', lines: TEAM }, ...CREDIT_ROWS.map((row) => ({ kind: 'credit' as const, row }))];
}
