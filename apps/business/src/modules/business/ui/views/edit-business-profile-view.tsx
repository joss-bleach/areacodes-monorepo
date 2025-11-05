"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { DeleteBusiness } from "../sections/delete-business";
import { EditBusinessProfileForm } from "../sections/edit-business-profile-form";

export const EditBusinessProfileView = () => {
  const params = useParams();
  const slug = params.slug as string;

  return (
    <main className="w-screen py-6">
      <div className="mx-auto w-[87.5%] md:w-[692px] lg:w-[980px]">
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink asChild>
                <Link href={`/b/${slug}`}>Dashboard</Link>
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>Edit Business Profile</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
        <EditBusinessProfileForm />
        <DeleteBusiness />
      </div>
    </main>
  );
};
