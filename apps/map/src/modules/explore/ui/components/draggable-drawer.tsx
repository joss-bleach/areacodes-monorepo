"use client";

import type React from "react";

import { useRef, useState, useEffect, type ReactNode } from "react";

interface DraggableDrawerProps {
  children: ReactNode;
  minHeight?: number;
  maxHeight?: number;
  initialHeight?: number;
  bottomOffset?: number;
  onHeightChange?: (height: number, isExpanded: boolean) => void;
}

export const DraggableDrawer = ({
  children,
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
  const drawerRef = useRef<HTMLDivElement>(null);
  const startY = useRef(0);
  const startHeight = useRef(0);
  const dragDirection = useRef<"up" | "down" | null>(null);

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

    if (isDragging) {
      document.addEventListener("touchmove", handleTouchMove, { passive: false });
      document.addEventListener("touchend", handleTouchEnd);
      document.addEventListener("mousemove", handleMouseMove);
      document.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      document.removeEventListener("touchmove", handleTouchMove);
      document.removeEventListener("touchend", handleTouchEnd);
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isDragging, minHeight, computedMaxHeight, initialHeight]);

  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
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
      className="fixed bottom-0 left-0 right-0 bg-card text-card-foreground rounded-t-3xl border-t border-l border-r shadow-2xl transition-all duration-300 z-50"
      style={{ height: `${height}px`, bottom: `${bottomOffset}px` }}
    >
      {/* Drag Handle */}
      <div
        className="flex items-center justify-center py-6 cursor-grab active:cursor-grabbing select-none"
        onTouchStart={handleDragStart}
        onMouseDown={handleDragStart}
        style={{ touchAction: "none", WebkitUserSelect: "none" }}
      >
        <div className="w-20 h-1.5 bg-foreground/20 dark:bg-foreground/40 rounded-full" />
      </div>

      {/* Content */}
      <div className="h-full overflow-y-auto pb-24 scrollbar-hide">
        {children}
      </div>
    </div>
  );
};
