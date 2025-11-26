/**
 * @author Void
 * Uploader Component
 *
 * A versatile file uploader component built using `react-dropzone` for drag-and-drop functionality and S3 upload capabilities.
 * It supports custom UI rendering and error handling.
 *
 * Props:
 *  - `Title`: The title/label for the uploader (e.g., "Upload Image").
 *  - `Size`: The maximum allowed file size (e.g., "5MB").
 *  - `SupportFile`:  A string describing the supported file types (e.g., "JPG, PNG, GIF").
 *  - `FileOnDrop`: An array of accepted MIME types (e.g., `["image/jpeg", "image/png"]`).  This is used by `react-dropzone` to filter accepted files.
 *  - `isError`: A `FieldError` object from `react-hook-form`, indicating a validation error.
 *  - `maxSize`: The maximum file size in bytes.
 *  - `Mutate`:  The `mutate` function from a Tanstack Query mutation.  This function is called to upload the file to S3.
 *  - `Value`: The `setValue` function from `react-hook-form`. This is used to update the form's state with the uploaded file's information.
 *  - `Type`: A string identifying the type of file being uploaded.
 *  - `children?: React.ReactNode`: (Optional) Custom content to render inside the dropzone area. Used when `isCustom` is `true`.
 *  - `isCustom?: boolean`: (Optional)  If `true`, the default uploader UI is replaced with the `children` prop.  Defaults to `false`.
 *   - `customValue?: UseFormSetValue<any>`: custom set value for form.
 *   - `customType?: string`: Custom type for identify different uploader.
 *
 * `react-dropzone`:
 *  - `useDropzone`:  A hook from `react-dropzone` that provides drag-and-drop functionality.
 *    - `onDrop`:  A callback function that is called when files are dropped onto the dropzone.  It calls `UploadDropzoneS3` to handle the actual upload.
 *    - `accept`:  An object specifying the accepted MIME types.
 *    - `maxSize`:  The maximum file size in bytes.
 *  - `getRootProps`, `getInputProps`:  Functions from `useDropzone` that provide props to be spread onto the root element and input element, respectively.
 *
 * `UploadDropzoneS3`:
 *    -This function is not part of this component code, but is a dependency. It takes as parameters: `acceptedFiles`, `Mutate`, `Value`, `Type`,`customType`.
 *
 * Rendering:
 *  - A `div` element acts as the dropzone area.  The `getRootProps` are spread onto this element.
 *  - An `input` element (hidden) is used to handle file selection.  The `getInputProps` are spread onto this element.
 *  - Conditional rendering:
 *    - If `isError` is true, the dropzone border is styled to indicate an error (red).
 *    - If `isCustom` is true, the `children` prop is rendered.
 *    - Otherwise (default), the standard uploader UI is rendered:
 *      - A button-like element with a "Plus" icon and the `Title`.
 *      - Text displaying the maximum file size (`Size`).
 *      - Text displaying the supported file types (`SupportFile`).
 *
 * Styling:
 *  - Uses Tailwind CSS classes for styling, including:
 *    - `border-2`, `border-dashed`:  Creates a dashed border.
 *    - `border-red-400` (error), `border-custom-blue-cons` (default):  Border colors.
 *    - `rounded-md`: Rounded corners.
 *    - `text-center`: Centers text horizontally.
 *    - `cursor-pointer`: Changes the cursor to a pointer on hover.
 *    - `flex`, `flex-col`, `justify-center`, `items-center`, `space-x-4`, `py-10`:  Flexbox for layout.
 *    - `bg-blue-400`, `bg-white`:  Background colors.
 *    - `text-white`, `text-[#777777]`: Text colors.
 *    - `text-sm`, `font-normal`:  Text size and weight.
 */

import { UploadDropzoneS3 } from "@/helper/api";
import { MutateOptions } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useDropzone } from "react-dropzone";
import { FieldError, FieldErrors, UseFormSetValue } from "react-hook-form";

interface Props {
  Title: string;
  Size: string;
  SupportFile: string;
  FileOnDrop: string[];
  isError: FieldError;
  Mutate: (
    variables: FormData,
    options?: MutateOptions<any, Error, FormData, unknown> | undefined
  ) => void;
  Value: UseFormSetValue<any>;
  Type: string;
  maxSize: number;
  isCustom?: boolean;
  children?: React.ReactNode;
  customValue?:  UseFormSetValue<any>,
  customType?:string
}

const Uploader = ({
  Size,
  SupportFile,
  Title,
  FileOnDrop,
  isError,
  maxSize,
  Mutate,
  Type,
  children,
  isCustom,
  Value,
  customValue,
  customType
}: Props) => {
  const { getRootProps, getInputProps } = useDropzone({
    onDrop(acceptedFiles) {
      UploadDropzoneS3(acceptedFiles, Mutate, Value, Type, customType);
    },
    accept: {
     FileOnDrop
    },
    maxSize: maxSize,
  });
  return (
    <div
      {...getRootProps()}
      className={`${
        isError
          ? "border-2 border-dashed border-red-400 rounded-md text-center cursor-pointer"
          : "border-2 border-dashed border-custom-blue-cons rounded-md w-full text-center cursor-pointer"
      }`}
    >
      <input {...getInputProps()} />
      {isCustom ? (
        <>{children}</>
      ) : (
        <>
          <div className="flex flex-col justify-center items-center py-10 bg-white ">
            <div className="flex flex-row justify-center space-x-4 px-3 items-center bg-blue-400 border rounded-xl p-2 w-40">
              <Plus color="white" />
              <span className="text-white text-sm">{Title}</span>
            </div>
            <span className="pt-3 font-normal text-[#777777]">
              Max. file size: {Size}
            </span>
            <span className="font-normal text-[#777777]">
              Supported file types: {SupportFile}
            </span>
          </div>
        </>
      )}
    </div>
  );
};

export default Uploader;
