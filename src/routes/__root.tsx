import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  useRouter,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";
import { CalendarRange, LogOut, Sparkles, UserRound } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/hooks/useSession";
import goflowLogo from "@/assets/goflow-logo.png";

import appCss from "../styles.css?url";
import { reportLovableError } from "../lib/lovable-error-reporting";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-card max-w-md p-8 text-center">
        <h1 className="text-6xl font-extrabold brand-gradient-text">404</h1>
        <h2 className="mt-3 text-xl font-bold">Không tìm thấy trang</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Trang bạn tìm không tồn tại hoặc đã được chuyển đi.
        </p>
        <Button asChild className="mt-6 rounded-2xl font-bold">
          <Link to="/">Về trang chủ</Link>
        </Button>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();
  useEffect(() => {
    reportLovableError(error, { boundary: "tanstack_root_error_component" });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="glass-card max-w-md p-8 text-center">
        <h1 className="text-xl font-bold">Trang chưa tải được</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Có lỗi xảy ra. Bạn thử tải lại hoặc quay về trang chủ nhé.
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button
            className="rounded-2xl font-bold"
            onClick={() => {
              router.invalidate();
              reset();
            }}
          >
            Thử lại
          </Button>
          <Button asChild variant="secondary" className="rounded-2xl font-bold">
            <a href="/">Về trang chủ</a>
          </Button>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "GoFlow - Nhắc bạn đúng hẹn" },
      {
        name: "description",
        content:
          "GoFlow theo dõi kẹt xe Hà Nội thời gian thực và nhắc bạn giờ vàng xuất phát để luôn đúng hẹn.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap",
      },
      { rel: "icon", href: "/favicon.ico", type: "image/x-icon" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  );
}

function Navbar() {
  const { user } = useSession();
  const router = useRouter();

  async function signOut() {
    await supabase.auth.signOut();
    router.invalidate();
  }

  return (
    <header className="sticky top-0 z-[800] border-b border-primary/30 bg-foreground text-primary-foreground shadow-soft">
      <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
        <Link to="/" className="flex items-center font-extrabold">
          <img src={goflowLogo} alt="GoFlow" className="h-11 w-auto max-w-[170px] object-contain" />
        </Link>

        <nav className="ml-2 hidden items-center gap-1 sm:flex">
          <Link
            to="/"
            activeOptions={{ exact: true }}
            className="rounded-2xl px-3 py-2 text-sm font-bold opacity-80 transition hover:bg-primary-foreground/10"
            activeProps={{ className: "bg-accent text-accent-foreground opacity-100" }}
          >
            Hành trình
          </Link>
          <Link
            to="/lich-trinh"
            className="rounded-2xl px-3 py-2 text-sm font-bold opacity-80 transition hover:bg-primary-foreground/10"
            activeProps={{ className: "bg-accent text-accent-foreground opacity-100" }}
          >
            Lịch trình
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link
            to="/lich-trinh"
            className="rounded-2xl p-2 sm:hidden"
            aria-label="Lịch trình"
          >
            <CalendarRange className="size-5" />
          </Link>
          {user ? (
            <>
              <span className="hidden max-w-[160px] truncate rounded-2xl bg-primary-foreground/10 px-3 py-2 text-xs font-bold md:block">
                <UserRound className="mr-1 inline size-3.5" />
                {user.email}
              </span>
              <Button
                onClick={() => void signOut()}
                variant="secondary"
                className="h-10 rounded-2xl font-bold"
              >
                <LogOut className="size-4" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </Button>
            </>
          ) : (
            <>
              <Button asChild variant="secondary" className="h-10 rounded-2xl font-bold">
                <Link to="/dang-nhap">Đăng nhập / Đăng ký</Link>
              </Button>
              <Button
                asChild
                variant="outline"
                 className="hidden h-10 rounded-2xl border-primary-foreground/40 bg-transparent font-bold text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground sm:flex"
              >
                <Link to="/dang-nhap" search={{ demo: "1" }}>
                  <Sparkles className="size-4" />
                  Demo 1-click
                </Link>
              </Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen">
        <Navbar />
        {/* Required: nested routes render here. */}
        <Outlet />
        <footer className="mt-6 bg-foreground px-4 py-9 text-center text-xs font-bold text-primary-foreground/70">
          <span className="text-accent">GoFlow</span> · Tối ưu di chuyển, tận hưởng hành trình
        </footer>
      </div>
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
