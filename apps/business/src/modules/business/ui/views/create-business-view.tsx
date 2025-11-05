import { CreateBusinessForm } from "../components/create-business-form";

export const CreateBusinessView = () => {
  return (
    <main className="w-screen py-6">
      <div className="mx-auto w-[87.5%] md:w-[692px] lg:w-[980px]">
        <div className="flex flex-col">
          <h1 className="text-2xl font-semibold text-foreground">
            Create your <br />
            business profile
          </h1>
          <p className="font-muted-foreground mt-[14px]">
            Add your business details below to start reaching local customers.
          </p>
          <CreateBusinessForm />
        </div>
      </div>
    </main>
  );
};
