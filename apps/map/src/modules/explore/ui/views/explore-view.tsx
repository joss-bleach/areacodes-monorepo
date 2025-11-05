"use client";

import { useState } from "react";
import { Map } from "../components/map";
import { BusinessList } from "../components/business-list";
import { Navbar } from "../components/navbar";

export const ExploreView = () => {
  const [isDrawerExpanded, setIsDrawerExpanded] = useState(false);

  const handleDrawerHeightChange = (
    height: number,
    isExpanded: boolean
  ) => {
    setIsDrawerExpanded(isExpanded);
  };

  return (
    <div className="relative h-screen w-full overflow-hidden">
      <Map scrollWheelZoom={!isDrawerExpanded} />
      <Navbar />
      
      {/* Overlay to block pointer events when drawer is expanded */}
      {isDrawerExpanded && (
        <div
          className="fixed inset-0 z-40 pointer-events-auto"
          aria-hidden="true"
        />
      )}
      
      <BusinessList onDrawerHeightChange={handleDrawerHeightChange} />
    </div>
  );
};
