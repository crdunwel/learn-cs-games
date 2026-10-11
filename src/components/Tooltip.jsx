import React, {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";

// A portal avoids clipping by panels; viewport coordinates keep help within reach.
export default function Tooltip({
  children,
  content,
  label,
  className = "",
  triggerClassName = "",
}) {
  const id = useId();
  const anchor = useRef(null);
  const popup = useRef(null);
  const closeTimer = useRef(null);
  const pinned = useRef(false);
  const hovering = useRef(false);
  const suppressed = useRef(false);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ visibility: "hidden" });

  function cancelClose() {
    clearTimeout(closeTimer.current);
  }
  function show() {
    cancelClose();
    if (!suppressed.current) {
      document.dispatchEvent(
        new CustomEvent("cs-tooltip-open", { detail: id }),
      );
      setOpen(true);
    }
  }
  function dismiss() {
    cancelClose();
    pinned.current = false;
    suppressed.current = true;
    setOpen(false);
  }
  function leave() {
    hovering.current = false;
    suppressed.current = false;
    cancelClose();
    closeTimer.current = setTimeout(() => {
      if (!pinned.current && !anchor.current?.contains(document.activeElement))
        setOpen(false);
    }, 120);
  }

  useEffect(() => () => clearTimeout(closeTimer.current), []);
  useEffect(() => {
    if (!open) return;
    function onKey(event) {
      if (event.key === "Escape") dismiss();
    }
    function onOutside(event) {
      if (
        !anchor.current?.contains(event.target) &&
        !popup.current?.contains(event.target)
      )
        dismiss();
    }
    function onOtherTooltip(event) {
      if (event.detail !== id) dismiss();
    }
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onOutside);
    document.addEventListener("cs-tooltip-open", onOtherTooltip);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onOutside);
      document.removeEventListener("cs-tooltip-open", onOtherTooltip);
    };
  }, [open]);

  useLayoutEffect(() => {
    if (!open) {
      setPosition({ visibility: "hidden" });
      return;
    }
    function place() {
      if (!anchor.current || !popup.current) return;
      const trigger = anchor.current.getBoundingClientRect();
      const view = window.visualViewport;
      const viewLeft = view?.offsetLeft || 0;
      const viewTop = view?.offsetTop || 0;
      const width = view?.width || window.innerWidth;
      const height = view?.height || window.innerHeight;
      const inset = 12;
      const gap = 10;
      const popupWidth = Math.min(420, width - inset * 2);
      const css = getComputedStyle(anchor.current);
      popup.current.style.width = `${popupWidth}px`;
      const naturalHeight = popup.current.scrollHeight + 2;
      const below = Math.max(
        0,
        viewTop + height - trigger.bottom - gap - inset,
      );
      const above = Math.max(0, trigger.top - viewTop - gap - inset);
      const useAbove = below < Math.min(naturalHeight, 320) && above > below;
      const maxHeight = Math.max(
        60,
        Math.min(400, height - inset * 2, useAbove ? above : below),
      );
      const popupHeight = Math.min(naturalHeight, maxHeight);
      const desiredTop = useAbove
        ? trigger.top - gap - popupHeight
        : trigger.bottom + gap;
      setPosition({
        visibility: "visible",
        width: popupWidth,
        maxHeight,
        left: Math.max(
          viewLeft + inset,
          Math.min(
            trigger.left + trigger.width / 2 - popupWidth / 2,
            viewLeft + width - popupWidth - inset,
          ),
        ),
        top: Math.max(
          viewTop + inset,
          Math.min(desiredTop, viewTop + height - popupHeight - inset),
        ),
        "--accent": css.getPropertyValue("--accent"),
        "--soft": css.getPropertyValue("--soft"),
        "--deep": css.getPropertyValue("--deep"),
      });
    }
    place();
    const observer = new ResizeObserver(place);
    observer.observe(anchor.current);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    window.visualViewport?.addEventListener("resize", place);
    window.visualViewport?.addEventListener("scroll", place);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
      window.visualViewport?.removeEventListener("resize", place);
      window.visualViewport?.removeEventListener("scroll", place);
    };
  }, [open, content]);

  return (
    <span
      ref={anchor}
      className={`tooltip-anchor ${className}`}
      onPointerEnter={(event) => {
        if (event.pointerType === "touch") return;
        hovering.current = true;
        show();
      }}
      onPointerLeave={leave}
      onFocus={show}
      onBlur={() => {
        suppressed.current = false;
        if (!pinned.current && !hovering.current) setOpen(false);
      }}
    >
      <button
        type="button"
        className={`tooltip-trigger ${triggerClassName}`}
        aria-label={label}
        aria-describedby={open ? id : undefined}
        aria-expanded={open}
        onClick={() => {
          if (pinned.current) dismiss();
          else {
            suppressed.current = false;
            pinned.current = true;
            document.dispatchEvent(
              new CustomEvent("cs-tooltip-open", { detail: id }),
            );
            setOpen(true);
          }
        }}
      >
        {children}
      </button>
      {open &&
        createPortal(
          <div
            ref={popup}
            id={id}
            role="tooltip"
            className="help-content tooltip-content"
            style={position}
            onPointerEnter={() => {
              hovering.current = true;
              cancelClose();
            }}
            onPointerLeave={leave}
          >
            {content}
          </div>,
          document.body,
        )}
    </span>
  );
}
