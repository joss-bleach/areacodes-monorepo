import { UserButton } from "@clerk/tanstack-start";
import { Link, useParams } from "@tanstack/react-router";
import { Settings } from "lucide-react";
import { useState, useEffect } from "react";

export const BusinessNavbar = () => {
  const { slug } = useParams({ strict: false }) as { slug?: string };
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <header className="py-4 bg-background">
      <nav className="mx-auto w-[87.5%] md:w-[692px] lg:w-[980px] flex flex-row items-center justify-between">
        <Link
          to={slug ? `/b/${slug}` : "/"}
          aria-label="Go to business profile"
          className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded"
        >
          <img
            src="/areacodes-white.svg"
            alt="Areacodes logo"
            width={125}
            height={125}
          />
        </Link>
        {isMounted ? (
          <UserButton>
            <UserButton.MenuItems>
              {slug && (
                <UserButton.Link
                  label="Edit business profile"
                  labelIcon={<Settings className="w-4 h-4" />}
                  href={`/b/${slug}/edit`}
                />
              )}
            </UserButton.MenuItems>
          </UserButton>
        ) : (
          <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
        )}
      </nav>
    </header>
  );
};
