import { MutateOptions } from "@tanstack/react-query";
import { UseFormSetValue } from "react-hook-form";

export const UploadDropzoneS3 = async (
  acceptedFiles: File[],
  Mutate: (
    variables: FormData,
    options?: MutateOptions<any, Error, FormData, unknown> | undefined
  ) => void,
  Value: UseFormSetValue<any>,
  Type: string,
  CustomType?:string
) => {
  const file = acceptedFiles[0];
  const formData = new FormData();
  formData.append("file", file);
  Mutate(formData, {
    onSuccess: (response: any) => {
      Value(Type, response.url);
      Value(CustomType!, true)
    },
  });
};