/**
 * Root App shell.
 *
 * Sprint 1 routes: Home / Registration / Weigh-ins.
 * Registration & Weigh-ins are guarded by `RequireMeet` — if no meet is open,
 * user is redirected to Home.
 */

import { MantineProvider, AppShell, Group, Text, Badge } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { ModalsProvider } from "@mantine/modals";
import { useTranslation } from "react-i18next";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  useLocation,
} from "react-router-dom";

import { theme } from "./theme";
import { Home } from "@pages/home/Home";
import { RegistrationPage } from "@pages/registration/RegistrationPage";
import { WeighInsPage } from "@pages/weigh-ins/WeighInsPage";
import { JudgingPage } from "@pages/judging/JudgingPage";
import { RequireMeet } from "@components/RequireMeet";
import { useAppSelector } from "@store/index";

function NavLinks() {
  const { t } = useTranslation();
  const meet = useAppSelector((s) => s.meet.current);
  const location = useLocation();
  const items = [
    { to: "/", label: t("nav.home"), needsMeet: false },
    { to: "/registration", label: t("nav.registration"), needsMeet: true },
    { to: "/weigh-ins", label: t("nav.weighIns"), needsMeet: true },
    { to: "/judging", label: t("nav.judging"), needsMeet: true },
  ];
  return (
    <Group gap="md">
      {items.map((it) => {
        const disabled = it.needsMeet && !meet;
        const active = location.pathname === it.to;
        return (
          <NavLink
            key={it.to}
            to={it.to}
            style={{
              textDecoration: "none",
              color: disabled
                ? "var(--mantine-color-dimmed)"
                : active
                  ? "var(--mantine-color-blue-6)"
                  : "inherit",
              fontWeight: active ? 600 : 400,
              pointerEvents: disabled ? "none" : "auto",
              opacity: disabled ? 0.5 : 1,
            }}
          >
            {it.label}
          </NavLink>
        );
      })}
    </Group>
  );
}

export function App() {
  const { t, i18n } = useTranslation();

  return (
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <ModalsProvider>
        <Notifications position="top-right" />
        <BrowserRouter>
          <AppShell header={{ height: 56 }} padding="md">
            <AppShell.Header>
              <Group h="100%" px="md" justify="space-between">
                <Group gap="sm">
                  <Text fw={700} size="lg">
                    {t("app.name")}
                  </Text>
                  <Badge color="red" variant="light">
                    ISF v5.1
                  </Badge>
                  <Badge color="violet" variant="light">
                    v0.2.0-dev
                  </Badge>
                  <NavLinks />
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

            <AppShell.Main>
              <Routes>
                <Route path="/" element={<Home />} />
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
              </Routes>
            </AppShell.Main>
          </AppShell>
        </BrowserRouter>
      </ModalsProvider>
    </MantineProvider>
  );
}
