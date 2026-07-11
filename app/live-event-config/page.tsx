import LiveEventConfigClient from "./LiveEventConfigClient";

export const metadata = {
  title: "Live Event Config | invotics",
  description: "Curate which analytics events are kept for funnels — keep/hide + name + describe",
};

export default function LiveEventConfigPage() {
  return <LiveEventConfigClient />;
}
