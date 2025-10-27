export const CreateBusinessLayout = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  return (
    <main className="w-screen h-screen flex items-center justify-center">
      <div className="w-[380px]">{children}</div>
    </main>
  );
};
