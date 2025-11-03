"use client";
import { CountUp } from "use-count-up";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClockIcon, Ticket } from "lucide-react";
import { useEffect, useRef, useState } from "react";

const cards = [
  {
    title: "Active Vouchers",
    icon: Ticket,
    value: 2,
    description: "Currently available for use",
  },
  {
    title: "Expiring Soon",
    icon: ClockIcon,
    value: 4,
    description: "Within 30 days",
  },
];

export const StatsSection = () => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isDraggingRef.current) return; // Don't update active index while dragging
      const scrollLeft = container.scrollLeft;
      const cardWidth = container.clientWidth;
      const gap = 24; // 1.5rem = 24px gap
      const newIndex = Math.round(scrollLeft / (cardWidth + gap));
      setActiveIndex(Math.min(newIndex, cards.length - 1));
    };

    container.addEventListener("scroll", handleScroll);
    handleScroll(); // Initialize on mount
    return () => container.removeEventListener("scroll", handleScroll);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    isDraggingRef.current = true;
    const rect = container.getBoundingClientRect();
    startXRef.current = e.clientX - rect.left;
    scrollLeftRef.current = container.scrollLeft;
    container.style.cursor = "grabbing";
    container.style.userSelect = "none";

    // Add document-level listeners
    const handleMouseMove = (e: MouseEvent) => {
      if (!container || !isDraggingRef.current) return;

      e.preventDefault();
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const walk = (x - startXRef.current) * 2;
      container.scrollLeft = scrollLeftRef.current - walk;
    };

    const handleMouseUp = () => {
      if (!container) return;

      isDraggingRef.current = false;
      container.style.cursor = "grab";
      container.style.userSelect = "";

      // Update active index after drag ends
      const scrollLeft = container.scrollLeft;
      const cardWidth = container.clientWidth;
      const gap = 24;
      const newIndex = Math.round(scrollLeft / (cardWidth + gap));
      setActiveIndex(Math.min(newIndex, cards.length - 1));

      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
  };

  const handleMouseLeave = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    if (!isDraggingRef.current) {
      container.style.cursor = "grab";
    }
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    isDraggingRef.current = true;
    const rect = container.getBoundingClientRect();
    startXRef.current = e.touches[0].clientX - rect.left;
    scrollLeftRef.current = container.scrollLeft;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const container = scrollContainerRef.current;
    if (!container || !isDraggingRef.current) return;

    const rect = container.getBoundingClientRect();
    const x = e.touches[0].clientX - rect.left;
    const walk = (x - startXRef.current) * 2;
    container.scrollLeft = scrollLeftRef.current - walk;
  };

  const handleTouchEnd = () => {
    const container = scrollContainerRef.current;
    if (!container) return;

    isDraggingRef.current = false;

    // Update active index after drag ends
    const scrollLeft = container.scrollLeft;
    const cardWidth = container.clientWidth;
    const gap = 24;
    const newIndex = Math.round(scrollLeft / (cardWidth + gap));
    setActiveIndex(Math.min(newIndex, cards.length - 1));
  };

  return (
    <div className="my-8">
      <div
        ref={scrollContainerRef}
        className="flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-2 md:overflow-visible cursor-grab active:cursor-grabbing select-none md:cursor-default md:select-auto"
        style={{
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        }}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {cards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Card
              key={index}
              className="border-none rounded-none shrink-0 w-full snap-center md:shrink"
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-semibold text-foreground font-mono">
                  <CountUp isCounting end={card.value} duration={0.5} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      {/* Dots indicator - only visible on mobile */}
      <div className="flex justify-center gap-2 mt-4 md:hidden">
        {cards.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              const container = scrollContainerRef.current;
              if (container) {
                const cardWidth = container.clientWidth;
                const gap = 24; // 1.5rem = 24px gap
                container.scrollTo({
                  left: index * (cardWidth + gap),
                  behavior: "smooth",
                });
              }
            }}
            className={`h-2 rounded-full transition-all ${
              activeIndex === index
                ? "w-6 bg-foreground"
                : "w-2 bg-muted-foreground/30"
            }`}
            aria-label={`Go to card ${index + 1}`}
          />
        ))}
      </div>
    </div>
  );
};
