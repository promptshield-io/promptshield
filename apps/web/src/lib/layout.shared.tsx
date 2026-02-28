import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import Image from "next/image";
import Link from "next/link";
import icon from "../app/icon.png";

export function baseOptions(): BaseLayoutProps {
  return {
    nav: {
      title: (
        <Link href="/" className="font-bold flex gap-2 items-center">
          <Image src={icon} alt="PromptShield logo" width={24} /> PromptShield
        </Link>
      ),
    },
    githubUrl: "https://github.com/promptshield-io/promptshield",
  };
}
