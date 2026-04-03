import { toast as sonnerToast } from 'sonner'

export type ToastType = 'success' | 'error' | 'info' | 'loading'

interface ToastOptions {
  duration?: number
  description?: string
}

export const useToast = () => {
  return {
    success: (message: string, options?: ToastOptions) =>
      sonnerToast.success(message, {
        duration: options?.duration ?? 3000,
        description: options?.description,
      }),

    error: (message: string, options?: ToastOptions) =>
      sonnerToast.error(message, {
        duration: options?.duration ?? 4000,
        description: options?.description,
      }),

    info: (message: string, options?: ToastOptions) =>
      sonnerToast.info(message, {
        duration: options?.duration ?? 3000,
        description: options?.description,
      }),

    loading: (message: string) =>
      sonnerToast.loading(message),

    dismiss: (toastId?: string | number) =>
      sonnerToast.dismiss(toastId),

    promise: <T,>(
      promise: Promise<T>,
      messages: {
        loading: string
        success: string
        error: string
      },
      options?: ToastOptions
    ) =>
      sonnerToast.promise(promise, {
        loading: messages.loading,
        success: messages.success,
        error: messages.error,
      }),
  }
}
