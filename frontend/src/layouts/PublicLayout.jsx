import React, { Suspense, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { MotionConfig } from "framer-motion";
import PublicNavbar from "../components/public/PublicNavbar";
import PublicFooter from "../components/public/PublicFooter";
import { LoadingBlock } from "../components/ui";

/**
 * Shell of the public product site (/, /features, /portals, /tour, /contact): navbar,
 * page, footer. Pages load lazily inside it, so the navbar never flickers.
 * MotionConfig honours the visitor's "reduce motion" setting for every animation.
 */
const ScrollManager = () => {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, left: 0 });
      return undefined;
    }
    // The page may still be loading: look for the target for up to ~2 s.
    let frame;
    let tries = 0;
    const find = () => {
      const target = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
      else if (tries++ < 120) frame = requestAnimationFrame(find);
    };
    find();
    return () => cancelAnimationFrame(frame);
  }, [pathname, hash]);

  return null;
};

const PublicLayout = () => (
  <MotionConfig reducedMotion="user">
    <div className="flex min-h-dvh flex-col bg-white">
      <a
        href="#main"
        className="sr-only z-50 rounded-lg bg-brand-600 px-4 py-2 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Skip to content
      </a>
      <ScrollManager />
      <PublicNavbar />
      <main id="main" className="flex-1">
        <Suspense
          fallback={
            <div className="flex min-h-[60dvh] items-center justify-center">
              <LoadingBlock text="" />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
      <PublicFooter />
    </div>
  </MotionConfig>
);

export default PublicLayout;
