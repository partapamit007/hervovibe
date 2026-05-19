import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Mail, Phone, Calendar, User, Hash, Shield } from "lucide-react";

const rankColors: Record<string, string> = {
  DISTRIBUTOR:   "bg-gray-100 text-gray-700",
  BRONZE:        "bg-amber-100 text-amber-700",
  SILVER:        "bg-slate-100 text-slate-600",
  GOLDEN:        "bg-yellow-100 text-yellow-700",
  DIAMOND:       "bg-blue-100 text-blue-700",
  SUPER_DIAMOND: "bg-blue-200 text-blue-800",
  PLATINUM:      "bg-purple-100 text-purple-700",
  CENTENNIAL:    "bg-green-100 text-green-700",
};

export default async function ProfilePage() {
  const session = await auth();
  const userId = session?.user?.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      memberId: true,
      rank: true,
      status: true,
      joiningDate: true,
      sponsor: { select: { name: true, memberId: true } },
    },
  });

  if (!user) {
    return (
      <div className="text-center py-12 text-gray-400">
        Profile not found
      </div>
    );
  }

  const fields = [
    {
      icon: Mail,
      label: "Email",
      value: user.email,
      color: "text-blue-500",
      bg: "bg-blue-50",
    },
    {
      icon: Phone,
      label: "Phone",
      value: user.phone || "Not provided",
      color: "text-green-500",
      bg: "bg-green-50",
    },
    {
      icon: Hash,
      label: "Member ID",
      value: user.memberId || "—",
      color: "text-purple-500",
      bg: "bg-purple-50",
    },
    {
      icon: Calendar,
      label: "Joining Date",
      value: new Date(user.joiningDate).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
      }),
      color: "text-amber-500",
      bg: "bg-amber-50",
    },
    {
      icon: User,
      label: "Sponsor",
      value: user.sponsor
        ? `${user.sponsor.name} (${user.sponsor.memberId})`
        : "No sponsor",
      color: "text-indigo-500",
      bg: "bg-indigo-50",
    },
    {
      icon: Shield,
      label: "Status",
      value: user.status,
      color:
        user.status === "ACTIVE" ? "text-green-500" : "text-red-500",
      bg: user.status === "ACTIVE" ? "bg-green-50" : "bg-red-50",
    },
  ];

  return (
    <div className="max-w-lg mx-auto">
      {/* Avatar / Hero */}
      <Card className="mb-5">
        <CardContent className="p-6 flex flex-col items-center text-center">
          <div className="w-20 h-20 rounded-full bg-green-600 flex items-center justify-center text-white font-bold text-3xl mb-4 shadow-lg shadow-green-200">
            {user.name.charAt(0).toUpperCase()}
          </div>
          <h1 className="text-xl font-bold text-gray-900">{user.name}</h1>
          {user.memberId && (
            <p className="text-sm text-gray-500 mt-0.5">{user.memberId}</p>
          )}
          <div className="flex gap-2 mt-3">
            <Badge
              className={`text-xs ${rankColors[user.rank] ?? "bg-gray-100 text-gray-700"}`}
            >
              {user.rank.replace(/_/g, " ")}
            </Badge>
            <Badge
              className={`text-xs ${
                user.status === "ACTIVE"
                  ? "bg-green-100 text-green-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              {user.status}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Fields */}
      <Card>
        <CardContent className="p-5 divide-y divide-gray-100">
          {fields.map((field) => {
            const Icon = field.icon;
            return (
              <div
                key={field.label}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div
                  className={`w-9 h-9 rounded-lg ${field.bg} flex items-center justify-center shrink-0`}
                >
                  <Icon className={`w-4 h-4 ${field.color}`} />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-gray-500">{field.label}</p>
                  <p className="text-sm font-medium text-gray-800 truncate">
                    {field.value}
                  </p>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
