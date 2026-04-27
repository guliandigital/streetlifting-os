/**
 * Single editable bodyweight / reweigh cell with 0.1 kg precision (ISF v5.1 §7.2).
 *
 * Tab/Enter navigation works naturally because we render a real <NumberInput>
 * in every cell — the browser handles focus order.
 */

import { useEffect, useState } from "react";
import { NumberInput } from "@mantine/core";

export type WeighInCellProps = {
  value: number | null;
  disabled?: boolean;
  onCommit: (value: number | null) => void;
  onTab?: () => void;
  ariaLabel?: string;
};

export function WeighInCell(props: WeighInCellProps) {
  const { value, disabled, onCommit, ariaLabel } = props;
  const [localValue, setLocalValue] = useState<number | "">(value ?? "");

  useEffect(() => {
    setLocalValue(value ?? "");
  }, [value]);

  function commit() {
    const next = typeof localValue === "number" ? localValue : null;
    if (next === value) return;
    onCommit(next);
  }

  return (
    <NumberInput
      aria-label={ariaLabel}
      disabled={disabled}
      value={localValue}
      decimalScale={2}
      step={0.1}
      min={0}
      hideControls
      w={100}
      onChange={(v) =>
        setLocalValue(
          typeof v === "number" && Number.isFinite(v) ? v : "",
        )
      }
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          (e.target as HTMLInputElement).blur();
        }
      }}
    />
  );
}
