import Image from "next/image";
import { SocialIcons } from "./SocialLinks";

export default function Footer() {
  return (
    <footer className="flex flex-col items-start justify-between gap-4 border-t border-line bg-plum-900 px-[6vw] py-8 text-xs text-plum-300 sm:flex-row sm:items-center">
      <div className="flex items-center gap-3">
        <Image src="/brand/wordmark-white.png" alt="THUS House of Traders" width={83} height={32} />
      </div>
      <span className="tracking-[2px]">Learn · Practice · Improve</span>
      <div className="flex flex-col items-start gap-3 sm:items-end">
        <SocialIcons />
        <span>© {new Date().getFullYear()} THUS House of Traders · @THUSHOUSE</span>
      </div>
    </footer>
  );
}
