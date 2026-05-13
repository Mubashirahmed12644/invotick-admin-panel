import Image from "next/image";
import Link from "next/link";

interface LogoProps {
  href?: string;
  width?: number;
  height?: number;
}

export default function Logo({ href = "/users", width = 148, height = 36 }: LogoProps) {
  return (
    <Link href={href} className="logo-link" aria-label="Invotics Webpanel">
      <Image src="/logo.png" alt="Invotics logo" width={width} height={height} priority />
    </Link>
  );
}
