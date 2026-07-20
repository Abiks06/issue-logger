import Link from "next/link";
import { Button, TextField } from "@radix-ui/themes";

const IssuesPage = () => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      <TextField.Root placeholder="Search issues..." variant="classic" radius="large" style={{ width: "100%", maxWidth: "820px" }}>
        <TextField.Slot>
          <span aria-hidden="true">🔍</span>
        </TextField.Slot>
      </TextField.Root>

      <Button size="3" variant="surface" color="cyan" style={{ width: "fit-content" }} highContrast>
        <Link href="/issues/new" style={{ textDecoration: "none" }}>
          New Issue
        </Link>
      </Button>
    </div>
  );
};

export default IssuesPage;
