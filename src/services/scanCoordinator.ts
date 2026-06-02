export interface SingleFlightState {
  currentScan?: Promise<void>;
}

export async function runSingleFlightScan(
  state: SingleFlightState,
  run: () => Promise<void>,
  onReuse?: () => void
): Promise<void> {
  if (state.currentScan) {
    onReuse?.();
    return state.currentScan;
  }

  const current = run().finally(() => {
    if (state.currentScan === current) {
      state.currentScan = undefined;
    }
  });
  state.currentScan = current;
  return current;
}
