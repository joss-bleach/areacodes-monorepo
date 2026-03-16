const navLinks = [
  { href: "/", label: "Home" },
  { href: "https://map.acbrighton.com", label: "Map" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact" },
];

const legalLinks = [
  { href: "/terms", label: "Terms" },
  { href: "/privacy", label: "Privacy" },
  { href: "/cookies", label: "Cookies" },
];

export const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-black">
      <div className="mx-auto w-[87.5%] md:w-[692px] lg:w-[980px] pt-16 pb-8">
        {/* Logo + nav */}
        <div className="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <a href="/">
            <img
              src="/images/areacodes-white.svg"
              height={40}
              width={120}
              alt="Areacodes logo"
            />
          </a>
          <ul className="flex flex-col gap-3 md:flex-row md:gap-6">
            {navLinks.map((link) => (
              <li key={link.href}>
                <a
                  className="text-sm font-bold uppercase tracking-wide text-white hover:opacity-90 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                  href={link.href}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        {/* Bottom bar */}
        <div className="mt-8 border-t border-white/20 py-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <p className="text-xs text-white/60">
            &copy; {currentYear} Areacodes. All rights reserved.
          </p>
          <ul className="flex flex-row gap-4">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <a
                  className="text-xs text-white/60 hover:text-white focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
                  href={link.href}
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Bleach credit bar */}
      <div className="border-t border-white/10 py-4">
        <div className="mx-auto w-[87.5%] md:w-[692px] lg:w-[980px] flex items-center justify-center gap-2">
          <span className="text-[11px] text-white/40">Website built by</span>
          <a
            href="https://bleach.digital?ref=areacodes"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:opacity-80 transition-opacity focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
          >
            <img
              src="/bleach-wordmark-white.svg"
              alt="Bleach Digital"
              height={22}
              className="h-[22px] w-auto"
            />
          </a>
        </div>
      </div>
    </footer>
  );
};
