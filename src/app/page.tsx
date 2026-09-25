import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function HomePage() {
  return (
    <main className="relative flex min-h-full flex-1 flex-col overflow-hidden">
      <div className="pointer-events-none absolute inset-0 grid-fade opacity-70" />
      <div className="relative mx-auto flex w-full max-w-5xl flex-1 flex-col justify-center px-5 py-12 sm:px-8">
        <div className="rise-in max-w-2xl">
          <p className="font-display text-5xl font-semibold tracking-tight text-ink sm:text-6xl md:text-7xl">
            排发助手
          </p>
          <h1 className="mt-5 text-xl font-medium text-foreground sm:text-2xl">
            按期管理谷子库存，按序完成排发。
          </h1>
          <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            发货方维护模块与库存；收货方登记需求与顺序。库存够时一键发货，自动扣减并进入已清货。
          </p>
          <div className="rise-in-delay mt-8 flex flex-wrap gap-3">
            <Button size="lg" className="min-w-28" render={<Link href="/login" />}>
              登录
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="min-w-28"
              render={<Link href="/register" />}
            >
              收货方注册
            </Button>
          </div>
        </div>

        <div className="rise-in-late mt-14 grid gap-4 sm:grid-cols-2">
          <section className="rounded-2xl border border-border/80 bg-surface/80 p-5 shadow-sm shadow-ink/5">
            <p className="text-xs font-medium tracking-wide text-sea uppercase">发货方</p>
            <p className="mt-2 font-display text-xl font-semibold text-ink">库存与发货</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              创建模块（哪一期谷子），录入谷子名与数量；按排发顺序查看可排发名单并执行发货。
            </p>
          </section>
          <section className="rounded-2xl border border-border/80 bg-surface/80 p-5 shadow-sm shadow-ink/5">
            <p className="text-xs font-medium tracking-wide text-sea uppercase">收货方</p>
            <p className="mt-2 font-display text-xl font-semibold text-ink">登记排发需求</p>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              注册账号后提交谷子名、数量与排发顺序；可查看待排发与已清货状态。
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}
