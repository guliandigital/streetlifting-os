/**
 * JudgeVoteCard — Sprint 2 Classic judging.
 *
 * Renders two large buttons (Good Lift / No Lift) for one judge position.
 * Shows the current vote state and provides a reset link.
 */

import { Group, Button, Text, Stack, Anchor } from "@mantine/core";
import { useTranslation } from "react-i18next";

type Props = {
  judgeLabel: string;
  vote: boolean | null;
  onVote: (value: boolean) => void;
  onReset: () => void;
};

export function JudgeVoteCard({ judgeLabel, vote, onVote, onReset }: Props) {
  const { t } = useTranslation();

  return (
    <Stack gap="xs" align="center" style={{ minWidth: 120 }}>
      <Text size="sm" fw={600} c="dimmed">
        {judgeLabel}
      </Text>

      <Group gap="xs">
        <Button
          size="sm"
          color="green"
          variant={vote === true ? "filled" : "outline"}
          onClick={() => onVote(true)}
          aria-label={`${judgeLabel} ${t("judging.votes.goodLift")}`}
          style={{ fontWeight: 700 }}
        >
          ✓
        </Button>
        <Button
          size="sm"
          color="red"
          variant={vote === false ? "filled" : "outline"}
          onClick={() => onVote(false)}
          aria-label={`${judgeLabel} ${t("judging.votes.noLift")}`}
          style={{ fontWeight: 700 }}
        >
          ✗
        </Button>
      </Group>

      {vote !== null && (
        <Anchor
          size="xs"
          c="dimmed"
          onClick={onReset}
          style={{ cursor: "pointer" }}
        >
          {t("judging.votes.reset")}
        </Anchor>
      )}
    </Stack>
  );
}
