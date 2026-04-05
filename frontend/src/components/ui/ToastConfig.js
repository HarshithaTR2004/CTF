import { toast } from "react-toastify";

export const successToast = (msg) =>
  toast.success(msg, {
    position: "top-right",
    autoClose: 3000,
    theme: "dark",
  });

export const errorToast = (msg) =>
  toast.error(msg, {
    position: "top-right",
    autoClose: 3000,
    theme: "dark",
  });

export const infoToast = (msg) =>
  toast.info(msg, {
    position: "top-right",
    autoClose: 3000,
    theme: "dark",
  });
