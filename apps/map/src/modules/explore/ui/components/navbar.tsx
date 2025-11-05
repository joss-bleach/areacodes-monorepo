import Image from "next/image";
import { MapFilterButton } from "@/components/map-filter-button";

export const Navbar = () => {
  return (
    <div className="absolute top-4 left-4 right-4 z-10">
      <div className="bg-black/50 backdrop-blur-md px-4 py-3 flex items-center rounded-md">
        <Image
          src="/areacodes-icon.svg"
          alt="Areacodes"
          width={26}
          height={26}
          className="w-[26px] h-[26px]"
        />
        <div className="ml-auto">
          <MapFilterButton />
        </div>
      </div>
    </div>
  );
};
