/**
 * AboutPage — application overview, version, what's new, keyboard shortcuts,
 * correctness facts, and legal notice.
 */

import {
  Container,
  Stack,
  Title,
  Text,
  Card,
  Table,
  Badge,
  Anchor,
  Group,
  Divider,
  List,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { APP_RELEASE_VERSION } from "@/persistence";

const ISF_RULES_VERSION = "v5.1 (effective 2025-08-01)";

const RELEASE_DATE = "2026-04-30";

export function AboutPage() {
  const { t } = useTranslation();

  return (
    <Container size="md" py="xl">
      <Stack gap="lg">
        {/* Title + version badges */}
        <Stack gap="xs">
          <Title order={1}>{t("about.title")}</Title>
          <Group gap="sm">
            <Badge color="violet" variant="light" size="lg">
              {t("about.version")}: {APP_RELEASE_VERSION}
            </Badge>
            <Badge color="red" variant="light" size="lg">
              {t("about.rules")}: {ISF_RULES_VERSION}
            </Badge>
            <Badge color="gray" variant="light" size="lg">
              {RELEASE_DATE}
            </Badge>
          </Group>
        </Stack>

        {/* What's new */}
        <Card withBorder shadow="sm">
          <Stack gap="sm">
            <Title order={3}>{t("about.whatsNew.title")}</Title>
            <Text size="sm" c="dimmed">
              {t("about.whatsNew.subtitle")}
            </Text>
            <List spacing="xs" size="sm">
              <List.Item>{t("about.whatsNew.schedule")}</List.Item>
              <List.Item>{t("about.whatsNew.awardsParity")}</List.Item>
              <List.Item>{t("about.whatsNew.voiceAnnouncer")}</List.Item>
              <List.Item>{t("about.whatsNew.broadcastSync")}</List.Item>
              <List.Item>{t("about.whatsNew.duplicateDetection")}</List.Item>
              <List.Item>{t("about.whatsNew.csvExports")}</List.Item>
              <List.Item>{t("about.whatsNew.readiness")}</List.Item>
            </List>
          </Stack>
        </Card>

        {/* Calculation correctness */}
        <Card withBorder shadow="sm">
          <Stack gap="sm">
            <Title order={3}>{t("about.correctness.title")}</Title>
            <List spacing="xs" size="sm">
              <List.Item>{t("about.correctness.m6")}</List.Item>
              <List.Item>{t("about.correctness.boundary")}</List.Item>
              <List.Item>{t("about.correctness.addpts")}</List.Item>
              <List.Item>{t("about.correctness.coef")}</List.Item>
            </List>
          </Stack>
        </Card>

        {/* Keyboard shortcuts */}
        <Card withBorder shadow="sm">
          <Stack gap="sm">
            <Title order={3}>{t("about.shortcuts.title")}</Title>
            <Text size="xs" c="dimmed" fw={600}>
              {t("about.shortcuts.judgingHeader")}
            </Text>
            <Table striped highlightOnHover withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Key</Table.Th>
                  <Table.Th>Action</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td><Text ff="monospace">Q</Text></Table.Td>
                  <Table.Td>{t("about.shortcuts.leftGood")}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Text ff="monospace">A</Text></Table.Td>
                  <Table.Td>{t("about.shortcuts.leftNo")}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Text ff="monospace">W</Text></Table.Td>
                  <Table.Td>{t("about.shortcuts.centerGood")}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Text ff="monospace">S</Text></Table.Td>
                  <Table.Td>{t("about.shortcuts.centerNo")}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Text ff="monospace">E</Text></Table.Td>
                  <Table.Td>{t("about.shortcuts.rightGood")}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Text ff="monospace">D</Text></Table.Td>
                  <Table.Td>{t("about.shortcuts.rightNo")}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Text ff="monospace">Space</Text></Table.Td>
                  <Table.Td>{t("about.shortcuts.confirm")}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Text ff="monospace">Esc</Text></Table.Td>
                  <Table.Td>{t("about.shortcuts.clear")}</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>

            <Text size="xs" c="dimmed" fw={600} mt="sm">
              {t("about.shortcuts.awardsHeader")}
            </Text>
            <Table striped highlightOnHover withTableBorder withColumnBorders>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Key</Table.Th>
                  <Table.Th>Action</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                <Table.Tr>
                  <Table.Td><Text ff="monospace">F</Text></Table.Td>
                  <Table.Td>{t("about.shortcuts.awardsFullscreen")}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Text ff="monospace">←  /  →</Text></Table.Td>
                  <Table.Td>{t("about.shortcuts.awardsPrevNext")}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Text ff="monospace">Space</Text></Table.Td>
                  <Table.Td>{t("about.shortcuts.awardsAdvance")}</Table.Td>
                </Table.Tr>
                <Table.Tr>
                  <Table.Td><Text ff="monospace">Esc</Text></Table.Td>
                  <Table.Td>{t("about.shortcuts.awardsExitFullscreen")}</Table.Td>
                </Table.Tr>
              </Table.Tbody>
            </Table>
          </Stack>
        </Card>

        {/* Links */}
        <Card withBorder shadow="sm">
          <Stack gap="xs">
            <Title order={4}>Links</Title>
            <Group gap="md">
              <Anchor
                href="https://github.com/guliandigital/streetlifting-os"
                target="_blank"
                rel="noopener noreferrer"
              >
                GitHub Repository
              </Anchor>
              <Anchor
                href="https://github.com/guliandigital/streetlifting-os/releases/latest"
                target="_blank"
                rel="noopener noreferrer"
              >
                Latest release
              </Anchor>
              <Anchor
                href="https://isfederation.org"
                target="_blank"
                rel="noopener noreferrer"
              >
                ISF Website
              </Anchor>
              <Anchor href="/scoreboard" target="_blank" rel="noopener noreferrer">
                📺 {t("scoreboard.openScoreboard")}
              </Anchor>
            </Group>
          </Stack>
        </Card>

        <Divider />

        {/* Legal */}
        <Text size="xs" c="dimmed">
          {t("about.legal")}
        </Text>

        <Text size="xs" c="dimmed">
          © 2026 Gulyan Digital · Streetlifting OS v{APP_RELEASE_VERSION}
        </Text>
      </Stack>
    </Container>
  );
}

export default AboutPage;
