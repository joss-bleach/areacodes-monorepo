export const Footer = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="bg-black pt-[64px] pb-[24px]">
      <div className="mx-auto w-[87.5%] md:w-[692px] lg:w-[980px]">
        <div className="-ml-2.5 flex w-full flex-row justify-start md:m-0 md:justify-center">
          <a href="/">
            <img
              src="/images/areacodes-white.svg"
              height={40}
              width={120}
              alt="Areacodes logo"
            />
          </a>
        </div>
        <ul className="flex flex-col items-start justify-center gap-1 py-[24px] pl-0 text-sm font-bold text-white uppercase md:mx-auto md:w-fit md:flex-row md:items-center md:gap-4 md:pl-12">
          <li>
            <a
              className="-ml-6 inline-block p-4 tracking-wide hover:opacity-90 md:ml-0 md:p-0 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
              href="/"
            >
              Home
            </a>
          </li>
          <li>
            <a
              className="-ml-6 inline-block p-4 tracking-wide hover:opacity-90 md:ml-0 md:p-0 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
              href="/map"
            >
              Map
            </a>
          </li>
          <li>
            <a
              className="-ml-6 inline-block p-4 tracking-wide hover:opacity-90 md:ml-0 md:p-0 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
              href="/about"
            >
              About
            </a>
          </li>
          <li>
            <a
              className="-ml-6 inline-block p-4 tracking-wide hover:opacity-90 md:ml-0 md:p-0 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
              href="/contact"
            >
              Contact
            </a>
          </li>
          <li>
            <a
              className="-ml-6 inline-block p-4 tracking-wide hover:opacity-90 md:ml-0 md:hidden md:p-0 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
              href="/terms"
            >
              Terms
            </a>
          </li>
          <li>
            <a
              className="-ml-6 inline-block p-4 tracking-wide hover:opacity-90 md:ml-0 md:hidden md:p-0 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
              href="/privacy"
            >
              Privacy
            </a>
          </li>
          <li>
            <a
              className="-ml-6 inline-block p-4 tracking-wide hover:opacity-90 md:ml-0 md:hidden md:p-0 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2"
              href="/cookies"
            >
              Cookies
            </a>
          </li>
        </ul>
        <div className="flex flex-row items-center justify-between border-t border-white pt-[24px]">
          <p className="text-xs text-white">
            Copyright &copy; {currentYear} Areacodes. All rights reserved.
          </p>
          <ul className="hidden flex-row items-center gap-4 text-xs text-white md:flex">
            <li>
              <a className="hover:opacity-90 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2" href="/terms">
                Terms
              </a>
            </li>
            <li>
              <a className="hover:opacity-90 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2" href="/privacy">
                Privacy
              </a>
            </li>
            <li>
              <a className="hover:opacity-90 focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2" href="/cookies">
                Cookies
              </a>
            </li>
          </ul>
        </div>
      </div>
    </footer>
  );
};

