import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    /** Whether "Keep me signed in" was ticked at login. */
    remember?: boolean;
  }

  interface User {
    remember?: boolean;
    sessionVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    /** User.sessionVersion when this token was issued. */
    sv?: number;
    remember?: boolean;
    lastSeen?: number;
    checkedAt?: number;
  }
}
