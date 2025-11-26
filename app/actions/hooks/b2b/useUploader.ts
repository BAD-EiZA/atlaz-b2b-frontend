import { useMutation } from "@tanstack/react-query";
import axios from "axios";

export const UsePostUploader = () => {
  return useMutation({
    mutationFn: async (data: FormData) => {
      try {
        const response = await axios.post(`/api/s3-upload`, data, {});
        return response.data;
      } catch (error) {
        console.error("Error upload: ", error);
      }
    },
  });
};
