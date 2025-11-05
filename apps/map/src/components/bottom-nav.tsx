import {
  BellIcon,
  BookmarkIcon,
  MapPinIcon,
  NavigationIcon,
  PlusIcon,
} from "lucide-react";

export const BottomNav = () => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-20">
      <div className="flex items-center justify-around py-2 px-4">
        <button className="flex flex-col items-center gap-1 py-2">
          <MapPinIcon className="w-6 h-6 text-blue-600" />
          <span className="text-xs font-medium text-blue-600">Explore</span>
        </button>
        <button className="flex flex-col items-center gap-1 py-2">
          <NavigationIcon className="w-6 h-6 text-gray-500" />
          <span className="text-xs text-gray-500">Go</span>
        </button>
        <button className="flex flex-col items-center gap-1 py-2">
          <BookmarkIcon className="w-6 h-6 text-gray-500" />
          <span className="text-xs text-gray-500">Saved</span>
        </button>
        <button className="flex flex-col items-center gap-1 py-2">
          <PlusIcon className="w-6 h-6 text-gray-500" />
          <span className="text-xs text-gray-500">Contribute</span>
        </button>
        <button className="flex flex-col items-center gap-1 py-2">
          <BellIcon className="w-6 h-6 text-gray-500" />
          <span className="text-xs text-gray-500">Updates</span>
        </button>
      </div>
    </div>
  );
};
