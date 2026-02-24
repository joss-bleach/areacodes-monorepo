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
      const isExpanded = height >= computedMaxHeight - 10;
      onHeightChange(height, isExpanded);
    }
  }, [height, computedMaxHeight, onHeightChange]);

  useEffect(() => {
    const handleDragEnd = () => {
      setIsDragging(false);
      if (dragDirection.current === "up") {
        setHeight(computedMaxHeight);
      } else if (dragDirection.current === "down") {
        setHeight(initialHeight);
      }
      dragDirection.current = null;
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!isDragging) return;
      e.preventDefault();
      const touch = e.touches[0];
      const deltaY = startY.current - touch.clientY;
      if (deltaY > 10) dragDirection.current = "up";
      else if (deltaY < -10) dragDirection.current = "down";
      const newHeight = Math.min(
        Math.max(startHeight.current + deltaY, minHeight),
        computedMaxHeight
      );
      setHeight(newHeight);
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging) return;
      const deltaY = startY.current - e.clientY;
      if (deltaY > 10) dragDirection.current = "up";
      else if (deltaY < -10) dragDirection.current = "down";
      const newHeight = Math.min(
        Math.max(startHeight.current + deltaY, minHeight),
        computedMaxHeight
      );
      setHeight(newHeight);
    };

    if (isDragging) {
      const originalUserSelect = document.body.style.userSelect;
      document.body.style.userSelect = "none";
      document.addEventListener("touchmove", handleTouchMove, {
        passive: false,
      });
      document.addEventListener("touchend", handleDragEnd);
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleDragEnd);
      return () => {
        document.body.style.userSelect = originalUserSelect;
        document.removeEventListener("touchmove", handleTouchMove);
        document.removeEventListener("touchend", handleDragEnd);
        document.removeEventListener("mousemove", handleMouseMove);
        document.removeEventListener("mouseup", handleDragEnd);
      };
    }
  }, [isDragging, minHeight, computedMaxHeight, initialHeight]);

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
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
    if ("touches" in e) e.preventDefault();
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
    const target = e.target as HTMLElement;
    if (
      target.closest("button") ||
      target.closest("a") ||
      target.closest("input") ||
      target.closest("[role='button']")
    ) {
      return;
    }
    e.stopPropagation();
    if ("touches" in e) e.preventDefault();
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
      className="fixed bottom-0 left-0 right-0 bg-card text-card-foreground rounded-t-none border-t border-l border-r shadow-2xl z-50 cursor-grab active:cursor-grabbing"
      style={{
        height: `${height}px`,
        bottom: `${bottomOffset}px`,
        transition: prefersReducedMotion ? "none" : "height 300ms ease-out",
        overscrollBehavior: "contain",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        touchAction: "pan-y",
        WebkitTapHighlightColor: "transparent",
      }}
      onTouchStart={handleDragStart}
      onMouseDown={handleDragStart}
      role="region"
      aria-label="Business list drawer"
    >
      <div className="flex flex-col h-full">
        <div
          className="flex items-center justify-center py-6 select-none pointer-events-none shrink-0"
          style={{ minHeight: "44px" }}
        >
          <div className="w-20 h-1.5 bg-foreground/20 dark:bg-foreground/40 rounded-full" />
        </div>

        {header && (
          <div
            className="shrink-0 pointer-events-auto cursor-grab active:cursor-grabbing"
            onTouchStart={handleHeaderDragStart}
            onMouseDown={handleHeaderDragStart}
          >
            {header}
          </div>
        )}

        <div
          className="flex-1 overflow-y-auto pb-24 scrollbar-hide pointer-events-auto"
          style={{ overscrollBehavior: "contain" }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};
