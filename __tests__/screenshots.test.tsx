// P3-C: the Dev screen's screenshot helper stages 5 scenes and cycles through them.
import { fireEvent, render, screen } from '@testing-library/react-native';

import ScreenshotScreen, { SCENES } from '../src/screens/ScreenshotScreen';

beforeEach(() => jest.useFakeTimers());
afterEach(() => jest.useRealTimers());

it('stages 5 scenes for App Store screenshots and cycles through them', async () => {
  expect(SCENES.map((s) => s.id)).toEqual(['title', 'clinic', 'studio', 'showcase', 'recovery']);
  const onBack = jest.fn();
  await render(<ScreenshotScreen onBack={onBack} />);
  for (const s of [...SCENES.slice(1), SCENES[0]]) {
    await fireEvent.press(screen.getByTestId('shot-next'));
    expect(screen.getByTestId(`screenshot-${s.id}`)).toBeTruthy();
  }
  await fireEvent.press(screen.getByTestId('shot-close'));
  expect(onBack).toHaveBeenCalled();
});
