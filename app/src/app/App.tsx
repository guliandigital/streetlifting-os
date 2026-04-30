/**
 * Root App shell — Sprint 5.
 *
 * Navigation moved from cramped header links to a left sidebar (AppShell.Navbar).
 * Header retains: app name, ISF badge, version badge, language toggle, mobile hamburger.
 * Sidebar: 8 nav items + About; disabled (opacity 0.4) when no meet open.
 */

import { useState } from "react";
import {
  MantineProvider,
  AppShell,
  Group,
  Text,
  Badge,
  Burger,
  NavLink,
  Stack,
  Divider,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { ModalsProvider } from "@mantine/modals";
import { useTranslation } from "react-i18next";
import {
  BrowserRouter,
  Routes,
  Route,
  useLocation,
  useNavigate,
} from "react-router-dom";

import { theme } from "./theme";
import { Home } from "@pages/home/Home";
import { AboutPage } from "@pages/about/AboutPage";
import { RegistrationPage } from "@pages/registration/RegistrationPage";
import { WeighInsPage } from "@pages/weigh-ins/WeighInsPage";
import { JudgingPage } from "@pages/judging/JudgingPage";
import { ResultsPage } from "@pages/results/ResultsPage";
import { RecordsPage } from "@pages/records/RecordsPage";
import { MeetSetupPage } from "@pages/meet-setup/MeetSetupPage";
import { FlightOrderPage } from "@pages/flight-order/FlightOrderPage";
import { ScoreboardPage } from "@pages/scoreboard/ScoreboardPage";
import { PrintPage } from "@pages/print/PrintPage";
import { AwardsCeremonyPage } from "@pages/awards/AwardsCeremonyPage";
import { ReadinessPage } from "@pages/readiness/ReadinessPage";
import { SchedulePage } from "@pages/schedule/SchedulePage";
import {
  DisplayBroadcastPage,
  DisplayOrderPage,
  DisplayPlatesPage,
  DisplayTimerPage,
} from "@pages/display/DisplayPages";
import { DisplayAwardsPage } from "@pages/display/DisplayAwardsPage";
import { BrandLogo } from "@components/BrandLogo";
import { RequireMeet } from "@components/RequireMeet";
import { useAppSelector } from "@store/index";
import { APP_RELEASE_VERSION } from "@/persistence";

const APP_VERSION = APP_RELEASE_VERSION;

// ─── Sidebar navigation ───────────────────────────────────────────────────────

interface SidebarNavProps {
  onNavigate?: () => void;
}

function SidebarNav({ onNavigate }: SidebarNavProps) {
  const { t } = useTranslation();
  const meet = useAppSelector((s) => s.meet.current);
  const location = useLocation();
  const navigate = useNavigate();

  const mainItems = [
    { to: "/", label: t("nav.home"), emoji: "🏠", needsMeet: false },
    { to: "/meet-setup", label: t("nav.meetSetup"), emoji: "⚙️", needsMeet: true },
    { to: "/registration", label: t("nav.registration"), emoji: "📋", needsMeet: true },
    { to: "/weigh-ins", label: t("nav.weighIns"), emoji: "⚖️", needsMeet: true },
    { to: "/flight-order", label: t("nav.flightOrder"), emoji: "📊", needsMeet: true },
    { to: "/schedule", label: t("nav.schedule"), emoji: "📅", needsMeet: true },
    { to: "/readiness", label: t("nav.readiness"), emoji: "✅", needsMeet: true },
    { to: "/judging", label: t("nav.judging"), emoji: "🏋️", needsMeet: true },
    { to: "/results", label: t("nav.results"), emoji: "🏆", needsMeet: true },
    { to: "/records", label: t("nav.records"), emoji: "🏅", needsMeet: true },
    { to: "/scoreboard", label: t("nav.scoreboard"), emoji: "📺", needsMeet: false },
    { to: "/print", label: t("nav.print"), emoji: "🖨️", needsMeet: true },
    { to: "/awards", label: t("nav.awards"), emoji: "🏅", needsMeet: true },
  ];

  const bottomItems = [
    { to: "/about", label: t("nav.about"), emoji: "ℹ️", needsMeet: false },
  ];

  function renderItem(it: { to: string; label: string; emoji: string; needsMeet: boolean }) {
    const disabled = it.needsMeet && !meet;
    const active = location.pathname === it.to;

    return (
      <NavLink
        key={it.to}
        label={`${it.emoji} ${it.label}`}
        active={active}
        disabled={disabled}
        onClick={() => {
          if (!disabled) {
            void navigate(it.to);
            onNavigate?.();
          }
        }}
        style={{
          opacity: disabled ? 0.4 : 1,
          pointerEvents: disabled ? "none" : "auto",
          borderRadius: "var(--mantine-radius-sm)",
        }}
        styles={{
          root: {
            ...(active && {
              backgroundColor: "var(--mantine-color-red-6)",
              color: "white",
            }),
          },
        }}
      />
    );
  }

  return (
    <Stack gap={2} p="xs" h="100%">
      {mainItems.map(renderItem)}
      <Divider my="xs" />
      {bottomItems.map(renderItem)}
    </Stack>
  );
}

// ─── App shell ────────────────────────────────────────────────────────────────

function AppWithRouter() {
  const { i18n } = useTranslation();
  const [opened, setOpened] = useState(false);
  const location = useLocation();

  if (location.pathname.startsWith("/display/")) {
    return (
      <Routes>
        <Route path="/display/scoreboard" element={<ScoreboardPage />} />
        <Route path="/display/order" element={<DisplayOrderPage />} />
        <Route path="/display/timer" element={<DisplayTimerPage />} />
        <Route path="/display/plates" element={<DisplayPlatesPage />} />
        <Route path="/display/broadcast" element={<DisplayBroadcastPage />} />
        <Route path="/display/awards" element={<DisplayAwardsPage />} />
      </Routes>
    );
  }

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{ width: 200, breakpoint: "sm", collapsed: { mobile: !opened } }}
      padding="md"
    >
      {/* Header */}
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger
              opened={opened}
              onClick={() => setOpened((o) => !o)}
              hiddenFrom="sm"
              size="sm"
            />
            <BrandLogo h={28} w={174} visibleFrom="xs" />
            <BrandLogo h={30} w={30} variant="symbol" hiddenFrom="xs" />
            <Badge color="red" variant="light">
              ISF v5.1
            </Badge>
            <Badge color="violet" variant="light">
              v{APP_VERSION}
            </Badge>
          </Group>
          <Group gap="sm">
            <Text
              size="xs"
              c="dimmed"
              style={{ cursor: "pointer" }}
              onClick={() =>
                void i18n.changeLanguage(
                  i18n.language === "ru-RU" ? "en-US" : "ru-RU",
                )
              }
            >
              {i18n.language === "ru-RU" ? "EN" : "RU"}
            </Text>
          </Group>
        </Group>
      </AppShell.Header>

      {/* Sidebar */}
      <AppShell.Navbar>
        <SidebarNav onNavigate={() => setOpened(false)} />
      </AppShell.Navbar>

      {/* Main content */}
      <AppShell.Main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<AboutPage />} />
          <Route
            path="/registration"
            element={
              <RequireMeet>
                <RegistrationPage />
              </RequireMeet>
            }
          />
          <Route
            path="/weigh-ins"
            element={
              <RequireMeet>
                <WeighInsPage />
              </RequireMeet>
            }
          />
          <Route
            path="/judging"
            element={
              <RequireMeet>
                <JudgingPage />
              </RequireMeet>
            }
          />
          <Route
            path="/results"
            element={
              <RequireMeet>
                <ResultsPage />
              </RequireMeet>
            }
          />
          <Route
            path="/records"
            element={
              <RequireMeet>
                <RecordsPage />
              </RequireMeet>
            }
          />
          <Route
            path="/meet-setup"
            element={
              <RequireMeet>
                <MeetSetupPage />
              </RequireMeet>
            }
          />
          <Route
            path="/flight-order"
            element={
              <RequireMeet>
                <FlightOrderPage />
              </RequireMeet>
            }
          />
          <Route
            path="/schedule"
            element={
              <RequireMeet>
                <SchedulePage />
              </RequireMeet>
            }
          />
          <Route
            path="/readiness"
            element={
              <RequireMeet>
                <ReadinessPage />
              </RequireMeet>
            }
          />
          <Route path="/scoreboard" element={<ScoreboardPage />} />
          <Route
            path="/print"
            element={
              <RequireMeet>
                <PrintPage />
              </RequireMeet>
            }
          />
          <Route
            path="/awards"
            element={
              <RequireMeet>
                <AwardsCeremonyPage />
              </RequireMeet>
            }
          />
        </Routes>
      </AppShell.Main>
    </AppShell>
  );
}

export function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <ModalsProvider>
        <Notifications position="top-right" />
        <BrowserRouter>
          <AppWithRouter />
        </BrowserRouter>
      </ModalsProvider>
    </MantineProvider>
  );
}
