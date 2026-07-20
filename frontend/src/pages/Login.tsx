import { useState, useRef, useEffect, useCallback } from "react";
import { useForm } from "react-hook-form";
import { useDispatch } from "react-redux";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { LoaderCircle } from "lucide-react";

import { GoogleLogin } from "@react-oauth/google";
import { FcGoogle } from "react-icons/fc";
import {
  clearError,
  loginUser,
  registerUser,
  googleLogin,
} from "@/features/auth/authSlice";
import { useAppSelector } from "@/hooks/useAppStore";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import {
  loginSchema,
  registerSchema,
  type LoginFormData,
  type RegisterFormData,
} from "@/validator/auth";

type AuthMode = "login" | "register";

interface MergedFormData {
  name?: string;
  email: string;
  password: string;
}

const Login = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, error, loading } = useAppSelector((state) => state.auth);

  const [mode, setMode] = useState<AuthMode>(
    (searchParams.get("mode") as AuthMode) || "login",
  );

  const formRef = useRef<HTMLDivElement>(null);
  const emailInputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  const resolver = useCallback((data: MergedFormData) => {
    const schema = modeRef.current === "login" ? loginSchema : registerSchema;
    const result = schema.safeParse(data);
    if (result.success) {
      return { values: result.data as MergedFormData, errors: {} };
    }
    const errors: Record<string, { message: string; type: string }> = {};
    for (const issue of result.error.issues) {
      if (issue.path.length > 0) {
        errors[issue.path[0] as string] = {
          message: issue.message,
          type: issue.code,
        };
      }
    }
    return { values: {}, errors };
  }, []);

  const form = useForm<MergedFormData>({
    resolver,
    defaultValues: { name: "", email: "", password: "" },
  });

  useEffect(() => {
    form.clearErrors();
    const input =
      mode === "login" ? emailInputRef.current : nameInputRef.current;
    input?.focus();
  }, [mode, form]);

  useEffect(() => {
    if (user) {
      toast.success(
        mode === "login" ? "Login successful" : "Registration successful",
      );
      form.reset();
      navigate("/loading");
    } else if (error) {
      toast.error(error);
      dispatch(clearError());
    }
  }, [user, error, form, navigate, dispatch, mode]);

  const handleGoogleSuccess = (credentialResponse: { credential?: string }) => {
    if (credentialResponse.credential) {
      dispatch(googleLogin(credentialResponse.credential) as any);
    }
  };

  const handleSubmit = useCallback(
    (values: MergedFormData) => {
      if (mode === "login") {
        dispatch(loginUser(values as LoginFormData) as any);
      } else {
        dispatch(registerUser(values as RegisterFormData) as any);
      }
    },
    [dispatch, mode],
  );

  // const scrollToForm = () => {
  //   formRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  //   setTimeout(() => {
  //     (mode === "login"
  //       ? emailInputRef.current
  //       : nameInputRef.current
  //     )?.focus();
  //   }, 500);
  // };

  const switchMode = (newMode: AuthMode) => {
    setMode(newMode);
    dispatch(clearError());
    form.clearErrors();
  };

  return (
    <div className="bg-[#121212] h-screen overflow-hidden">
      {/* Hero Section */}
      <div className="w-full h-full flex flex-col lg:flex-row">
        {/* ===================================================================
                                 Left - Image Section
          ===================================================================*/}
        <div className="lg:w-1/2 hidden lg:block">
          <img
            src="/img/home.png"
            alt=""
            className="w-full h-full object-cover"
          />
        </div>

        {/* ===================================================================
                                 Right - Form Section
          ===================================================================*/}
        <div className="lg:w-1/2 flex items-center justify-center p-4 lg:p-10 xl:p-24 w-full h-full overflow-y-auto">
          <div ref={formRef} className="w-full max-w-md mx-auto lg:mx-0">
            {/* Card Container - Only for small screens */}
            <div className="p-2">
              <div className="mb-8 text-center">
                <h2 className="text-2xl font-semibold text-gray-200 mb-1">
                  {mode === "login" ? "Welcome back" : "Create account"}
                </h2>
                <p className="text-gray-400 text-sm">
                  {mode === "login"
                    ? "Let's sign in to explore the chatbot."
                    : "Sign up to get started with Chatbot"}
                </p>
              </div>

              {/* Google Login Button - Moved to Top */}
              <div className="mb-6">
                <div className="relative">
                  <div className="absolute inset-0 opacity-0 z-10">
                    <GoogleLogin
                      onSuccess={handleGoogleSuccess}
                      onError={() => toast.error("Google login failed")}
                      size="large"
                      width="100%"
                      theme="outline"
                    />
                  </div>
                  <button
                    type="button"
                    className="w-full pointer-events-none inline-flex items-center justify-center gap-3 px-4 py-3 bg-white hover:bg-white/80 text-gray-900 rounded-full transition-all duration-200 font-medium text-sm"
                  >
                    <FcGoogle className="w-5 h-5" />
                    Continue with Google
                  </button>
                </div>
              </div>

              {/* Divider */}
              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/10" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-[#121212] font-semibold px-3 text-gray-500">
                    OR
                  </span>
                </div>
              </div>

              {/* ==================================================
                                 Form
               ===================================================*/}
              <Form {...form}>
                <form
                  onSubmit={form.handleSubmit(handleSubmit)}
                  className="flex flex-col gap-5"
                  noValidate
                >
                  {mode === "register" && (
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input
                              {...field}
                              ref={nameInputRef}
                              value={field.value ?? ""}
                              type="text"
                              autoComplete="name"
                              placeholder="Enter your name"
                              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 placeholder:text-sm focus:border-none focus:ring-blue-500/20 h-10"
                            />
                          </FormControl>
                          <FormMessage className="text-xs" />
                        </FormItem>
                      )}
                    />
                  )}

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            ref={mode === "login" ? emailInputRef : undefined}
                            value={field.value ?? ""}
                            type="email"
                            autoComplete="email"
                            placeholder="Enter your email"
                            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 placeholder:text-sm focus:border-none focus:ring-blue-500/20 h-10"
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input
                            {...field}
                            value={field.value ?? ""}
                            type="password"
                            autoComplete={
                              mode === "login"
                                ? "current-password"
                                : "new-password"
                            }
                            placeholder="Enter your password"
                            className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 placeholder:text-sm focus:border-none focus:ring-blue-500/20 h-10"
                          />
                        </FormControl>
                        <FormMessage className="text-xs" />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full bg-gray-800 cursor-pointer border border-gray-600 hover:bg-gray-900 text-gray-200 font-medium py-2.5 h-10 rounded-lg transition-all duration-200"
                    disabled={loading}
                  >
                    {loading ? (
                      <LoaderCircle className="w-5 h-5 animate-spin" />
                    ) : mode === "login" ? (
                      "Sign In"
                    ) : (
                      "Create Account"
                    )}
                  </Button>
                </form>
              </Form>

              <p className="text-center text-sm text-gray-500 mt-6">
                {mode === "login" ? (
                  <>
                    Don't have an account?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("register")}
                      className="text-blue-400 hover:text-blue-300 hover:underline transition cursor-pointer"
                    >
                      Sign up
                    </button>
                  </>
                ) : (
                  <>
                    Already have an account?{" "}
                    <button
                      type="button"
                      onClick={() => switchMode("login")}
                      className="text-blue-400 hover:text-blue-300 hover:underline transition cursor-pointer"
                    >
                      Sign in
                    </button>
                  </>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================
                                  Pricing Section
        ===================================================================*/}
    </div>
  );
};

export default Login;
