'use client';

import { Button } from '@/components/ui/button';
import { Sparkles, Settings, Brain, LogOut, User, Activity } from 'lucide-react';
import { useDashboardStore } from '@/lib/store';
import { useTheme } from '@/components/theme-provider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

interface HeaderProps {
  onGenerateBrief: () => void;
  onOpenSettings: () => void;
  isGenerating: boolean;
}

export function Header({ onGenerateBrief, onOpenSettings, isGenerating }: HeaderProps) {
  const { user, logout } = useDashboardStore();
  const { t } = useTheme();

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-xl shadow-lg border-border">
      <div className="container flex h-16 items-center justify-between px-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="absolute -inset-1 bg-primary/20 rounded-full blur-sm animate-pulse"></div>
            <div className="relative bg-background border border-primary/30 p-1.5 rounded-lg">
              <Activity className="h-6 w-6 text-primary" />
            </div>
          </div>
          <div>
            <h1 className="text-lg font-display font-bold text-foreground">
              {t('appName')}
            </h1>
            <p className="text-[10px] text-muted-foreground">
              {t('appTagline')}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <Button
            onClick={onGenerateBrief}
            disabled={isGenerating}
            className="hidden md:flex bg-primary/20 text-primary border-primary/50 hover:bg-primary/30 shadow-glow-sm font-mono text-xs uppercase tracking-wider font-bold h-9"
          >
            {isGenerating ? (
              <>
                <Sparkles className="mr-2 h-4 w-4 animate-spin" />
                Processing...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Generate Brief
              </>
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onOpenSettings}
            className="text-muted-foreground hover:text-primary hover:bg-primary/10"
          >
            <Settings className="h-5 w-5" />
          </Button>

          {user && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full ring-2 ring-primary/20 hover:ring-primary/50 transition-all p-0 overflow-hidden">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-primary/20 text-primary font-bold">
                      {user.displayName?.charAt(0).toUpperCase() || user.email?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56 glass-panel border-border text-foreground" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none font-display tracking-wide">{user.displayName || 'Agent'}</p>
                    <p className="text-xs leading-none text-muted-foreground font-mono">
                      {user.email}
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem onClick={onOpenSettings} className="focus:bg-primary/10 focus:text-primary cursor-pointer">
                  <Settings className="mr-2 h-4 w-4" />
                  <span>{t('settings')}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border" />
                <DropdownMenuItem onClick={logout} className="focus:bg-destructive/10 focus:text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
