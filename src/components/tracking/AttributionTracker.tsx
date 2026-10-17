"use client";

import { useEffect } from "react";
import { captureAttribution } from "@/lib/tracking/attribution";

/**
 * Silent client component to capture marketing attribution, UTMs, and referral parameters on page load.
 */
export function AttributionTracker() {
  useEffect(() => {
    captureAttribution();
  }, []);

  return null;
}
