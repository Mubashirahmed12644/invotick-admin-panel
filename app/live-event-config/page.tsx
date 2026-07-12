import LiveEventConfigClient from "./LiveEventConfigClient";

export const metadata = {
  title: "Live Event Discovery and Config | invotics",
  description: "Live feed of debug-app events/UI-actions — rename + describe + queue code tasks",
};

export default function LiveEventConfigPage() {
  return <LiveEventConfigClient />;
}
