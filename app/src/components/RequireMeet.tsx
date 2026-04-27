/**
 * Route guard — pages requiring an open meet redirect to Home if `meet.current === null`.
 */

import { useTranslation } from "react-i18next";
import { Navigate } from "react-router-dom";
import { useAppSelector } from "@store/index";

export function RequireMeet({ children }: { children: React.ReactNode }) {
  const meet = useAppSelector((s) => s.meet.current);
  const { t } = useTranslation();
  if (!meet) {
    // Surface a transient toast via a redirect with state if desired; for V1
    // we simply send the operator back to Home where they can open a meet.
    void t; // keep i18n hook used for future inline messaging
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}
