import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { subscribeReviews } from "../lib/reviews-api.js";
import {
  applySeoMeta,
  buildSeoGraphJsonLd,
  injectJsonLd,
  parseLocalePath,
} from "../lib/seo.js";

const SEO_SCROLL_PATHS = {
  "/barcos-alquiler": "fleet",
  "/charter-palma": "policy",
  "/tarifas": "fleet",
  "/alquiler-barco-mallorca": "fleet",
};

/**
 * Keeps title/meta/canonical and LocalBusiness JSON-LD in sync with language,
 * friendly URLs and live review aggregates.
 */
export function SeoManager({ lang, contact }) {
  const { pathname } = useLocation();
  const [reviewRows, setReviewRows] = useState([]);

  useEffect(() => subscribeReviews(setReviewRows), []);

  const reviewStats = useMemo(() => {
    if (!reviewRows.length) return { count: 0, average: 0 };
    const sum = reviewRows.reduce((a, x) => a + (Number(x.rating) || 0), 0);
    return {
      count: reviewRows.length,
      average: Math.round((sum / reviewRows.length) * 10) / 10,
    };
  }, [reviewRows]);

  useEffect(() => {
    applySeoMeta(lang, pathname);
    document.getElementById("seo-prerender")?.remove();
  }, [lang, pathname]);

  useEffect(() => {
    const { basePath } = parseLocalePath(pathname);
    const sectionId = SEO_SCROLL_PATHS[basePath];
    if (!sectionId) return undefined;
    const t = window.setTimeout(() => {
      document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 120);
    return () => window.clearTimeout(t);
  }, [pathname]);

  useEffect(() => {
    injectJsonLd(
      "miy-localbusiness-jsonld",
      buildSeoGraphJsonLd({
        contact: {
          email: contact?.email,
          whatsapp: contact?.whatsapp,
          telephone: contact?.whatsapp,
        },
        reviewStats,
        lang,
        pathname,
      }),
    );
  }, [contact?.email, contact?.whatsapp, reviewStats.count, reviewStats.average, lang, pathname]);

  return null;
}
