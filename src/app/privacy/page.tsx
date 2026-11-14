import type { Metadata } from "next";
import { Privacy } from "@/components/Privacy";

export const metadata: Metadata = { title: "Privacy & terms · Plainly" };

export default function Page() {
  return <Privacy />;
}
