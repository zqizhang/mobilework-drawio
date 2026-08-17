declare const afterEach: (fn: () => void | Promise<void>) => void;
declare const describe: (name: string, fn: () => void) => void;
declare const test: (name: string, fn: () => void | Promise<void>) => void;
declare const expect: (value: unknown) => {
  toBe: (expected: unknown) => void;
};

import { DEFAULT_DEN_BASE_URL, HOSTED_DEFAULT_DEN_BASE_URL, setDenBootstrapConfig } from "../../../app/lib/den";
import { OPENWORK_DEPLOYMENT_ENV_VAR, isWebDeployment } from "../../../app/lib/openwork-deployment";
import {
  hasOpenWorkModelsAvailable,
  isOpenWorkModelsPromoEligible,
  isOpenWorkModelsPromoEligibleForDenBaseUrl,
  shouldShowOpenWorkModelsPromo,
  wasOpenWorkModelsStartupPromoShown,
} from "./openwork-models-promo";
import {
  type OpenWorkModelsStartupPromoScheduleInput,
  shouldScheduleOpenWorkModelsStartupPromo,
} from "./use-openwork-models-startup-promo";

afterEach(async () => {
  await setDenBootstrapConfig({ baseUrl: DEFAULT_DEN_BASE_URL, requireSignin: false });
});

function withOpenWorkDeployment(value: string, run: () => void) {
  const previous = process.env[OPENWORK_DEPLOYMENT_ENV_VAR];
  process.env[OPENWORK_DEPLOYMENT_ENV_VAR] = value;
  try {
    run();
  } finally {
    if (previous === undefined) {
      delete process.env[OPENWORK_DEPLOYMENT_ENV_VAR];
    } else {
      process.env[OPENWORK_DEPLOYMENT_ENV_VAR] = previous;
    }
  }
}

function startupPromoReadyInput(): OpenWorkModelsStartupPromoScheduleInput {
  return {
    openWorkModelsPromoEligible: true,
    webDeployment: isWebDeployment(),
    cloudSignin: true,
    promoHidden: false,
    hasOpenWorkModels: false,
    openWorkModelsEntitled: false,
    denAuthStatus: "signed_out",
    clientReady: true,
    workspaceId: "workspace-1",
    startupPromoShown: () => false,
    startupPromoScheduled: false,
  };
}

describe("OpenWork Models promo eligibility", () => {
  test("allows promotions on the default Den URL after normalization", () => {
    expect(isOpenWorkModelsPromoEligibleForDenBaseUrl(`${HOSTED_DEFAULT_DEN_BASE_URL}/api/den/`)).toBe(true);
  });

  test("suppresses promotions for custom configured Den URLs", async () => {
    await setDenBootstrapConfig({ baseUrl: "https://custom-den.example.com", requireSignin: false });

    expect(isOpenWorkModelsPromoEligible()).toBe(false);
    expect(shouldShowOpenWorkModelsPromo()).toBe(false);
    expect(wasOpenWorkModelsStartupPromoShown()).toBe(true);
  });
});

describe("OpenWork Models startup promo", () => {
  test("stays closed in web deployment and opens on desktop under the same conditions", () => {
    withOpenWorkDeployment("web", () => {
      expect(shouldScheduleOpenWorkModelsStartupPromo(startupPromoReadyInput())).toBe(false);
    });

    withOpenWorkDeployment("desktop", () => {
      expect(shouldScheduleOpenWorkModelsStartupPromo(startupPromoReadyInput())).toBe(true);
    });
  });
});

describe("hasOpenWorkModelsAvailable", () => {
  test("requires a connected openwork provider with at least one model", () => {
    expect(
      hasOpenWorkModelsAvailable({
        providerConnectedIds: ["openwork"],
        providers: [{ id: "openwork", models: {} }],
      }),
    ).toBe(false);
    expect(
      hasOpenWorkModelsAvailable({
        providerConnectedIds: ["openwork"],
        providers: [{ id: "openwork", models: { "gpt-5": {} } }],
      }),
    ).toBe(true);
  });
});
