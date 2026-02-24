import { Link } from "@tanstack/react-router";

export const VoucherNavbar = () => {
  return (
    <div className="fixed top-4 left-4 right-4 z-[60]">
      <div className="bg-black/50 backdrop-blur-md px-4 py-3 flex items-center rounded-none">
        <Link to="/">
          <img
            src="/areacodes-icon.svg"
            alt="Areacodes"
            width={26}
            height={26}
            className="w-[26px] h-[26px]"
          />
        </Link>
      </div>
    </div>
  );
};
