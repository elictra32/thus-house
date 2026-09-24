export default function Footer() {
  return (
    <footer className="flex flex-col justify-between gap-2 border-t border-line px-[6vw] py-7 text-xs text-subtle sm:flex-row">
      <span>© {new Date().getFullYear()} Thushouse</span>
      <span>Learn · Practice · Improve</span>
    </footer>
  );
}
