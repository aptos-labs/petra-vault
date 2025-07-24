'use client';

import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Trash2, Globe, Shield, Clock } from 'lucide-react';
import { useAppSettings } from '@/context/useAppSettings';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog';

export default function AppsSettingsPage() {
  const { settings, clearSettingsForUrl, clearAllSettings } = useAppSettings();

  const domains = Object.keys(settings);

  const formatLastVisited = (timestamp: number) => {
    if (timestamp === 0) return 'Never';
    return new Date(timestamp).toLocaleDateString();
  };

  const handleClearDomain = (domain: string) => {
    // Convert domain back to URL format for the function
    clearSettingsForUrl(`https://${domain}`);
  };

  const handleClearAll = () => {
    clearAllSettings();
  };

  const getPolicyBadges = (domainSettings: {
    ignoreUnknownAppWarning?: boolean;
  }) => {
    const badges: React.ReactNode[] = [];

    if (domainSettings?.ignoreUnknownAppWarning) {
      badges.push(
        <Badge key="no-warnings" variant="secondary" className="text-xs">
          <Shield className="h-3 w-3 mr-1" />
          No warnings
        </Badge>
      );
    }

    return badges.length > 0
      ? badges
      : [
          <Badge
            key="default"
            variant="outline"
            className="text-xs text-muted-foreground"
          >
            Default
          </Badge>
        ];
  };

  if (domains.length === 0) {
    return (
      <div className="pb-6 md:py-6 flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              App Settings
            </CardTitle>
            <CardDescription>
              Manage your saved preferences for different websites and
              applications.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Globe className="h-12 w-12 mx-auto opacity-50 mb-4" />
              <p>No app settings saved yet.</p>
              <p className="text-sm mt-2">
                When you visit applications and choose to remember your
                preferences, they will appear here.
              </p>
            </div>
          </CardContent>
        </Card>
        <br />
      </div>
    );
  }

  return (
    <div className="pb-6 md:py-6 flex flex-col gap-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                App Settings
              </CardTitle>
              <CardDescription>
                Manage your saved preferences for {domains.length} application
                {domains.length !== 1 ? 's' : ''}.
              </CardDescription>
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear All
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Clear All App Settings</DialogTitle>
                  <DialogDescription>
                    This will remove all saved app settings for all websites.
                    You&apos;ll need to reconfigure your preferences when
                    visiting these sites again.
                  </DialogDescription>
                </DialogHeader>
                <br />
                <DialogFooter>
                  <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                  </DialogClose>
                  <Button onClick={handleClearAll}>Clear All Settings</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Domain</TableHead>
                <TableHead>Policies</TableHead>
                <TableHead>Last Visited</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {domains.map((domain) => {
                const domainSettings = settings[domain];
                if (!domainSettings) return null;

                return (
                  <TableRow key={domain}>
                    <TableCell className="font-medium">{domain}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {getPolicyBadges(domainSettings)}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatLastVisited(domainSettings.lastVisited)}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>
                              Clear Settings for {domain}
                            </DialogTitle>
                            <DialogDescription>
                              This will remove all saved settings for this
                              website. You&apos;ll need to reconfigure your
                              preferences when visiting this site again.
                            </DialogDescription>
                          </DialogHeader>
                          <br />
                          <DialogFooter>
                            <DialogClose asChild>
                              <Button variant="outline">Cancel</Button>
                            </DialogClose>
                            <Button onClick={() => handleClearDomain(domain)}>
                              Clear Settings
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      <br />
    </div>
  );
}
