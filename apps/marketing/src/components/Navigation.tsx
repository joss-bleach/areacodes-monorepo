import { useState } from "react";
import {
  Button,
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetTitle,
} from "@repo/ui";

const navLinks = [
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

export const Navigation = () => {
  const [open, setOpen] = useState(false);

  return (
    <header className="bg-black">
      <nav className="flex flex-row items-center justify-between px-4 py-6 md:px-12">
        {/* Mobile hamburger */}
        <div className="md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <button
                aria-label="Open menu"
                className="text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
              >
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <line x1="3" y1="6" x2="21" y2="6" />
                  <line x1="3" y1="12" x2="21" y2="12" />
                  <line x1="3" y1="18" x2="21" y2="18" />
                </svg>
              </button>
            </SheetTrigger>
            <SheetContent
              side="left"
              className="bg-black border-white/10 w-[280px]"
            >
              <SheetTitle className="sr-only">Navigation menu</SheetTitle>
              <div className="flex flex-col gap-8 pt-4">
                <a href="/" onClick={() => setOpen(false)}>
                  <img
                    src="/images/areacodes-white.svg"
                    height={40}
                    width={120}
                    alt="Areacodes logo"
                  />
                </a>
                <ul className="flex flex-col gap-4">
                  {navLinks.map((link) => (
                    <li key={link.href}>
                      <a
                        className="text-sm font-bold uppercase tracking-wide text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                        href={link.href}
                        onClick={() => setOpen(false)}
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
                <a href="https://map.acbrighton.com">
                  <Button className="w-full bg-white font-semibold tracking-wide text-black shadow-none hover:cursor-pointer hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2">
                    View map
                  </Button>
                </a>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        {/* Desktop nav links */}
        <ul className="hidden flex-row items-center gap-6 text-xs tracking-wide text-white uppercase md:flex">
          {navLinks.map((link) => (
            <li key={link.href}>
              <a
                className="hover:opacity-90 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                href={link.href}
              >
                {link.label}
              </a>
            </li>
          ))}
        </ul>

        {/* Logo (centered) */}
        <a href="/">
          <img
            src="/images/areacodes-white.svg"
            height={40}
            width={120}
            alt="Areacodes logo"
          />
        </a>

        {/* View map button */}
        <a href="https://map.acbrighton.com">
          <Button className="w-[120px] bg-white font-semibold tracking-wide text-black shadow-none hover:cursor-pointer hover:bg-white/90 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2">
            View map
          </Button>
        </a>
      </nav>
    </header>
  );
};
