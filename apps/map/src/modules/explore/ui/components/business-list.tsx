"use client";
import { useEffect, useState } from "react";

import { DraggableDrawer } from "./draggable-drawer";

export const BusinessList = () => {
  const [maxHeight, setMaxHeight] = useState(800);

  useEffect(() => {
    setMaxHeight(window.innerHeight - 100);
  }, []);
  return (
    <DraggableDrawer minHeight={100} maxHeight={maxHeight} initialHeight={120}>
      <div className="px-6">
        <h2 className="text-2xl font-bold text-foreground mb-6">
          VOUCHERS NEARBY
        </h2>

        <div className="mb-6">
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="flex gap-3 p-3 bg-muted">
                <div className="w-16 h-16 overflow-hidden shrink-0">
                  <img
                    src={`/restaurant-.jpg?height=64&width=64&query=restaurant+${i}`}
                    alt={`Restaurant ${i}`}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold text-foreground">
                    Restaurant Name
                  </h4>
                  <p className="text-sm text-muted-foreground">American • $$</p>
                  <div className="flex items-center gap-1 mt-1">
                    <span className="text-sm text-yellow-600">★</span>
                    <span className="text-sm text-foreground">4.5</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DraggableDrawer>
  );
};
