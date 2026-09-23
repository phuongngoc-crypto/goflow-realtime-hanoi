import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const searchSchema = z.object({
  demo: z.union([z.string(), z.number()]).optional().transform((v) => (v === undefined ? undefined : String(v))),
});

export const Route = createFileRoute("/dang-nhap")({
  validateSearch: (search) => searchSchema.parse(search),
  head: () => ({
    meta: [
      { title: "Đăng nhập GoFlow - Nhắc bạn đúng hẹn" },
      {
        name: "description",
        content:
          "Đăng nhập GoFlow để lưu nơi ở, lịch trình riêng và đánh giá các chuyến đi tại Hà Nội.",
      },
      { property: "og:title", content: "Đăng nhập GoFlow" },
      {
        property: "og:description",
        content: "Mỗi người một nơi ở và một lịch biểu riêng trên GoFlow.",
      },
    ],
  }),
  component: AuthPage,
});

const DEMO_EMAIL = "demo.goflow@hanoi.vn";
const DEMO_PASSWORD = "GoFlowDemo2026!";

function AuthPage() {
  const navigate = useNavigate();
  const { demo } = Route.useSearch();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [demoBusy, setDemoBusy] = useState(false);

  async function demoLogin() {
    setDemoBusy(true);
    const signIn = await supabase.auth.signInWithPassword({
      email: DEMO_EMAIL,
      password: DEMO_PASSWORD,
    });
    if (signIn.error) {
      const signUp = await supabase.auth.signUp({
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        options: { data: { display_name: "Bạn dùng thử GoFlow" } },
      });
      if (signUp.error) {
        setDemoBusy(false);
        toast.error("Không vào được tài khoản demo, thử lại sau nhé");
        return;
      }
      if (!signUp.data.session) {
        await supabase.auth.signInWithPassword({
          email: DEMO_EMAIL,
          password: DEMO_PASSWORD,
        });
      }
    }
    toast.success("Đã vào tài khoản dùng thử!");
    setDemoBusy(false);
    void navigate({ to: "/" });
  }

  useEffect(() => {
    if (demo === "1") void demoLogin();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [demo]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    if (mode === "signup") {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { emailRedirectTo: window.location.origin },
      });
      setBusy(false);
      if (error) {
        toast.error(error.message);
        return;
      }
      toast.success("Tạo tài khoản thành công!");
      void navigate({ to: "/" });
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) {
      toast.error("Email hoặc mật khẩu chưa đúng");
      return;
    }
    toast.success("Chào mừng bạn trở lại!");
    void navigate({ to: "/" });
  }

  return (
    <main className="mx-auto flex max-w-md flex-col gap-4 px-4 py-10">
      <div className="forest-panel rounded-3xl p-6 text-center">
        <h1 className="text-2xl font-extrabold text-primary-foreground">
          GoFlow - Nhắc bạn đúng hẹn
        </h1>
        <p className="mt-1 text-sm font-semibold text-accent">
          Tối ưu di chuyển, tận hưởng hành trình
        </p>
      </div>

      <div className="glass-card p-6">
        <div className="mb-5 grid grid-cols-2 gap-1 rounded-2xl bg-secondary p-1">
          {(["signin", "signup"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`rounded-xl py-2 text-sm font-bold transition ${
                mode === m
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-secondary-foreground"
              }`}
            >
              {m === "signin" ? "Đăng nhập" : "Đăng ký"}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wide">Email</Label>
            <Input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="ban@email.com"
              className="h-12 rounded-2xl bg-secondary/40 font-semibold"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-bold uppercase tracking-wide">Mật khẩu</Label>
            <Input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Tối thiểu 6 ký tự"
              className="h-12 rounded-2xl bg-secondary/40 font-semibold"
            />
          </div>
          <Button type="submit" disabled={busy} className="h-12 w-full rounded-2xl font-bold">
            {busy && <Loader2 className="size-4 animate-spin" />}
            {mode === "signin" ? "Đăng nhập" : "Tạo tài khoản"}
          </Button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs font-bold text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          HOẶC
          <span className="h-px flex-1 bg-border" />
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={() => void demoLogin()}
          disabled={demoBusy}
          className="h-12 w-full rounded-2xl font-bold"
        >
          {demoBusy ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
          ĐĂNG NHẬP NHANH DEMO 1-CLICK
        </Button>
      </div>
    </main>
  );
}
