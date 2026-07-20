import { TextArea, TextField, Button } from "@radix-ui/themes";
import React from "react";

const NewIssuesPage = () => {
  return (
    <div className="max-w-xl space-y-3.5">
      <TextField.Root
        placeholder="Title..."
        radius="large"
        size="3"
        variant="surface"
      />
      <TextArea placeholder="Issue description..." size="3" variant="surface" />
      <Button
        size="2"
        variant="surface"
        color="cyan"
        style={{ width: "fit-content" }}
        highContrast
      >
        Create Issue
      </Button>
    </div>
  );
};

export default NewIssuesPage;
