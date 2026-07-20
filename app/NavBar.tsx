"use client";

import Link from "next/link";
import { IoMdBug } from "react-icons/io";
import { MdOutlineDashboard } from "react-icons/md";
import { FaTools } from "react-icons/fa";
import { usePathname } from "next/navigation";
import classNames from "classnames";

const NavBar = () => {
  const links = [
    { label: "Dashboard", href: "/", icon: <MdOutlineDashboard /> },
    { label: "Issues", href: "/issues", icon: <IoMdBug /> },
  ];
  const currentPathname = usePathname();

  return (
    <nav className="flex items-center justify-between bg-gray-700 border-b-2 border-black p-5">
      <div className="flex items-center p-5 text-gray-300">
        <Link href="/">
          <FaTools />
        </Link>
      </div>
      <ul className="flex space-x-30 items-center pr-15">
        {links.map((link) => {
          const isActive =
            link.href === "/"
              ? currentPathname === "/"
              : currentPathname === link.href || currentPathname.startsWith(`${link.href}/`);

          return (
            <li key={link.href} className="flex items-center p-5">
              <Link
                href={link.href}
                className={classNames({
                  "text-red-300": isActive,
                  "text-gray-300": !isActive,
                  "hover:text-zinc-100 hover:font-bold transition-colors flex items-center": true,
                })}
              >
                {link.icon}
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};

export default NavBar;
