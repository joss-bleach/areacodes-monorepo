"use client";

import type React from "react";

import { useRef, useState, useEffect, type ReactNode } from "react";

interface DraggableDrawerProps {
  children: ReactNode;
  header?: ReactNode;
  minHeight?: number;
  maxHeight?: number;
  initialHeight?: number;
  bottomOffset?: number;
  onHeightChange?: (height: number, isExpanded: boolean) => void;
}

export const DraggableDrawer = ({
  children,
  header,
  minHeight = 300,
  maxHeight,
  initialHeight = 400,
  bottomOffset = 0,
  onHeightChange,
}: DraggableDrawerProps) => {
  const [computedMaxHeight, setComputedMaxHeight] = useState(maxHeight ?? 800);

  useEffect(() => {
    if (maxHeight === undefined) {
      setComputedMaxHeight(window.innerHeight - 100);
    } else {
      setComputedMaxHeight(maxHeight);
    }
  }, [maxHeight]);
  const [height, setHeight] = useState(initialHeight);
  const [isDragging, setIsDragging] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startHeight = useRef(0);
  const dragDirection = useRef<"up" | "down" | null>(null);

  // Check for prefers-reduced-motion (Vercel guidelines: Honor prefers-reduced-motion)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
      setPrefersReducedMotion(mediaQuery.matches);

      const handleChange = (e: MediaQueryListEvent) => {
        setPrefersReducedMotion(e.matches);
      };

      mediaQuery.addEventListener("change", handleChange);
      return () => mediaQuery.removeEventListener("change", handleChange);
    }
  }, []);

  useEffect(() => {
    if (onHeightChange) {
      const isExpanded = height >= computedMaxHeight - 10; // 10px threshold
      onHeightChange(height, isExpanded);
    }
  }, [height, computedMaxHeight, onHeightChange]);

  useEffect(() => {
    const handleDragEnd = () => {
      setIsDragging(false);

      // Snap to appropriate height based on drag direction
      if (dragDirection.current === "up") {
        // Snap to max height
        setHeight(computedMaxHeight);
      } else if (dragDirection.current === "down") {
        // Snap back to initial height
        setHeight(initialHeight);
      }

      dragDirection.current = null;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;

      e.preventDefault(); // Prevent scrolling while dragging

      const touch = e.touches[0];
      const deltaY = startY.current - touch.clientY;

      // Track drag direction
      if (deltaY > 10) {
        dragDirection.current = "up";
      } else if (deltaY < -10) {
        dragDirection.current = "down";
      }

      const newHeight = Math.min(
        Math.max(startHeight.current + deltaY, minHeight),
        computedMaxHeight
      );
      setHeight(newHeight);
    };

    const handleTouchEnd = () => {
      if (isDragging) {
        handleDragEnd();
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;

      const deltaY = startY.current - e.clientY;

      // Track drag direction
      if (deltaY > 10) {
        dragDirection.current = "up";
      } else if (deltaY < -10) {
        dragDirection.current = "down";
      }

      const newHeight = Math.min(
        Math.max(startHeight.current + deltaY, minHeight),
        computedMaxHeight
      );
      setHeight(newHeight);
    };

    const handleMouseUp = () => {
      if (isDragging) {
        handleDragEnd();
      }
    };

    // Vercel guidelines: Clean drag interactions - disable text selection during drag
    if (isDragging) {
      // Disable text selection on body while dragging
      const originalUserSelect = document.body.style.userSelect;
      const originalWebkitUserSelect = document.body.style.webkitUserSelect;
      document.body.style.userSelect = "none";
      document.body.style.webkitUserSelect = "none";

      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      document.addEventListener("touchend", handleTouchEnd);
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);

      return () => {
        // Restore original text selection styles
        document.body.style.userSelect = originalUserSelect;
        document.body.style.webkitUserSelect = originalWebkitUserSelect;
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleTouchEnd);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, minHeight, computedMaxHeight, initialHeight]);

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    // Prevent dragging if clicking on interactive elements
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest("input") ||
      target.closest("[role='button']") ||
      target.closest(".pointer-events-auto")
    ) {
      return;
    }

    // Prevent default to avoid scrolling conflicts on mobile
    if ("touches" in e) {
      e.preventDefault();
    }

    setIsDragging(true);
    startHeight.current = height;
    dragDirection.current = null;

    if ("touches" in e) {
      startY.current = e.touches[0].clientY;
    } else {
      startY.current = e.clientY;
    }
  };

  const handleHeaderDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    // Prevent dragging if clicking on interactive elements within header
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest("input") ||
      target.closest("[role='button']")
    ) {
      return;
    }

    // Stop propagation to prevent main container drag handler from firing
    e.stopPropagation();

    // Prevent default to avoid scrolling conflicts on mobile
    if ("touches" in e) {
      e.preventDefault();
    }

    setIsDragging(true);
    startHeight.current = height;
    dragDirection.current = null;

    if ("touches" in e) {
      startY.current = e.touches[0].clientY;
    } else {
      startY.current = e.clientY;
    }
  };

  return (
    <div
      ref={drawerRef}
      className="fixed bottom-0 left-0 right-0 bg-card text-card-foreground rounded-t-3xl border-t border-l border-r shadow-2xl z-50 cursor-grab active:cursor-grabbing"
      style={{
        height: `${height}px`,
        bottom: `${bottomOffset}px`,
        // Vercel guidelines: Never transition: all - explicitly list properties
        // Respect prefers-reduced-motion
        transition: prefersReducedMotion ? "none" : "height 300ms ease-out",
        // Vercel guidelines: Overscroll behavior for drawers
        overscrollBehavior: "contain",
        // Vercel guidelines: Respect safe areas
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        // Vercel guidelines: Prevent double-tap zoom on controls
        touchAction: "pan-y",
        // Vercel guidelines: Tap highlight follows design
        WebkitTapHighlightColor: "transparent",
      }}
      onTouchStart={handleDragStart}
      onMouseDown={handleDragStart}
      {...(isDragging && { inert: true })}
      role="region"
      aria-label="Business list drawer"
    >
      <div className="flex flex-col h-full">
        {/* Drag Handle */}
        <div
          className="flex items-center justify-center py-6 select-none pointer-events-none shrink-0"
          style={{
            touchAction: "manipulation",
            WebkitUserSelect: "none",
            minHeight: "44px", // Vercel guidelines: Minimum hit target on mobile (44px)
          }}
        >
          <div className="w-20 h-1.5 bg-foreground/20 dark:bg-foreground/40 rounded-full" />
        </div>

        {/* Fixed Header */}
        {header && (
          <div
            className="shrink-0 pointer-events-auto cursor-grab active:cursor-grabbing"
            onTouchStart={handleHeaderDragStart}
            onMouseDown={handleHeaderDragStart}
          >
            {header}
          </div>
        )}

        {/* Scrollable Content */}
        <div
          className="flex-1 overflow-y-auto pb-24 scrollbar-hide pointer-events-auto"
          style={{
            overscrollBehavior: "contain",
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
