"use client";

import dynamic from "next/dynamic";
import { TextField, Button, Callout } from "@radix-ui/themes";
import "easymde/dist/easymde.min.css";
import { useForm, Controller } from "react-hook-form";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";

const SimpleMDE = dynamic(() => import("react-simplemde-editor"), {
  ssr: false,
  loading: () => (
    <div className="w-full max-w-180 h-55 rounded-md border border-gray-300"></div>
  ),
});

interface IssueForm {
  title: string;
  description: string;
}

const NewIssuesPage = () => {
  const { register, control, handleSubmit } = useForm<IssueForm>();
  const router = useRouter();
  const [error, seterror] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-2xl flex flex-col items-center ">
        {error && (
          <Callout.Root
            variant="surface"
            size="2"
            color="red"
            highContrast
            style={{ width: "100%", maxWidth: "720px" }}
            className="mb-5"
          >
            <Callout.Text className="text-center">{error}</Callout.Text>
          </Callout.Root>
        )}
        <form
          className="w-full flex flex-col items-center space-y-1.5"
          onSubmit={handleSubmit(async (data) => {
            try {
              await axios.post("/api/issues", data);
              router.push("/issues");
            } catch (error) {
              seterror("An unexpected error occured");
            }
          })}
        >
          <TextField.Root
            placeholder="Title..."
            radius="large"
            size="3"
            variant="surface"
            style={{ width: "100%", maxWidth: "720px" }}
            {...register("title")}
          />
          <div className="w-full max-w-180">
            <Controller
              name="description"
              control={control}
              render={({ field: { ref, value, ...rest } }) => (
                <SimpleMDE
                  placeholder="Issue description..."
                  value={value || ""}
                  {...rest}
                />
              )}
            />
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
        </form>
      </div>
    </div>
  );
};

export default NewIssuesPage;
