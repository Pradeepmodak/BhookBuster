import axios from "axios";

interface ErrorResponseShape {
  message?: string;
}

export const getErrorMessage = (error: unknown, fallback: string) => {
  if (axios.isAxiosError<ErrorResponseShape>(error)) {
    return error.response?.data?.message || error.message || fallback;
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
};
