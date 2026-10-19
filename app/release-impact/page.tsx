import ReleaseImpactPage from "@/features/release-impact/components/ReleaseImpactPage";

export const metadata = {
  title: "Release Impact | invotics",
  description: "What each release changed: better or worse, for whom, by how much, and what to do now",
};

export default function ReleaseImpactRoute() {
  return <ReleaseImpactPage />;
}
