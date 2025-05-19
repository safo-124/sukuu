// File: app/(portals)/superadmin/dashboard/loading.jsx
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { School, Users, Settings, BarChart3, PlusCircle } from "lucide-react";

export default function DashboardLoading() {
  return (
    <>
      {/* Page Header Skeleton */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <Skeleton className="h-10 w-72 mb-2" /> {/* Title */}
          <Skeleton className="h-6 w-96" />      {/* Description */}
        </div>
        <Skeleton className="h-12 w-full sm:w-48" /> {/* Create School Button */}
      </div>

      {/* Stats Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 mb-8">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" /> {/* Card Title */}
              <Skeleton className="h-5 w-5" />   {/* Icon */}
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-1" /> {/* Stat Value */}
              <Skeleton className="h-3 w-32" />     {/* Stat Description */}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions / Recent Schools Skeleton */}
      <div>
        <Skeleton className="h-8 w-48 mb-4" /> {/* Section Title */}
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="h-full">
              <CardHeader>
                <Skeleton className="h-6 w-3/4" /> {/* Card Title */}
              </CardHeader>
              <CardContent>
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-5/6" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </>
  );
}