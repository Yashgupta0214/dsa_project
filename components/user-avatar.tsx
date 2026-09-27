import React from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import { User } from "lucide-react";

interface UserAvatarProps {
  src?: string;
  name?: string;
  className?: string;
}

export function UserAvatar({ src, name, className }: UserAvatarProps) {
  const initial = name?.charAt(0).toUpperCase();

  return (
    <Avatar className={cn("h-7 w-7 md:h-10 md:w-10", className)}>
      <AvatarImage src={src} className="object-cover" />
      <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs uppercase">
        {initial || <User className="h-4 w-4 text-white" />}
      </AvatarFallback>
    </Avatar>
  );
}
