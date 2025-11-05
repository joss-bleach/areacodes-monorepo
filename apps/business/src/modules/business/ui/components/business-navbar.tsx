"use client";

import { UserButton } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import { Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useState, useEffect } from "react";

export const BusinessNavbar = () => {
  const { slug } = useParams();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <header className="py-4 bg-background">
      <nav className="mx-auto w-[87.5%] md:w-[692px] lg:w-[980px] flex flex-row items-center justify-between">
        <Link
          href={`/b/${slug}`}
          aria-label="Go to business profile"
          className="focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background rounded"
        >
          <Image
            src="/areacodes-white.svg"
            alt="Areacodes logo"
            width={125}
            height={125}
          />
        </Link>
        {isMounted ? (
          <UserButton>
            <UserButton.MenuItems>
              <UserButton.Link
                label="Edit business profile"
                labelIcon={<Settings className="w-4 h-4" />}
                href={`/b/${slug}/edit`}
              />
            </UserButton.MenuItems>
          </UserButton>
        ) : (
          <div className="w-8 h-8 rounded-full bg-muted animate-pulse" />
        )}
      </nav>
    </header>
  );
};
