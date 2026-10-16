import AbTestsPage from "@/features/ab-tests/components/AbTestsPage";

export const metadata = {
  title: "A/B Tests | invotics",
  description: "Every A/B and holdout test the app runs, and whether its result is proven yet",
};

export default function AbTestsRoute() {
  return <AbTestsPage />;
}
