"use client";
import { useEffect, useRef, type ComponentProps } from "react";

/** Grow with content; after eight lines use scrolling rather than a drag handle. */
export function AutoResizeTextarea({
  className = "",
  onInput,
  ...props
}: ComponentProps<"textarea">) {
  const ref = useRef<HTMLTextAreaElement>(null);
  function resize() {
    const element = ref.current;
    if (!element) return;
    const style = getComputedStyle(element);
    const border = parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);
    const padding = parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const line = parseFloat(style.lineHeight) || 24;
    const maximum = line * 8 + padding + border;
    element.style.height = "auto";
    const desired = element.scrollHeight + border;
    element.style.height = `${Math.min(desired, maximum)}px`;
    element.style.overflowY = desired > maximum ? "auto" : "hidden";
  }
  useEffect(() => {
    const element = ref.current;
    const form = element?.form;
    let frame = 0;
    const reset = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(resize);
    };
    resize();
    form?.addEventListener("reset", reset);
    window.addEventListener("resize", resize);
    return () => {
      cancelAnimationFrame(frame);
      form?.removeEventListener("reset", reset);
      window.removeEventListener("resize", resize);
    };
  }, []);
  return (
    <textarea
      {...props}
      ref={ref}
      className={`auto-resize-textarea ${className}`}
      onInput={(event) => {
        resize();
        onInput?.(event);
      }}
    />
  );
}
