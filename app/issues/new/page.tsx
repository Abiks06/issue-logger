"use client";

import dynamic from "next/dynamic";
import { TextField, Button, Callout, Spinner } from "@radix-ui/themes";
import "easymde/dist/easymde.min.css";
import { useForm, Controller } from "react-hook-form";
import axios from "axios";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { createIssueSchema } from "@/app/validationSchemas";
import { z } from "zod";
import ErrorMessage from "@/app/components/ErrorMessage";

const SimpleMDE = dynamic(() => import("react-simplemde-editor"), {
  ssr: false,
  loading: () => (
    <div className="w-full max-w-180 h-55 rounded-md border border-gray-300"></div>
  ),
});

type issueForm = z.infer<typeof createIssueSchema>;

const NewIssuesPage = () => {
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm<issueForm>({
    resolver: zodResolver(createIssueSchema),
  });
  const router = useRouter();
  const [error, seterror] = useState("");
  const [isSubmitting, setSubmitting] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8 dark:bg-slate-950 ">
      <div className="mx-auto flex w-full max-w-2xl flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-[0_18px_45px_-20px_rgba(15,23,42,0.45)] sm:p-8 dark:border-slate-800 dark:bg-slate-900 dark:shadow-[0_24px_60px_-24px_rgba(0,0,0,0.85)]">
        {error && (
          <Callout.Root
            variant="surface"
            size="2"
            color="red"
            highContrast
            className="mb-5 w-full"
          >
            <Callout.Text className="text-center">{error}</Callout.Text>
          </Callout.Root>
        )}

        <form
          className="flex w-full flex-col gap-4"
          onSubmit={handleSubmit(async (data) => {
            try {
              setSubmitting(true);
              await axios.post("/api/issues", data);
              router.push("/issues");
            } catch (error) {
              setSubmitting(false); 
              seterror("An unexpected error occured");
            }
          })}
        >
          <div className="flex flex-col gap-2">
            <TextField.Root
              placeholder="Title..."
              radius="large"
              size="3"
              variant="surface"
              className="w-full"
              {...register("title")}
            />
            <ErrorMessage>{errors.title?.message}</ErrorMessage>
          </div>

          <div className="flex flex-col gap-2">
            <div className="w-full">
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
            <ErrorMessage>{errors.description?.message}</ErrorMessage>
          </div>

          <Button
            size="3"
            variant="surface"
            color="cyan"
            highContrast
            disabled = {isSubmitting}
            className="mt-2 w-fit"
          >
            Create Issue {isSubmitting && <Spinner />}
          </Button>
        </form>
      </div>
    </div>
  );
};

export default NewIssuesPage;
