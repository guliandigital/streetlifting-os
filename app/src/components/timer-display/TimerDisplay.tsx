/**
 * TimerDisplay — Sprint 2 Classic judging.
 *
 * Circular RingProgress countdown timer with color-coded states:
 *   - >20 s  → green
 *   - 10–20 s → orange
 *   - <10 s  → red
 */

import { RingProgress, Text, Stack, Center } from "@mantine/core";

type Props = {
  secondsLeft: number;
  totalSeconds: number;
  running: boolean;
};

function colorFor(secondsLeft: number): string {
  if (secondsLeft > 20) return "green";
  if (secondsLeft > 10) return "orange";
  return "red";
}

export function TimerDisplay({ secondsLeft, totalSeconds, running }: Props) {
  const safeTotal = totalSeconds > 0 ? totalSeconds : 60;
  const pct = Math.round((secondsLeft / safeTotal) * 100);
  const color = colorFor(secondsLeft);

  return (
    <Stack align="center" gap="xs">
      <RingProgress
        size={120}
        thickness={10}
        sections={[{ value: pct, color }]}
        label={
          <Center>
            <Text
              size="xl"
              fw={700}
              c={running ? color : "dimmed"}
              style={{ fontVariantNumeric: "tabular-nums" }}
            >
              {secondsLeft}
            </Text>
          </Center>
        }
      />
    </Stack>
  );
}
