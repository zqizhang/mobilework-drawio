// "OpenWork Models" startup promo: one-shot dialog latch shown shortly after
// a workspace is ready when the user has no OpenWork Models provider yet.
// Extracted verbatim from session-route.tsx.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { isWebDeployment } from "@/app/lib/openwork-deployment";
import { useDenAuth } from "@/react-app/domains/cloud/den-auth-provider";
import type { DenAuthStatus } from "@/react-app/domains/cloud/den-auth-provider";
import { usePlatform } from "@/react-app/kernel/platform";
import { useShellConfig } from "@/react-app/shell/shell-config";
import { workspaceSettingsRoute } from "@/react-app/shell/workspace-routes";
import {
  getOpenWorkModelsActionUrl,
  hasOpenWorkModelsProvider,
  hideOpenWorkModelsPromo,
  useOpenWorkModelsPromoEligibility,
  isOpenWorkModelsPromoHidden,
  markOpenWorkModelsStartupPromoShown,
  openWorkModelsPromoChangedEvent,
  wasOpenWorkModelsStartupPromoShown,
} from "./openwork-models-promo";

export type UseOpenWorkModelsStartupPromoInput = {
  /** True once the workspace's opencode client exists. */
  clientReady: boolean;
  workspaceId: string;
  providerConnectedIds: string[];
  /** Org member already has OpenWork Models on Den — never upsell Subscribe. */
  openWorkModelsEntitled?: boolean;
};

export type OpenWorkModelsStartupPromoScheduleInput = {
  openWorkModelsPromoEligible: boolean;
  webDeployment: boolean;
  cloudSignin: boolean;
  promoHidden: boolean;
  hasOpenWorkModels: boolean;
  openWorkModelsEntitled: boolean;
  denAuthStatus: DenAuthStatus;
  clientReady: boolean;
  workspaceId: string;
  startupPromoShown: () => boolean;
  startupPromoScheduled: boolean;
};

export function shouldScheduleOpenWorkModelsStartupPromo(input: OpenWorkModelsStartupPromoScheduleInput) {
  if (!input.openWorkModelsPromoEligible || input.webDeployment) return false;
  if (!input.cloudSignin || input.promoHidden || input.hasOpenWorkModels || input.openWorkModelsEntitled) return false;
  if (input.denAuthStatus === "checking" || !input.clientReady || !input.workspaceId) return false;
  return !input.startupPromoShown() && !input.startupPromoScheduled;
}

export function useOpenWorkModelsStartupPromo(input: UseOpenWorkModelsStartupPromoInput) {
  const { clientReady, workspaceId, providerConnectedIds, openWorkModelsEntitled = false } = input;
  const navigate = useNavigate();
  const platform = usePlatform();
  const denAuth = useDenAuth();
  const { config: shellConfig } = useShellConfig();
  const openWorkModelsPromoEligible = useOpenWorkModelsPromoEligibility();

  const [open, setOpen] = useState(false);
  const [promoHidden, setPromoHidden] = useState(isOpenWorkModelsPromoHidden);
  const scheduledRef = useRef(false);

  useEffect(() => {
    const handlePromoChanged = () => setPromoHidden(isOpenWorkModelsPromoHidden());
    window.addEventListener(openWorkModelsPromoChangedEvent, handlePromoChanged);
    return () => window.removeEventListener(openWorkModelsPromoChangedEvent, handlePromoChanged);
  }, []);

  const hasOpenWorkModels = useMemo(
    () => hasOpenWorkModelsProvider(providerConnectedIds),
    [providerConnectedIds],
  );

  useEffect(() => {
    const webDeployment = isWebDeployment();
    if (!shouldScheduleOpenWorkModelsStartupPromo({
      openWorkModelsPromoEligible,
      webDeployment,
      cloudSignin: shellConfig.cloudSignin,
      promoHidden,
      hasOpenWorkModels,
      openWorkModelsEntitled,
      denAuthStatus: denAuth.status,
      clientReady,
      workspaceId,
      startupPromoShown: wasOpenWorkModelsStartupPromoShown,
      startupPromoScheduled: scheduledRef.current,
    })) {
      if (openWorkModelsPromoEligible && !webDeployment) return;
      setOpen(false);
      return;
    }

    scheduledRef.current = true;
    const timeout = window.setTimeout(() => {
      markOpenWorkModelsStartupPromoShown();
      setOpen(true);
    }, 900);
    return () => window.clearTimeout(timeout);
  }, [clientReady, denAuth.status, hasOpenWorkModels, openWorkModelsEntitled, openWorkModelsPromoEligible, promoHidden, shellConfig.cloudSignin, workspaceId]);

  const subscribe = useCallback(() => {
    setOpen(false);
    markOpenWorkModelsStartupPromoShown();
    if (!denAuth.isSignedIn) {
      navigate(workspaceId ? workspaceSettingsRoute(workspaceId, "cloud-account") : "/settings/cloud-account");
    }
    window.setTimeout(() => {
      platform.openLink(getOpenWorkModelsActionUrl(denAuth.isSignedIn));
    }, 0);
  }, [denAuth.isSignedIn, navigate, platform, workspaceId]);

  const continueWithout = useCallback(() => {
    setOpen(false);
    markOpenWorkModelsStartupPromoShown();
    hideOpenWorkModelsPromo();
    setPromoHidden(true);
  }, []);

  return { open, subscribe, continueWithout };
}
