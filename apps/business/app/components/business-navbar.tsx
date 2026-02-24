import { UserButton } from "@clerk/tanstack-react-start";
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
    <header className="border-b border-border bg-background">
      <nav className="container-app flex flex-row items-center justify-between py-4">
        <Link
          to={slug ? `/b/${slug}` : "/"}
          aria-label="Go to business profile"
          className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
        >
          <img
            src="/areacodes-white.svg"
            alt="Areacodes logo"
            width={140}
            height={140}
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
          <div className="w-8 h-8 bg-muted animate-pulse" />
        )}
      </nav>
    </header>
  );
};
