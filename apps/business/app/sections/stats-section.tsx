import { useEffect, useRef, useState } from "react";
import { useParams } from "@tanstack/react-router";
import { useQuery } from "convex/react";
import { api } from "@repo/convex";
import type { Id } from "@repo/convex";
import { Card, CardContent, CardHeader, CardTitle, Skeleton } from "@repo/ui";
import { ClockIcon, Ticket } from "lucide-react";
import { BoundaryAlert } from "~/components/boundary-alert";

export const StatsSection = () => {
  const { slug } = useParams({ strict: false }) as { slug: string };
  const business = useQuery(api.functions.businesses.getBusinessBySlug, { slug });

  const businessId = business?._id as Id<"businesses"> | undefined;

  const activeVouchers = useQuery(
    api.functions.vouchers.getActiveVouchersByBusiness,
    businessId ? { businessId } : "skip"
  );

  const expiringVouchers = useQuery(
    api.functions.vouchers.getExpiringVouchersByBusiness,
    businessId ? { businessId } : "skip"
  );

  if (business === null) {
    return (
      <BoundaryAlert title="Error" description="Error loading voucher statistics." />
    );
  }

  const isLoading =
    business === undefined ||
    activeVouchers === undefined ||
    expiringVouchers === undefined;

  if (isLoading) {
    return <StatsSectionLoading />;
  }

  const cards = [
    {
      title: "Active Vouchers",
      icon: Ticket,
      value: activeVouchers?.length ?? 0,
      description: "Currently available for use",
    },
    {
      title: "Expiring Soon",
      icon: ClockIcon,
      value: expiringVouchers?.length ?? 0,
      description: "Within 30 days",
    },
  ];

  return <StatsSectionContent cards={cards} />;
};

type StatCard = {
  title: string;
  icon: React.ElementType;
  value: number;
  description: string;
};

const StatsSectionContent = ({ cards }: { cards: StatCard[] }) => {
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const isDraggingRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      if (isDraggingRef.current) return;
      const scrollLeft = container.scrollLeft;
      const cardWidth = container.clientWidth;
      const gap = 24;
      const newIndex = Math.round(scrollLeft / (cardWidth + gap));
      setActiveIndex(Math.min(newIndex, cards.length - 1));
    };

    container.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => container.removeEventListener("scroll", handleScroll);
  }, [cards.length]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const container = scrollContainerRef.current;
    if (!container) return;

    isDraggingRef.current = true;
    const rect = container.getBoundingClientRect();
    startXRef.current = e.clientX - rect.left;
    scrollLeftRef.current = container.scrollLeft;
    container.style.cursor = "grabbing";
    container.style.userSelect = "none";

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
    const scrollLeft = container.scrollLeft;
    const cardWidth = container.clientWidth;
    const gap = 24;
    const newIndex = Math.round(scrollLeft / (cardWidth + gap));
    setActiveIndex(Math.min(newIndex, cards.length - 1));
  };

  return (
    <section className="my-8">
      <div
        ref={scrollContainerRef}
        className="flex gap-6 overflow-x-auto snap-x snap-mandatory scrollbar-hide md:grid md:grid-cols-2 md:overflow-visible cursor-grab active:cursor-grabbing select-none md:cursor-default md:select-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
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
                  {card.value}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {card.description}
                </p>
              </CardContent>
            </Card>
          );
        })}
      </div>
      <div className="flex justify-center gap-2 mt-4 md:hidden">
        {cards.map((_, index) => (
          <button
            key={index}
            onClick={() => {
              const container = scrollContainerRef.current;
              if (container) {
                const cardWidth = container.clientWidth;
                const gap = 24;
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
    </section>
  );
};

const StatsSectionLoading = () => {
  return (
    <section className="my-8">
      <div className="flex gap-6 md:grid md:grid-cols-2">
        {[1, 2].map((index) => (
          <Card
            key={index}
            className="border-none rounded-none shrink-0 w-full md:shrink"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-9 w-16 mb-1" />
              <Skeleton className="h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
};
