import { PropsWithChildren, Suspense } from 'react';
import AuthenticationGuard from '@/components/AuthenticationGuard';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from '@/components/AppSidebar';
import { SiteHeader } from '@/components/SiteHeader';

export default function AuthenticatedLayout({ children }: PropsWithChildren) {
  return (
    <Suspense>
      <AuthenticationGuard>
        <div className="[--header-height:calc(theme(spacing.14))] bg-secondary">
          <SidebarProvider className="flex flex-col h-[100dvh] overflow-y-hidden">
            <SiteHeader />
            <div className="flex flex-1 h-full overflow-hidden">
              <AppSidebar />
              <SidebarInset className="h-full">
                <div className="bg-secondary py-2 pl-1 pr-2 w-full h-full">
                  <div className="w-full h-full bg-background rounded-md overflow-scroll">
                    {children}
                  </div>
                </div>
              </SidebarInset>
            </div>
          </SidebarProvider>
        </div>
      </AuthenticationGuard>
    </Suspense>
  );
}
