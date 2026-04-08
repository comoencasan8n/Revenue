import React from 'react';
import { 
  LayoutDashboard, 
  Table as TableIcon, 
  Settings, 
  TrendingUp, 
  Building2, 
  Users,
  LogOut,
  Menu,
  X,
  Receipt
} from 'lucide-react';
import { cn } from '@/src/lib/utils';
import { Button } from '@/src/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/src/components/ui/sheet';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'matrix', label: 'Revenue Matrix', icon: TableIcon },
  { id: 'expenses', label: 'Gastos (Excel)', icon: Receipt },
  { id: 'buildings', label: 'Edificios', icon: Building2 },
  { id: 'admin', label: 'Mi Cuenta', icon: Settings },
];

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-950 text-slate-50">
      <div className="p-6">
        <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
          <TrendingUp className="text-blue-500" />
          <span>Como en Casa</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1 uppercase tracking-widest">Revenue & Profit</p>
      </div>
      
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
              setIsMobileMenuOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              activeTab === item.id 
                ? "bg-blue-600 text-white" 
                : "text-slate-400 hover:text-white hover:bg-slate-900"
            )}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-slate-900">
        <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Capa de Decisión v1.0</p>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="hidden md:block w-64 flex-shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Header */}
      <div className="flex flex-col flex-1 overflow-hidden">
        <header className="md:hidden flex items-center justify-between p-4 bg-slate-950 text-white">
          <h1 className="text-lg font-bold">Como en Casa</h1>
          <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="p-0 w-64 bg-slate-950 border-r-slate-900">
              <SidebarContent />
            </SheetContent>
          </Sheet>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
