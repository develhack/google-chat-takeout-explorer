import { Spinner } from "@/components/ui/spinner";

export default function Loading() {
  return (
    <div className="absolute w-full h-4 z-10 [&:not([style*='display: none']):last:not-first:static [&:not([style*='display: none']):last:not-first:-mt-4 grid place-items-center">
      <Spinner />
    </div>
  );
}
