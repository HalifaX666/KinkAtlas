import { useEffect, useRef, useState } from "react";
import { ShieldCheck, X } from "lucide-react";
import { listenForCompletionCount, loadCompletionCount } from "../services/completionCount";

const numberFormatter = new Intl.NumberFormat("en-US");

export function CompletionCounter() {
  const [count, setCount] = useState<number | null>(null);
  const [isOpen, setIsOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const receivedLiveUpdate = useRef(false);

  useEffect(() => {
    const controller = new AbortController();

    const stopListening = listenForCompletionCount((nextCount) => {
      receivedLiveUpdate.current = true;
      setCount(nextCount);
    });

    void loadCompletionCount(controller.signal).then((loadedCount) => {
      if (loadedCount !== null && !receivedLiveUpdate.current) {
        setCount(loadedCount);
      }
    });

    return () => {
      controller.abort();
      stopListening();
    };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [isOpen]);

  if (count === null) return null;

  const closePanel = () => {
    setIsOpen(false);
    triggerRef.current?.focus();
  };

  return (
    <div className="completion-counter" ref={containerRef}>
      <div id="completion-count-explanation" className="completion-count-card" data-open={isOpen} role="dialog" aria-label="About the assessment completion count" aria-hidden={!isOpen}>
        <div className="completion-count-card-header">
          <div className="completion-count-card-heading">
            <span className="completion-count-card-icon" aria-hidden="true">
              <ShieldCheck size={17} />
            </span>

            <div>
              <span className="completion-count-card-eyebrow">Privacy by design</span>

              <strong>We count completions, not answers.</strong>
            </div>
          </div>

          <button type="button" className="completion-count-close" aria-label="Close completion count information" tabIndex={isOpen ? 0 : -1} onClick={closePanel}>
            <X size={17} aria-hidden="true" />
          </button>
        </div>

        <p>Your assessment responses and results are never sent to or stored with this count.</p>

        <p className="completion-count-card-note">The number is approximate and represents completed assessments, not unique people.</p>
      </div>

      <div className="completion-counter-row">
        <span aria-live="polite">
          {numberFormatter.format(count)} {count === 1 ? "assessment" : "assessments"} completed
        </span>

        <button ref={triggerRef} type="button" className="completion-info-button" aria-label="How completion counting works" aria-expanded={isOpen} aria-controls="completion-count-explanation" aria-haspopup="dialog" onClick={() => setIsOpen((open) => !open)}>
          ?
        </button>
      </div>
    </div>
  );
}
