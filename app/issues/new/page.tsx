"use client";

import dynamic from "next/dynamic";
import { TextField, Button } from "@radix-ui/themes";
import "easymde/dist/easymde.min.css";

const SimpleMDE = (dynamic(()=> import("react-simplemde-editor"),{
  ssr: false,
  loading: () => <div className="w-full max-w-180 h-55 rounded-md border border-gray-300"></div>
}))

const NewIssuesPage = () => {
  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-2xl flex flex-col items-center space-y-4">
        <TextField.Root
          placeholder="Title..."
          radius="large"
          size="3"
          variant="surface"
          style={{ width: "100%", maxWidth: "720px" }}
        />
        <div className="w-full max-w-180">
          <SimpleMDE placeholder="Issue description..." />
        </div>
        <Button
          size="3"
          variant="surface"
          color="cyan"
          style={{ width: "fit-content" }}
          highContrast
        >
          Create Issue
        </Button>
      </div>
    </div>
  );
};

export default NewIssuesPage;
