"use client";

import { type ReactNode, useLayoutEffect, useRef } from "react";

type SelectionTrackProps = {
  as?: "div" | "nav";
  className: string;
  label: string;
  activeKey: string;
  children: ReactNode;
};

type Box = Pick<DOMRect, "x" | "y" | "width" | "height">;

function cssTimeInMilliseconds(value: string) {
  // CSS optimization can serialize 224ms as .224s. Web Animations expects milliseconds.
  const time = value.trim();
  if (time.endsWith("ms")) return Number.parseFloat(time);
  if (time.endsWith("s")) return Number.parseFloat(time) * 1000;
  return NaN;
}

function sameBox(first: Box | undefined, second: Box) {
  // A translated mobile drawer can introduce tiny viewport rounding differences.
  return (
    first &&
    Math.abs(first.x - second.x) < 0.01 &&
    Math.abs(first.y - second.y) < 0.01 &&
    Math.abs(first.width - second.width) < 0.01 &&
    Math.abs(first.height - second.height) < 0.01
  );
}

function placeIndicator(
  track: HTMLElement,
  indicator: HTMLElement,
  animate: boolean,
  previous?: Box,
) {
  const item = track.querySelector<HTMLElement>(
    ':scope > [aria-current]:not([aria-current="false"])',
  );
  const target = item?.getBoundingClientRect();
  if (!target?.width || !target.height) {
    indicator.getAnimations().forEach((animation) => animation.cancel());
    track.removeAttribute("data-selection-ready");
    return;
  }

  const origin = track.getBoundingClientRect();
  const destination = {
    x: target.left - origin.left - track.clientLeft + track.scrollLeft,
    y: target.top - origin.top - track.clientTop + track.scrollTop,
    width: target.width,
    height: target.height,
  };
  // ResizeObserver also reports initial sizes. Only a real reflow interrupts a slide.
  if (sameBox(previous, destination)) return previous;

  // Sample the painted pill, including any interrupted slide, before changing its box.
  const start =
    animate && track.hasAttribute("data-selection-ready")
      ? indicator.getBoundingClientRect()
      : null;
  let slide: { from: string; duration: number; easing: string; fallback: string } | undefined;
  if (start && !sameBox(start, target)) {
    const style = getComputedStyle(indicator);
    slide = {
      from: `translate(${start.x - target.x}px, ${start.y - target.y}px) scale(${start.width / target.width}, ${start.height / target.height})`,
      duration: cssTimeInMilliseconds(style.getPropertyValue("--selection-duration")),
      easing: style.getPropertyValue("--motion-spatial-curve").trim(),
      fallback: style.getPropertyValue("--motion-spatial-fallback").trim(),
    };
  }

  Object.assign(indicator.style, {
    left: `${destination.x}px`,
    top: `${destination.y}px`,
    width: `${target.width}px`,
    height: `${target.height}px`,
  });
  track.setAttribute("data-selection-ready", "");
  indicator.getAnimations().forEach((animation) => animation.cancel());
  if (slide && Number.isFinite(slide.duration) && slide.duration > 0) {
    const frames = [{ transform: slide.from }, { transform: "none" }];
    try {
      indicator.animate(frames, { duration: slide.duration, easing: slide.easing });
    } catch {
      // Some engines expose linear() to CSS before their Web Animations parser accepts it.
      indicator.animate(frames, { duration: slide.duration, easing: slide.fallback });
    }
  }
  return destination;
}

export function SelectionTrack({
  as: Tag = "div",
  className,
  label,
  activeKey,
  children,
}: SelectionTrackProps) {
  const indicatorRef = useRef<HTMLSpanElement>(null);

  useLayoutEffect(() => {
    const indicator = indicatorRef.current;
    const track = indicator?.parentElement;
    if (
      !track ||
      !indicator ||
      !window.ResizeObserver ||
      !window.matchMedia ||
      !indicator.animate ||
      !indicator.getAnimations
    )
      return;

    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!preference.addEventListener) return;
    let destination = placeIndicator(track, indicator, !preference.matches);
    const stopMotion = () => {
      if (preference.matches) indicator.getAnimations().forEach((animation) => animation.cancel());
    };
    preference.addEventListener("change", stopMotion);

    // Sibling widths can move the active item when a label wraps or a font loads.
    const observer = new ResizeObserver(() => {
      destination = placeIndicator(track, indicator, false, destination);
    });
    observer.observe(track);
    for (const item of track.children) {
      if (item !== indicator) observer.observe(item);
    }
    return () => {
      observer.disconnect();
      preference.removeEventListener("change", stopMotion);
    };
  }, [activeKey]);

  return (
    <Tag
      className={`selection-track ${className}`}
      role={Tag === "div" ? "group" : undefined}
      aria-label={label}
    >
      <span ref={indicatorRef} className="selection-indicator" aria-hidden="true" />
      {children}
    </Tag>
  );
}
