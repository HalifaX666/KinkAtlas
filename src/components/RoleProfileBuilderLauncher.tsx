import { lazy, Suspense, useEffect, useRef, useState, type MouseEvent } from "react";
import type { EditableRoleProfileEntry } from "../engine/roleProfileOptimizer";
import type { AssessmentAnswers, RoleResult } from "../types";

const LazyRoleProfileBuilder = lazy(async () => {
  const module = await import("./RoleProfileBuilder");
  return { default: module.RoleProfileBuilder };
});

export function RoleProfileBuilderLauncher({ roleResults, refinementAnswers, discoveryAnswers, onRoleSetChange }: { roleResults: RoleResult[]; refinementAnswers: AssessmentAnswers["refinement"]; discoveryAnswers: AssessmentAnswers["discovery"]; onRoleSetChange: (roles: EditableRoleProfileEntry[]) => void }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(
    () => () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    },
    [],
  );

  const toggleDisclosure = (event: MouseEvent<HTMLElement>) => {
    event.preventDefault();
    if (isClosing) {
      if (closeTimer.current) clearTimeout(closeTimer.current);
      setIsClosing(false);
      setIsOpen(true);
      return;
    }
    if (isOpen) {
      setIsClosing(true);
      closeTimer.current = setTimeout(() => {
        setIsOpen(false);
        setIsClosing(false);
      }, 260);
      return;
    }
    setIsOpen(true);
  };

  return (
    <section className="section page-width profile-builder-section" aria-labelledby="profile-builder-heading">
      <span className="eyebrow">02 · Your role set</span>
      <details className="profile-builder-disclosure" open={isOpen || isClosing} data-closing={isClosing || undefined}>
        <summary onClick={toggleDisclosure}>
          <h2 id="profile-builder-heading">Build your role set</h2>
        </summary>
        <div className="profile-builder-content">
          <div className="profile-builder-content-inner">
            <p className="profile-builder-help">Choose up to five roles that feel useful to you. Reorder them, choose a primary role, replace them, or leave the set empty.</p>
            <Suspense fallback={<p role="status">Loading role suggestionsâ€¦</p>}>
              <LazyRoleProfileBuilder roleResults={roleResults} refinementAnswers={refinementAnswers} discoveryAnswers={discoveryAnswers} embedded onRoleSetChange={onRoleSetChange} />
            </Suspense>
          </div>
        </div>
      </details>
    </section>
  );
}
