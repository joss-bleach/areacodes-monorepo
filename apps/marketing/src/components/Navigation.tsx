import { Button } from "./ui/button";

export const Navigation = () => {
  return (
    <header className="bg-black">
      <nav className="flex flex-row items-center justify-between px-4 py-6 md:px-12">
        <ul className="hidden flex-row items-center gap-4 text-xs tracking-wide text-white uppercase md:flex">
          <li>
            <a className="hover:opacity-90 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2" href="/about">
              About
            </a>
          </li>
          <li>
            <a className="hover:opacity-90 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2" href="/contact">
              Contact
            </a>
          </li>
        </ul>
        <a href="/">
          <img
            src="/images/areacodes-white.svg"
            height={40}
            width={120}
            alt="Areacodes logo"
          />
        </a>
        <Button className="w-[120px] rounded-none bg-white font-semibold tracking-wide text-black shadow-none hover:cursor-pointer hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2">
          View map
        </Button>
      </nav>
    </header>
  );
};

