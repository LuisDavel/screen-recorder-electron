import React from "react";
import { DragWindowRegion } from "@/components/DragWindowRegion";
// import { NavigationMenu } from "@/components/template/NavigationMenu";

export default function BaseLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DragWindowRegion />
      {/* <NavigationMenu /> */}
      <main className="h-screen p-6 pb-20">{children}</main>
    </>
  );
}
