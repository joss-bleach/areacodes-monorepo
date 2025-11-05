import { Map } from "../components/map";
import { BusinessList } from "../components/business-list";
import { Navbar } from "../components/navbar";

export const ExploreView = () => {
  return (
    <div className="relative h-screen w-full overflow-hidden">
      <Map />
      <Navbar />
      <BusinessList />
    </div>
  );
};
